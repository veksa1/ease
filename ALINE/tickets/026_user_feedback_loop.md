# 🔄 Ticket 026 – User Feedback Loop for Model Adaptation

**Date:** 2025-11-16  
**Owner:** Full Stack  
**Status:** 🔧 To Do  
**Priority:** Medium  
**Effort:** Medium (1-2 days)

---

## 🎯 Objective

Enable users to confirm/correct migraine predictions, feeding back into personalized model updates. Close the loop: prediction → outcome → learning → better predictions.

---

## 📊 Background

**Current State:**
- Model makes predictions
- No mechanism to collect actual outcomes
- Model never improves from real user data
- Can't measure real-world accuracy

**Problem:**
- Predictions may be wrong but model never learns
- No personalization beyond initial training
- Users can't correct false positives/negatives

**Solution:**
- Collect daily migraine outcomes (Yes/No + severity)
- Update user-specific weights based on prediction errors
- Implement online learning (Bayesian updates)
- Show users how model improves over time

---

## 🧩 Tasks

### 1. Storage Strategy - SQLite ✅

**DECISION:** Use SQLite for feedback storage (matches existing architecture)

**Database Schema:**

```sql
CREATE TABLE user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feedback_date TEXT NOT NULL,  -- ISO 8601 date
    predicted_risk REAL NOT NULL,  -- What we predicted (0-1)
    actual_outcome TEXT NOT NULL,  -- 'migraine' or 'no_migraine'
    severity INTEGER,  -- 1-10 if migraine, NULL otherwise
    timestamp INTEGER NOT NULL,  -- Unix timestamp
    notes TEXT,
    UNIQUE(user_id, feedback_date)
);

CREATE INDEX idx_user_feedback ON user_feedback(user_id, feedback_date);
CREATE INDEX idx_timestamp ON user_feedback(timestamp);
```

**Benefits:**
- Same database as calendar connections
- Simple JSON export for ML retraining
- Can join with predictions for accuracy metrics
- No additional infrastructure

---

### 2. Design Feedback Data Schema

**File:** `service/database.py`

```python
import sqlite3
from datetime import datetime
from typing import Optional

class FeedbackDatabase:
    """Store user feedback on migraine predictions and outcomes."""
    
    def __init__(self, db_path="data/feedback.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.create_tables()
    
    def create_tables(self):
        """Initialize database schema."""
        cursor = self.conn.cursor()
        
        # Migraine outcomes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS migraine_outcomes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                date DATE NOT NULL,
                predicted_prob REAL,
                predicted_risk_level TEXT,  -- low/medium/high
                actual_outcome BOOLEAN NOT NULL,
                severity INTEGER,  -- 0-10 scale, NULL if no migraine
                user_corrected BOOLEAN DEFAULT 0,  -- Did user override prediction?
                feedback_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date)
            )
        """)
        
        # User embeddings table (for online learning)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_embeddings (
                user_id TEXT PRIMARY KEY,
                embedding_vector BLOB,  -- Serialized numpy array
                num_feedback_points INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                average_accuracy REAL  -- Rolling average of prediction accuracy
            )
        """)
        
        # Prediction history (for analytics)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                prediction_date DATE NOT NULL,
                prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                migraine_prob REAL,
                features_json TEXT,  -- JSON snapshot of input features
                model_version TEXT
            )
        """)
        
        self.conn.commit()
    
    def add_feedback(
        self, 
        user_id: str, 
        date: str, 
        had_migraine: bool,
        severity: Optional[int] = None,
        predicted_prob: Optional[float] = None
    ):
        """Record user feedback on migraine outcome."""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO migraine_outcomes 
            (user_id, date, actual_outcome, severity, predicted_prob, feedback_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, date, had_migraine, severity, predicted_prob, datetime.now()))
        
        self.conn.commit()
        
        # Update user embedding count
        cursor.execute("""
            INSERT INTO user_embeddings (user_id, num_feedback_points)
            VALUES (?, 1)
            ON CONFLICT(user_id) DO UPDATE SET
                num_feedback_points = num_feedback_points + 1,
                last_updated = CURRENT_TIMESTAMP
        """, (user_id,))
        
        self.conn.commit()
    
    def get_user_feedback_history(self, user_id: str, limit: int = 30):
        """Retrieve recent feedback for a user."""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT date, predicted_prob, actual_outcome, severity
            FROM migraine_outcomes
            WHERE user_id = ?
            ORDER BY date DESC
            LIMIT ?
        """, (user_id, limit))
        
        return cursor.fetchall()
    
    def get_user_accuracy(self, user_id: str, window_days: int = 30):
        """Calculate user's prediction accuracy over recent window."""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT 
                AVG(CASE 
                    WHEN (predicted_prob > 0.5 AND actual_outcome = 1) OR
                         (predicted_prob <= 0.5 AND actual_outcome = 0)
                    THEN 1.0 ELSE 0.0 
                END) as accuracy,
                COUNT(*) as num_predictions
            FROM migraine_outcomes
            WHERE user_id = ?
            AND date >= date('now', '-' || ? || ' days')
            AND predicted_prob IS NOT NULL
        """, (user_id, window_days))
        
        result = cursor.fetchone()
        return {
            'accuracy': result[0] if result[0] else 0.0,
            'num_predictions': result[1]
        }


# Singleton instance
feedback_db = FeedbackDatabase()
```

### 2. Create Personalization Module

**File:** `models/personalization.py`

```python
import torch
import numpy as np
from typing import Dict, List, Tuple

class BayesianUserUpdater:
    """
    Online Bayesian updating of user embeddings based on feedback.
    
    Uses gradient descent with prediction error to adjust user weights.
    """
    
    def __init__(self, model, learning_rate=0.01, regularization=0.1):
        self.model = model
        self.lr = learning_rate
        self.reg = regularization
    
    def update_user_embedding(
        self, 
        user_id: int,
        features: torch.Tensor,  # [T, F] - feature sequence
        predicted_prob: float,
        actual_outcome: bool
    ) -> torch.Tensor:
        """
        Update user embedding based on prediction error.
        
        Args:
            user_id: User index
            features: Input feature sequence
            predicted_prob: Model's prediction
            actual_outcome: True if migraine occurred
        
        Returns:
            Updated embedding vector
        """
        # Get current embedding
        current_embed = self.model.user_embedding.weight[user_id].detach().clone()
        current_embed.requires_grad = True
        
        # Forward pass with current embedding
        features = features.unsqueeze(0)  # [1, T, F]
        user_ids = torch.tensor([user_id])
        
        outputs = self.model(features, user_ids)
        pred_logit = outputs['migraine_logit']
        pred_prob = torch.sigmoid(pred_logit)
        
        # Compute loss (binary cross-entropy)
        target = torch.tensor([1.0 if actual_outcome else 0.0])
        loss = torch.nn.functional.binary_cross_entropy(pred_prob, target)
        
        # Add regularization (keep close to prior)
        reg_loss = self.reg * torch.norm(current_embed)
        total_loss = loss + reg_loss
        
        # Compute gradient
        total_loss.backward()
        
        # Update embedding
        with torch.no_grad():
            updated_embed = current_embed - self.lr * current_embed.grad
            self.model.user_embedding.weight[user_id] = updated_embed
        
        return updated_embed
    
    def batch_update(
        self, 
        user_id: int, 
        feedback_history: List[Tuple[np.ndarray, float, bool]]
    ):
        """
        Update user embedding based on multiple feedback points.
        
        Args:
            feedback_history: List of (features, predicted_prob, actual_outcome)
        """
        total_loss = 0.0
        
        for features, predicted_prob, actual_outcome in feedback_history:
            features_tensor = torch.tensor(features, dtype=torch.float32)
            updated_embed = self.update_user_embedding(
                user_id, features_tensor, predicted_prob, actual_outcome
            )
            total_loss += torch.nn.functional.binary_cross_entropy(
                torch.tensor([predicted_prob]),
                torch.tensor([1.0 if actual_outcome else 0.0])
            ).item()
        
        avg_loss = total_loss / len(feedback_history)
        return avg_loss


# Initialize updater
updater = BayesianUserUpdater(model=None)  # Set model after loading
```

### 3. Add Feedback Endpoints

**File:** `service/main.py`

```python
from service.database import feedback_db
from models.personalization import updater
from pydantic import BaseModel

class FeedbackRequest(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD
    had_migraine: bool
    severity: Optional[int] = None  # 0-10

class FeedbackResponse(BaseModel):
    success: bool
    message: str
    updated_accuracy: float
    num_feedback_points: int

@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Submit migraine outcome feedback.
    
    Request:
        {
            "user_id": "user123",
            "date": "2025-11-15",
            "had_migraine": true,
            "severity": 7
        }
    
    Response:
        {
            "success": true,
            "message": "Feedback recorded. Your model will improve!",
            "updated_accuracy": 0.78,
            "num_feedback_points": 15
        }
    """
    # Get prediction for that date (if exists)
    # Note: In production, query prediction_history table
    predicted_prob = None  # TODO: Retrieve from prediction_history
    
    # Store feedback
    feedback_db.add_feedback(
        user_id=request.user_id,
        date=request.date,
        had_migraine=request.had_migraine,
        severity=request.severity,
        predicted_prob=predicted_prob
    )
    
    # Get user's updated accuracy
    accuracy_stats = feedback_db.get_user_accuracy(request.user_id)
    
    # Trigger model update (if enough feedback points)
    if accuracy_stats['num_predictions'] >= 10:
        # Get recent feedback
        history = feedback_db.get_user_feedback_history(request.user_id, limit=30)
        
        # Update user embedding (async task in production)
        # For now, just log
        logger.info(f"User {request.user_id} has {accuracy_stats['num_predictions']} feedback points")
    
    return FeedbackResponse(
        success=True,
        message="Feedback recorded. Your model will improve with more data!",
        updated_accuracy=accuracy_stats['accuracy'],
        num_feedback_points=accuracy_stats['num_predictions']
    )


@app.get("/user/{user_id}/accuracy")
async def get_user_accuracy(user_id: str, window_days: int = 30):
    """
    Get user's prediction accuracy over recent window.
    
    Response:
        {
            "accuracy": 0.78,
            "num_predictions": 25,
            "window_days": 30,
            "confidence": "high"  # based on sample size
        }
    """
    stats = feedback_db.get_user_accuracy(user_id, window_days)
    
    # Determine confidence based on sample size
    if stats['num_predictions'] < 10:
        confidence = "low"
    elif stats['num_predictions'] < 30:
        confidence = "medium"
    else:
        confidence = "high"
    
    return {
        **stats,
        "window_days": window_days,
        "confidence": confidence
    }


@app.get("/user/{user_id}/feedback_history")
async def get_feedback_history(user_id: str, limit: int = 30):
    """
    Get user's feedback history with predictions vs. outcomes.
    
    Response:
        {
            "history": [
                {
                    "date": "2025-11-15",
                    "predicted_prob": 0.72,
                    "actual_outcome": true,
                    "severity": 7,
                    "correct": true
                },
                ...
            ]
        }
    """
    history = feedback_db.get_user_feedback_history(user_id, limit)
    
    formatted_history = []
    for date, predicted_prob, actual_outcome, severity in history:
        correct = None
        if predicted_prob is not None:
            correct = (predicted_prob > 0.5) == bool(actual_outcome)
        
        formatted_history.append({
            "date": date,
            "predicted_prob": predicted_prob,
            "actual_outcome": bool(actual_outcome),
            "severity": severity,
            "correct": correct
        })
    
    return {"history": formatted_history}
```

### 4. Add Frontend UI for Feedback

**File:** `docs/FEEDBACK_UI_SPEC.md`

```markdown
## Daily Check-In UI

### Morning Notification (9am)

```
Good morning! Did you experience a migraine yesterday?

[Yes 😞] [No 😊]

(If Yes) How severe was it?
[Slider: 1 (mild) ━━━━━ 10 (severe)]

[Submit]
```

### Feedback Confirmation

```
✓ Thanks for your feedback!

Your prediction accuracy: 78%
(Based on 15 check-ins)

Your model is learning from your patterns.
Keep logging for better predictions!

[View History]
```

### Accuracy Dashboard

```
📊 Your Prediction Accuracy

Last 30 days: 78% (25 predictions)
Last 7 days: 82% (7 predictions)

Trend: ↗️ Improving

Recent Predictions:
Nov 15: Predicted 72% → ✓ Migraine (severity 7)
Nov 14: Predicted 15% → ✓ No migraine
Nov 13: Predicted 68% → ✗ No migraine (false alarm)
Nov 12: Predicted 42% → ✗ Migraine (missed)

[See Full History]
```
```

### 5. Schedule Batch Updates

**File:** `service/scheduler.py`

```python
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=2)  # 2am daily
async def update_user_embeddings():
    """
    Nightly batch update of user embeddings based on feedback.
    """
    logger.info("Starting nightly user embedding updates...")
    
    # Get all users with new feedback
    cursor = feedback_db.conn.cursor()
    cursor.execute("""
        SELECT DISTINCT user_id
        FROM migraine_outcomes
        WHERE feedback_timestamp >= datetime('now', '-1 day')
    """)
    
    users_to_update = [row[0] for row in cursor.fetchall()]
    
    for user_id in users_to_update:
        # Get recent feedback
        history = feedback_db.get_user_feedback_history(user_id, limit=30)
        
        if len(history) >= 10:  # Minimum sample size
            # Update embedding
            user_idx = user_id_to_idx[user_id]
            # updater.batch_update(user_idx, history)
            logger.info(f"Updated embedding for {user_id}")
    
    logger.info(f"Updated {len(users_to_update)} user embeddings")


# Start scheduler
scheduler.start()
```

---

## ✅ Acceptance Criteria

- [ ] Database schema stores feedback (predictions + outcomes)
- [ ] `/feedback` endpoint accepts user submissions
- [ ] User embeddings update based on prediction errors
- [ ] `/user/{user_id}/accuracy` shows personalized accuracy metrics
- [ ] After 10+ feedback points, personalized model outperforms baseline by 10%+
- [ ] UI prompts users for daily check-ins
- [ ] Privacy preserved: feedback stored per user, not shared
- [ ] Batch updates run nightly without performance impact

---

## 📈 Expected Impact

- **Accuracy improvement**: +10-15% per-user AUC after 20+ feedback points
- **User engagement**: Daily check-in creates habit loop
- **Trust**: Showing accuracy builds confidence in predictions
- **Adaptation**: Model learns individual trigger patterns

**User Journey:**
1. Week 1: Baseline model, 65% accuracy
2. Week 2: 10 feedback points, 72% accuracy (+7%)
3. Week 4: 25 feedback points, 78% accuracy (+13%)
4. Week 8: Model fully personalized, 82% accuracy (+17%)

---

## 🔬 Validation Plan

**A/B Test:**
- Control group: No feedback loop (static model)
- Test group: Feedback loop with embedding updates

**Metrics:**
- Prediction accuracy over time
- User engagement (% completing daily check-ins)
- Time to 80% accuracy threshold

**Expected Results:**
- Test group reaches 80% accuracy 2x faster
- 50%+ users complete daily check-ins (with push notifications)

---

## 🔗 Related Tickets

- #021: Per-user weights (feedback updates these weights)
- #022: Information gain (feedback validates if queries helped)
- #025: Feature expansion (more features = better feedback signal)

---

## 📚 References

- Online learning algorithms (SGD, Bayesian updating)
- Active learning with human feedback
- Prediction accuracy metrics (calibration, Brier score)
- User engagement patterns for health apps
