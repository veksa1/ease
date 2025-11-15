# Calendar Integration - Quick Start Guide

## Installation

### Backend Dependencies

```bash
cd ALINE
pip install httpx
# Or if using the project's package manager:
uv pip install httpx
```

### Frontend Dependencies

No new dependencies required - uses existing API client.

## Running the Backend

```bash
cd ALINE
python service/main.py
```

The service will:
- Create the SQLite database (`data/aline.db`) automatically
- Initialize the `user_calendar_connections` table
- Start API server on port 8000

## Running the Frontend

```bash
cd ..  # Back to project root
npm run dev
```

Navigate to Profile → Calendar integration to test the UI.

## Testing the Implementation

### 1. Run Backend Tests

```bash
cd ALINE
python tests/test_calendar_integration.py
```

This will test:
- ✅ URL validation
- ✅ URL normalization
- ✅ Database CRUD operations
- ✅ Calendar connection lifecycle

### 2. Test API Endpoints Manually

```bash
# Save calendar connection
curl -X POST http://localhost:8000/user/calendar \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "calendarUrl": "webcal://calendar.google.com/calendar/ical/test.ics"
  }'

# Get connection status
curl http://localhost:8000/user/calendar/demo-user

# Delete connection
curl -X DELETE http://localhost:8000/user/calendar/demo-user
```

### 3. Test Frontend Integration

1. Open the app in browser
2. Navigate to Profile screen
3. Click "Calendar integration"
4. Select a provider (e.g., "Google Calendar")
5. Paste a test ICS URL
6. Click "Test & Save"

Expected result: ✅ Success screen with connection confirmation

## Getting a Test ICS URL

### Google Calendar

1. Go to Google Calendar (calendar.google.com)
2. Settings → Settings
3. Select a calendar on the left
4. Scroll to "Integrate calendar"
5. Copy "Secret address in iCal format"

### Public Test Calendar

For quick testing, use any public .ics URL:
```
https://www.calendarlabs.com/ical-calendar/ics/76/US_Holidays.ics
```

## Configuration

### n8n Webhook URL

Set the n8n webhook URL via environment variable:

```bash
# Development
export N8N_WEBHOOK_URL=http://localhost:5678/webhook/aline-context

# Production
export N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook/aline-context
```

Or update `ALINE/configs/service.yaml`:

```yaml
n8n:
  webhook_url: https://your-n8n-instance.com/webhook/aline-context
```

## Features Implemented

✅ **Backend:**
- Calendar URL storage (SQLite)
- URL validation (format, reachability, ICS content)
- URL normalization (webcal → https)
- n8n webhook integration
- RESTful API endpoints

✅ **Frontend:**
- Provider selection (Google, Outlook, Apple, Other)
- Step-by-step instructions
- URL validation
- Connection status display
- Profile screen integration

## Common Issues & Solutions

### Issue: "httpx not found"
**Solution:**
```bash
cd ALINE
pip install httpx
```

### Issue: "Could not fetch calendar"
**Solutions:**
1. Check URL is publicly accessible
2. Verify URL ends with `.ics`
3. Check calendar sharing settings
4. Test URL in browser first

### Issue: "n8n webhook URL not configured"
**Solution:**
Set the `N8N_WEBHOOK_URL` environment variable or update `configs/service.yaml`

### Issue: Database errors
**Solution:**
Delete the database and let it recreate:
```bash
rm ALINE/data/aline.db
python service/main.py  # Will recreate
```

## Next Steps

1. **Set up n8n workflow** - See `docs/n8n_calendar_workflow.md`
2. **Test context generation** - Call `/aline/generate-context` endpoint
3. **Integrate with predictions** - Use posteriors in ALINE model
4. **Deploy to production** - Use PostgreSQL instead of SQLite

## File Structure

```
ALINE/
├── service/
│   ├── database.py          # ✨ New - DB layer
│   ├── calendar.py          # ✨ New - Calendar service
│   ├── main.py              # 📝 Updated - Added endpoints
│   └── schemas.py           # 📝 Updated - Added schemas
├── configs/
│   └── service.yaml         # 📝 Updated - Added n8n config
├── tests/
│   └── test_calendar_integration.py  # ✨ New - Tests
├── docs/
│   └── n8n_calendar_workflow.md      # ✨ New - n8n guide
└── tickets/
    └── 019_IMPLEMENTATION.md          # ✨ New - Full docs

src/
├── services/
│   └── calendarService.ts   # ✨ New - API client
├── components/
│   ├── CalendarIntegration.tsx  # ✨ New - Main UI
│   └── ProfileScreen.tsx    # 📝 Updated - Integration
```

## API Documentation

See `tickets/019_IMPLEMENTATION.md` for complete API documentation including:
- Request/response schemas
- Error codes and messages
- n8n integration contract
- Security considerations

---

**Status:** ✅ Ready for testing and deployment

All components of ticket 019 have been implemented. The system is ready for integration testing with n8n.
