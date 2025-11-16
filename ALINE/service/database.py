"""
Database Layer - Ticket 019

Manages user calendar connections and persistence.
Uses SQLite for local development (can be swapped for PostgreSQL in production).

Author: ALINE Team
Date: 2025-11-15
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict
import uuid
import logging

logger = logging.getLogger(__name__)


class Database:
    """Simple SQLite database for calendar connections"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = str(Path(__file__).parent.parent / 'data' / 'aline.db')
        
        self.db_path = db_path
        self._ensure_db_directory()
        self._init_schema()
    
    def _ensure_db_directory(self):
        """Ensure the database directory exists"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
    
    def _init_schema(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Calendar connections table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_calendar_connections (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    calendarUrl TEXT NOT NULL,
                    normalizedUrl TEXT NOT NULL,
                    lastVerifiedAt TEXT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    UNIQUE(userId)
                )
            """)
            
            # Feedback tables (Ticket 026)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    feedback_date TEXT NOT NULL,
                    predicted_risk REAL,
                    actual_outcome INTEGER NOT NULL,
                    severity INTEGER,
                    timestamp INTEGER NOT NULL,
                    notes TEXT,
                    UNIQUE(user_id, feedback_date)
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_feedback 
                ON user_feedback(user_id, feedback_date)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON user_feedback(timestamp)
            """)
            
            conn.commit()
            logger.info("Database schema initialized")
    
    def save_calendar_connection(
        self, 
        user_id: str, 
        calendar_url: str,
        normalized_url: str
    ) -> Dict:
        """
        Save or update a calendar connection for a user
        
        Args:
            user_id: User identifier
            calendar_url: Original ICS/WebCal URL
            normalized_url: Normalized HTTPS URL
            
        Returns:
            Dict with connection details
        """
        now = datetime.utcnow().isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            # Check if connection exists
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM user_calendar_connections WHERE userId = ?",
                (user_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update existing
                conn.execute("""
                    UPDATE user_calendar_connections
                    SET calendarUrl = ?, normalizedUrl = ?, updatedAt = ?
                    WHERE userId = ?
                """, (calendar_url, normalized_url, now, user_id))
                connection_id = existing[0]
            else:
                # Insert new
                connection_id = str(uuid.uuid4())
                conn.execute("""
                    INSERT INTO user_calendar_connections
                    (id, userId, calendarUrl, normalizedUrl, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (connection_id, user_id, calendar_url, normalized_url, now, now))
            
            conn.commit()
            
        logger.info(f"Saved calendar connection for user {user_id}")
        
        return {
            'id': connection_id,
            'userId': user_id,
            'calendarUrl': calendar_url,
            'normalizedUrl': normalized_url,
            'updatedAt': now
        }
    
    def get_calendar_connection(self, user_id: str) -> Optional[Dict]:
        """
        Get calendar connection for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            Connection dict or None if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, userId, calendarUrl, normalizedUrl, 
                       lastVerifiedAt, createdAt, updatedAt
                FROM user_calendar_connections
                WHERE userId = ?
            """, (user_id,))
            row = cursor.fetchone()
            
            if row:
                return dict(row)
            return None
    
    def update_verification_time(self, user_id: str) -> None:
        """
        Update last verification timestamp
        
        Args:
            user_id: User identifier
        """
        now = datetime.utcnow().isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE user_calendar_connections
                SET lastVerifiedAt = ?, updatedAt = ?
                WHERE userId = ?
            """, (now, now, user_id))
            conn.commit()
        
        logger.info(f"Updated verification time for user {user_id}")
    
    def delete_calendar_connection(self, user_id: str) -> bool:
        """
        Delete calendar connection for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            True if deleted, False if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM user_calendar_connections
                WHERE userId = ?
            """, (user_id,))
            conn.commit()
            
            deleted = cursor.rowcount > 0
            
        if deleted:
            logger.info(f"Deleted calendar connection for user {user_id}")
        
        return deleted
    
    # ========================================================================
    # FEEDBACK METHODS (Ticket 026)
    # ========================================================================
    
    def add_feedback(
        self,
        user_id: str,
        date: str,
        had_migraine: bool,
        severity: Optional[int] = None,
        predicted_prob: Optional[float] = None,
        notes: Optional[str] = None
    ) -> int:
        """
        Record user feedback on migraine outcome.
        
        Args:
            user_id: User identifier
            date: Date in ISO format (YYYY-MM-DD)
            had_migraine: Whether migraine occurred
            severity: Migraine severity (1-10) if migraine occurred
            predicted_prob: Previously predicted probability
            notes: Optional user notes
            
        Returns:
            Feedback record ID
        """
        timestamp = int(datetime.utcnow().timestamp())
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO user_feedback
                (user_id, feedback_date, actual_outcome, severity, predicted_risk, timestamp, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, date, int(had_migraine), severity, predicted_prob, timestamp, notes))
            conn.commit()
            feedback_id = cursor.lastrowid
        
        logger.info(f"Added feedback for user {user_id} on {date}: migraine={had_migraine}")
        return feedback_id
    
    def get_user_feedback_history(
        self,
        user_id: str,
        limit: int = 30
    ) -> list:
        """
        Retrieve recent feedback for a user.
        
        Args:
            user_id: User identifier
            limit: Maximum number of records to return
            
        Returns:
            List of feedback records
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT feedback_date, predicted_risk, actual_outcome, severity, notes, timestamp
                FROM user_feedback
                WHERE user_id = ?
                ORDER BY feedback_date DESC
                LIMIT ?
            """, (user_id, limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_user_accuracy(
        self,
        user_id: str,
        window_days: int = 30
    ) -> Dict:
        """
        Calculate user's prediction accuracy over recent window.
        
        Args:
            user_id: User identifier
            window_days: Number of days to look back
            
        Returns:
            Dict with 'accuracy' and 'num_predictions'
        """
        cutoff_timestamp = int((datetime.utcnow().timestamp() - window_days * 86400))
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    AVG(CASE 
                        WHEN (predicted_risk > 0.5 AND actual_outcome = 1) OR
                             (predicted_risk <= 0.5 AND actual_outcome = 0)
                        THEN 1.0 ELSE 0.0 
                    END) as accuracy,
                    COUNT(*) as num_predictions
                FROM user_feedback
                WHERE user_id = ?
                AND timestamp >= ?
                AND predicted_risk IS NOT NULL
            """, (user_id, cutoff_timestamp))
            
            result = cursor.fetchone()
            
            return {
                'accuracy': result[0] if result[0] else 0.0,
                'num_predictions': result[1] if result else 0
            }


# Global database instance
db = Database()
