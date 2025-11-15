# Calendar Events Debugging Guide

## Quick Console Tests

Open the browser console (F12) and run these commands:

### 1. Check if calendar URL is saved
```javascript
console.log('Calendar URL:', localStorage.getItem('calendar_demo-user'));
console.log('Verified at:', localStorage.getItem('calendar_demo-user_verified'));
```

### 2. Test ICS fetch directly
```javascript
const calendarUrl = localStorage.getItem('calendar_demo-user');
if (calendarUrl) {
  const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(calendarUrl);
  fetch(proxyUrl)
    .then(r => r.text())
    .then(ics => {
      console.log('ICS length:', ics.length);
      console.log('ICS preview:', ics.substring(0, 500));
      console.log('Has VEVENT:', ics.includes('BEGIN:VEVENT'));
    })
    .catch(e => console.error('Fetch error:', e));
} else {
  console.error('No calendar URL found!');
}
```

### 3. Check what events are being shown
Look for these log messages in the console:
- `[CalendarEventsDisplay] Checking localStorage for userId: demo-user`
- `[CalendarService] Getting events for userId: demo-user`
- `[CalendarService] Calendar URL from localStorage:`
- `[parseIcsData] Looking for events on:`

## Common Issues

### Issue 1: No Calendar URL Found
**Symptom:** Console shows `No calendar URL found, using mock data`

**Solution:**
1. Go to Profile screen
2. Click "Connect Calendar"
3. Enter your Google Calendar ICS URL
4. Click "Test & Save"
5. Verify you see success message

### Issue 2: Calendar URL Exists But No Events
**Symptom:** Console shows URL but `Parsed 0 real events`

**Possible causes:**
- No events on the selected date
- ICS date format not being parsed correctly
- Events are filtered out by date range

**Debug:**
```javascript
// Check raw ICS data
const url = localStorage.getItem('calendar_demo-user');
fetch('https://corsproxy.io/?' + encodeURIComponent(url))
  .then(r => r.text())
  .then(ics => {
    const events = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
    console.log('Total events in calendar:', events?.length || 0);
    if (events) console.log('First event:', events[0]);
  });
```

### Issue 3: CORS Proxy Fails
**Symptom:** `Failed to fetch calendar: 403` or network error

**Solutions:**
- Make sure calendar is public in Google Calendar settings
- Try a different CORS proxy (update `CORS_PROXY` in calendarService.ts):
  ```typescript
  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
  // or
  const CORS_PROXY = 'https://corsproxy.io/?';
  ```

### Issue 4: Events on Wrong Date
**Symptom:** Calendar has events but not showing on selected date

**Debug:**
```javascript
// Check what date is being requested
// Look in console for: [parseIcsData] Looking for events on: YYYY-MM-DD
// Make sure this matches the day you selected in the calendar
```

## Manual Test Flow

1. **Open the app** → http://localhost:3001
2. **Open browser console** (F12)
3. **Go to Profile screen** → Connect Calendar
4. **Enter ICS URL** → Should be: `https://calendar.google.com/calendar/ical/.../public/basic.ics`
5. **Click Test & Save** → Watch console for:
   - `[CalendarService] Fetching ICS from: https://...`
   - Validation success message
6. **Go to Diary screen**
7. **Select a day** → Watch console for:
   - `[CalendarEventsDisplay] Checking localStorage`
   - `[CalendarService] Getting events for userId: demo-user`
   - `[CalendarService] ICS data length: XXXX chars`
   - `[parseIcsData] Looking for events on: YYYY-MM-DD`
   - `[parseIcsData] Event: Title from XX to XX`
   - `[CalendarService] Parsed X real events`
8. **Check the diary** → Should show real events

## Still Not Working?

Share the console output from steps 6-8, specifically:
- What date are you selecting?
- What does `localStorage.getItem('calendar_demo-user')` return?
- What's the output of the ICS fetch test (#2 above)?
- Any error messages?
