# Calendar Integration Implementation (Ticket 019)

## Overview

This implementation adds calendar integration support to the ALINE app, allowing users to connect any calendar provider (Google, Outlook, Apple, or custom ICS feeds) to improve prediction accuracy by providing "tomorrow's context."

## Architecture

### Backend (ALINE Service)

#### New Files Created

1. **`service/database.py`** - SQLite database layer for calendar connections
   - Manages `user_calendar_connections` table
   - CRUD operations for calendar URLs
   - Tracks verification timestamps

2. **`service/calendar.py`** - Calendar service logic
   - URL validation and normalization (webcal:// → https://)
   - ICS feed verification (checks for VCALENDAR/VEVENT)
   - n8n webhook integration for context generation

3. **Updated `service/main.py`** - New API endpoints:
   - `POST /user/calendar` - Save calendar connection
   - `GET /user/calendar/{user_id}` - Get connection status
   - `DELETE /user/calendar/{user_id}` - Remove connection
   - `POST /aline/generate-context` - Generate posteriors from calendar

4. **Updated `service/schemas.py`** - New Pydantic models:
   - `CalendarConnectionRequest/Response`
   - `CalendarStatusResponse`
   - `ContextGenerationRequest/Response`

#### Database Schema

```sql
CREATE TABLE user_calendar_connections (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    calendarUrl TEXT NOT NULL,
    normalizedUrl TEXT NOT NULL,
    lastVerifiedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(userId)
);
```

#### Configuration

Added to `configs/service.yaml`:
```yaml
n8n:
  webhook_url: ${N8N_WEBHOOK_URL:http://localhost:5678/webhook/aline-context}
```

Set via environment variable:
```bash
export N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/aline-context
```

### Frontend (React App)

#### New Files Created

1. **`src/services/calendarService.ts`** - API client for calendar endpoints
   - Calendar connection management
   - Provider-specific setup instructions
   - Context generation requests

2. **`src/components/CalendarIntegration.tsx`** - Main UI component
   - Provider selection screen
   - ICS URL entry with validation
   - Connection status display
   - Success confirmation

3. **Updated `src/components/ProfileScreen.tsx`**
   - Added calendar integration button in "Devices & data sources"
   - Modal overlay for calendar setup flow

## User Flow

### Step 1: Provider Selection

User sees options:
- Google Calendar
- Outlook / Office 365
- Apple iCloud Calendar
- Other (Manual ICS)

### Step 2: Get ICS URL

Provider-specific instructions guide the user to:
1. Navigate to their calendar settings
2. Find the sharing/export section
3. Copy the ICS/WebCal URL

### Step 3: Connect & Verify

1. User pastes URL
2. Frontend sends to backend
3. Backend validates:
   - URL format (http/https/webcal)
   - Reachability (2-second timeout)
   - Content (must contain VCALENDAR)
4. Saves normalized URL to database
5. Shows success confirmation

### Step 4: Context Generation

When predictions are needed:
1. Backend retrieves calendar URL
2. Sends to n8n webhook with priors
3. n8n analyzes calendar events
4. Returns updated posteriors
5. Feeds into ALINE model

## API Contracts

### Save Calendar Connection

**Request:**
```json
POST /user/calendar
{
  "userId": "demo-user",
  "calendarUrl": "webcal://calendar.google.com/calendar/ical/..."
}
```

**Response:**
```json
{
  "status": "ok",
  "userId": "demo-user",
  "lastVerifiedAt": "2025-11-15T12:34:56Z",
  "message": "Calendar connected successfully"
}
```

### Get Connection Status

**Request:**
```
GET /user/calendar/demo-user
```

**Response:**
```json
{
  "connected": true,
  "userId": "demo-user",
  "lastVerifiedAt": "2025-11-15T12:34:56Z"
}
```

### Generate Context

**Request:**
```json
POST /aline/generate-context
{
  "userId": "demo-user",
  "priors": {
    "noise_exposure": { "a": 2.0, "b": 3.0 },
    "stress_level": { "a": 3.0, "b": 2.0 }
  }
}
```

**Response:**
```json
{
  "userId": "demo-user",
  "posteriors": {
    "noise_exposure": { "a": 2.6, "b": 3.4 },
    "stress_level": { "a": 3.9, "b": 2.1 }
  },
  "features": [
    {
      "feature": "noise_exposure",
      "prior": { "a": 2.0, "b": 3.0 },
      "posterior": { "a": 2.6, "b": 3.4 },
      "meanPrior": 0.4,
      "meanPosterior": 0.433
    }
  ],
  "timestamp": "2025-11-15T12:35:00Z"
}
```

## n8n Workflow Integration

The backend expects an n8n workflow that:

### Input Contract
```json
{
  "userId": "string",
  "calendarUrl": "https://...",
  "priors": {
    "featureName": { "a": number, "b": number }
  }
}
```

### Output Contract
```json
{
  "posteriors": {
    "featureName": { "a": number, "b": number }
  },
  "features": [
    {
      "feature": "string",
      "prior": { "a": number, "b": number },
      "posterior": { "a": number, "b": number },
      "meanPrior": number,
      "meanPosterior": number
    }
  ]
}
```

### Example n8n Workflow

1. **Webhook Trigger** - Receives request
2. **HTTP Request** - Fetch ICS feed from calendarUrl
3. **Parse ICS** - Extract tomorrow's events
4. **LLM Analysis** - Analyze events for stress/noise/etc.
5. **Update Priors** - Adjust Beta distributions
6. **Respond** - Return posteriors

## Security Considerations

1. **URL Storage** - Calendar URLs contain secrets
   - Store encrypted in production
   - Never log URLs
   - Never display full URL after save

2. **Validation** - Multi-layer security
   - URL format validation
   - Reachability check (prevents SSRF)
   - Content-type verification
   - ICS format validation

3. **Rate Limiting** - Should add in production
   - Limit verification attempts
   - Prevent abuse of n8n webhook

## Testing

### Backend Testing

```bash
# Start the service
cd ALINE
python service/main.py

# Test endpoints
curl -X POST http://localhost:8000/user/calendar \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "calendarUrl": "webcal://p123-caldav.icloud.com/published/2/..."
  }'

curl http://localhost:8000/user/calendar/test-user
```

### Frontend Testing

```bash
# Build and run the app
npm run dev

# Navigate to Profile → Calendar integration
# Test with a real ICS URL
```

### Error Cases to Test

1. Invalid URL format → "Please provide a valid ICS/WebCal URL"
2. Unreachable URL → "Could not fetch your calendar..."
3. Not an ICS file → "This link does not contain valid calendar data"
4. n8n webhook down → "Context generation failed"

## Dependencies

### Backend
- `httpx>=0.27.0` - Async HTTP client for ICS verification
- `sqlite3` - Built-in (database)
- `pydantic` - Already installed (schemas)

### Frontend
- No new dependencies (uses existing apiClient)

## Future Enhancements

As documented in the spec, these are architected for future addition:

1. **Multiple Calendars** - Support >1 calendar per user
2. **Event Deduplication** - Detect overlapping events
3. **Travel Detection** - Timezone changes
4. **ICS Caching** - Reduce external requests
5. **Push Notifications** - "Tomorrow looks high risk"
6. **Refresh Schedule** - Auto-update daily at 2 AM

## Deployment Notes

### Environment Variables

```bash
# Production
export N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook/aline-context

# Development
export N8N_WEBHOOK_URL=http://localhost:5678/webhook/aline-context
```

### Database Migration

On first run, the database schema is auto-created. For production PostgreSQL:

1. Replace `sqlite3` with `psycopg2` or similar
2. Update `database.py` connection string
3. Run migrations manually if needed

## Files Modified/Created

### Backend
- ✅ Created: `ALINE/service/database.py`
- ✅ Created: `ALINE/service/calendar.py`
- ✅ Modified: `ALINE/service/main.py`
- ✅ Modified: `ALINE/service/schemas.py`
- ✅ Modified: `ALINE/configs/service.yaml`
- ✅ Modified: `ALINE/requirements.txt`

### Frontend
- ✅ Created: `src/services/calendarService.ts`
- ✅ Created: `src/components/CalendarIntegration.tsx`
- ✅ Modified: `src/components/ProfileScreen.tsx`

## Integration with Existing ALINE Flow

The calendar integration enhances the prediction pipeline:

```
User's Calendar → n8n Analysis → Updated Priors → ALINE Model → Better Predictions
```

Specifically:
1. Daily at 2 AM (or on-demand), system calls `/aline/generate-context`
2. Backend retrieves user's calendar URL
3. Sends to n8n with current priors
4. n8n fetches tomorrow's events, analyzes context
5. Returns updated posteriors (e.g., "busy day → higher stress")
6. These feed into the ALINE prediction model
7. User sees improved risk forecast

## Verification Checklist

- ✅ Database schema created and tested
- ✅ All API endpoints implemented
- ✅ ICS validation working (format, reachability, content)
- ✅ URL normalization (webcal → https)
- ✅ Frontend UI complete (select, connect, status)
- ✅ Provider instructions added
- ✅ Integration with ProfileScreen
- ✅ Error handling and user feedback
- ✅ Documentation complete

## Support for Calendar Providers

### Google Calendar
✅ ICS URL format supported
✅ Instructions provided

### Outlook/Office 365
✅ ICS URL format supported
✅ Instructions provided

### Apple iCloud
✅ ICS/WebCal format supported
✅ Instructions provided

### Other/Custom
✅ Any standard ICS URL accepted
✅ Generic instructions provided

---

**Implementation Status:** ✅ Complete

All features from ticket 019 have been implemented and are ready for testing.
