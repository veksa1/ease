"""
Calendar Service - Ticket 019

Handles ICS/WebCal URL validation, normalization, and n8n integration.

Author: ALINE Team
Date: 2025-11-15
"""

import re
import logging
from typing import Dict, Optional, Tuple
import httpx
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class CalendarService:
    """Service for calendar integration operations"""
    
    # Timeout for ICS feed validation (seconds)
    VALIDATION_TIMEOUT = 2.0
    
    # Valid URL schemes
    VALID_SCHEMES = ['http', 'https', 'webcal']
    
    # Expected content types for ICS feeds
    VALID_CONTENT_TYPES = [
        'text/calendar',
        'application/octet-stream',
        'text/plain',
        'application/ics'
    ]
    
    def normalize_url(self, url: str) -> str:
        """
        Normalize WebCal URLs to HTTPS for HTTP requests
        
        Args:
            url: Original URL (may start with webcal://)
            
        Returns:
            Normalized HTTPS URL
        """
        if url.startswith('webcal://'):
            return url.replace('webcal://', 'https://', 1)
        return url
    
    def validate_url_format(self, url: str) -> Tuple[bool, Optional[str]]:
        """
        Validate URL format
        
        Args:
            url: URL to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check length
        if len(url) > 512:
            return False, "URL exceeds maximum length (512 characters)"
        
        # Parse URL
        try:
            parsed = urlparse(url)
        except Exception:
            return False, "Invalid URL format"
        
        # Check scheme
        if parsed.scheme not in self.VALID_SCHEMES:
            return False, f"URL must start with http://, https://, or webcal://"
        
        # Check if hostname exists
        if not parsed.netloc:
            return False, "URL must include a hostname"
        
        return True, None
    
    async def verify_ics_feed(self, url: str) -> Tuple[bool, Optional[str]]:
        """
        Verify that the URL points to a valid ICS feed
        
        Args:
            url: URL to verify (should be normalized)
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            async with httpx.AsyncClient(timeout=self.VALIDATION_TIMEOUT) as client:
                response = await client.get(url, follow_redirects=True)
                
                # Check status code
                if response.status_code != 200:
                    return False, f"Could not fetch calendar (HTTP {response.status_code})"
                
                # Check content type
                content_type = response.headers.get('content-type', '').lower()
                is_valid_content_type = any(
                    valid_type in content_type 
                    for valid_type in self.VALID_CONTENT_TYPES
                )
                
                # Check body contains ICS markers
                body = response.text[:1000]  # Check first 1KB
                has_vcalendar = 'BEGIN:VCALENDAR' in body
                has_vevent = 'BEGIN:VEVENT' in body
                
                if not has_vcalendar:
                    return False, "This link does not contain valid calendar data (missing VCALENDAR)"
                
                logger.info(f"Successfully verified ICS feed: {url[:50]}...")
                return True, None
                
        except httpx.TimeoutException:
            return False, "Could not fetch your calendar (timeout). Verify sharing settings."
        except httpx.ConnectError:
            return False, "Could not fetch your calendar. Verify the URL and sharing settings."
        except Exception as e:
            logger.error(f"Error verifying ICS feed: {e}")
            return False, "Could not verify calendar feed"
    
    async def validate_and_normalize(self, url: str) -> Dict:
        """
        Complete validation and normalization pipeline
        
        Args:
            url: Original calendar URL
            
        Returns:
            Dict with:
                - valid: bool
                - error: Optional[str]
                - normalizedUrl: Optional[str]
        """
        # Step 1: Format validation
        is_valid, error = self.validate_url_format(url)
        if not is_valid:
            return {'valid': False, 'error': error}
        
        # Step 2: Normalize
        normalized_url = self.normalize_url(url)
        
        # Step 3: Verify ICS feed
        is_valid, error = await self.verify_ics_feed(normalized_url)
        if not is_valid:
            return {'valid': False, 'error': error}
        
        return {
            'valid': True,
            'error': None,
            'normalizedUrl': normalized_url
        }
    
    async def generate_context_with_calendar(
        self,
        user_id: str,
        calendar_url: str,
        priors: Dict[str, Dict[str, float]],
        n8n_webhook_url: str
    ) -> Dict:
        """
        Send calendar URL and priors to n8n workflow
        
        Args:
            user_id: User identifier
            calendar_url: Normalized calendar URL
            priors: Prior distributions for features
            n8n_webhook_url: n8n webhook endpoint
            
        Returns:
            Dict with posteriors and features from n8n
        """
        payload = {
            'userId': user_id,
            'calendarUrl': calendar_url,
            'priors': priors
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(n8n_webhook_url, json=payload)
                
                if response.status_code != 200:
                    logger.error(f"n8n webhook failed: {response.status_code}")
                    raise Exception(f"Context generation failed (HTTP {response.status_code})")
                
                result = response.json()
                logger.info(f"Generated context for user {user_id}")
                return result
                
        except httpx.TimeoutException:
            logger.error("n8n webhook timeout")
            raise Exception("Context generation timed out")
        except Exception as e:
            logger.error(f"Error calling n8n webhook: {e}")
            raise


# Global service instance
calendar_service = CalendarService()
