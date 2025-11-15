"""
Test script for Calendar Integration - Ticket 019

Tests the calendar service endpoints and validation logic.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from service.calendar import calendar_service
from service.database import db


async def test_url_validation():
    """Test URL format validation"""
    print("\n=== Testing URL Validation ===")
    
    test_cases = [
        ("https://calendar.google.com/calendar/ical/test.ics", True),
        ("webcal://calendar.google.com/calendar/ical/test.ics", True),
        ("http://example.com/calendar.ics", True),
        ("ftp://invalid.com/cal.ics", False),
        ("not-a-url", False),
        ("https://" + "x" * 600, False),  # Too long
    ]
    
    for url, should_pass in test_cases:
        is_valid, error = calendar_service.validate_url_format(url)
        status = "✅" if is_valid == should_pass else "❌"
        print(f"{status} {url[:50]}... → {is_valid} ({error or 'OK'})")


def test_url_normalization():
    """Test URL normalization"""
    print("\n=== Testing URL Normalization ===")
    
    test_cases = [
        ("webcal://example.com/cal.ics", "https://example.com/cal.ics"),
        ("https://example.com/cal.ics", "https://example.com/cal.ics"),
        ("http://example.com/cal.ics", "http://example.com/cal.ics"),
    ]
    
    for input_url, expected in test_cases:
        result = calendar_service.normalize_url(input_url)
        status = "✅" if result == expected else "❌"
        print(f"{status} {input_url} → {result}")


def test_database_operations():
    """Test database CRUD operations"""
    print("\n=== Testing Database Operations ===")
    
    test_user_id = "test-user-123"
    test_url = "webcal://example.com/test.ics"
    normalized = "https://example.com/test.ics"
    
    # Clean up any existing test data
    db.delete_calendar_connection(test_user_id)
    
    # Test create
    print("\n1. Creating connection...")
    connection = db.save_calendar_connection(test_user_id, test_url, normalized)
    print(f"✅ Created: {connection['id']}")
    
    # Test read
    print("\n2. Reading connection...")
    retrieved = db.get_calendar_connection(test_user_id)
    if retrieved and retrieved['calendarUrl'] == test_url:
        print(f"✅ Retrieved correctly")
    else:
        print(f"❌ Failed to retrieve")
    
    # Test update
    print("\n3. Updating connection...")
    new_url = "webcal://example.com/updated.ics"
    new_normalized = "https://example.com/updated.ics"
    updated = db.save_calendar_connection(test_user_id, new_url, new_normalized)
    retrieved = db.get_calendar_connection(test_user_id)
    if retrieved and retrieved['calendarUrl'] == new_url:
        print(f"✅ Updated correctly")
    else:
        print(f"❌ Failed to update")
    
    # Test verification timestamp
    print("\n4. Updating verification time...")
    db.update_verification_time(test_user_id)
    retrieved = db.get_calendar_connection(test_user_id)
    if retrieved and retrieved['lastVerifiedAt']:
        print(f"✅ Verification time updated: {retrieved['lastVerifiedAt']}")
    else:
        print(f"❌ Failed to update verification time")
    
    # Test delete
    print("\n5. Deleting connection...")
    deleted = db.delete_calendar_connection(test_user_id)
    if deleted:
        print(f"✅ Deleted successfully")
    else:
        print(f"❌ Failed to delete")
    
    # Verify deletion
    retrieved = db.get_calendar_connection(test_user_id)
    if retrieved is None:
        print(f"✅ Confirmed deleted")
    else:
        print(f"❌ Still exists after deletion")


async def test_ics_verification():
    """Test ICS feed verification (requires internet)"""
    print("\n=== Testing ICS Feed Verification ===")
    print("(Skipping - requires real ICS URLs)")
    
    # Example test with a public calendar
    # Uncomment if you have a test ICS URL
    """
    test_url = "https://calendar.google.com/calendar/ical/.../public/basic.ics"
    is_valid, error = await calendar_service.verify_ics_feed(test_url)
    status = "✅" if is_valid else "❌"
    print(f"{status} {test_url[:50]}... → {is_valid} ({error or 'OK'})")
    """


async def main():
    """Run all tests"""
    print("=" * 60)
    print("Calendar Integration Test Suite")
    print("=" * 60)
    
    test_url_validation()
    test_url_normalization()
    test_database_operations()
    await test_ics_verification()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
