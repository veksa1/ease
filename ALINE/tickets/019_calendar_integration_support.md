
# 📘 **ALINE App – Calendar Integration Specification (ICS/WebCal)**

**Version:** 1.0
**Purpose:** Provide “tomorrow’s context” to ALINE by integrating any calendar source through an ICS/WebCal URL.

---

# 1. 🎯 **Goal**

Users can connect **ANY calendar provider** (Google, Outlook, Apple, CalDAV, custom ICS) to the ALINE app, which then:

* Reads the user’s ICS feed URL (provided by user)
* Stores the URL in ALINE backend
* Passes the URL to the **n8n posterior-generation workflow**
* Receives and displays next-day migraine risk context

This avoids OAuth complexity and supports universal calendar formats.

---

# 2. 🧭 **User Flow**

### **Step 1 — User selects calendar type**

UI shows a list:

* Google Calendar
* Outlook / Office365
* Apple iCloud Calendar
* Other (Manual ICS link)

### **Step 2 — App displays instructions depending on type**

Each provider has instructions for obtaining ICS/WebCal URLs.

Examples:

#### **Google Calendar (public secret iCal URL)**

`Settings → Integrate calendar → Secret address in iCal format → Copy URL`

#### **Outlook / Office 365**

`Settings → Shared calendars → Publish calendar → ICS link → Copy`

#### **Apple iCloud Calendar**

`Calendar App → Right-click calendar → Share → Public → Copy link`

#### **Manual ICS**

User pastes any `.ics` or `webcal://` URL.

### **Step 3 — User pastes the ICS/WebCal URL**

App validates the URL format.

### **Step 4 — App sends URL to ALINE backend**

Backend persists:

* userId
* calendarUrl (as provided)
* lastVerifiedAt timestamp

### **Step 5 — Backend triggers n8n workflow**

Whenever predictions for “tomorrow” are needed.

---

# 3. 📡 **Backend API Specification**

### **3.1 POST /user/calendar**

Stores user’s calendar URL.

**Request**

```json
{
  "userId": "user-123",
  "calendarUrl": "webcal://example.com/mycalendar.ics"
}
```

**Response**

```json
{ "status": "ok" }
```

**Validation rules**

* Accept URLs beginning with:

  * `webcal://`
  * `http://`
  * `https://`
* Must end with `.ics` **OR** contain ICS content when fetched
* Max length: 512 chars

---

### **3.2 POST /aline/generate-context (server → n8n)**

**Backend calls this when generating tomorrow’s context.**

**Body**

```json
{
  "userId": "user-123",
  "calendarUrl": "webcal://calendar.url/...",
  "priors": {
    "noise_exposure": { "a": 2, "b": 3 },
    "stress_level": { "a": 3, "b": 2 }
  }
}
```

**n8n returns:**

```json
{
  "posteriors": {
    "noise_exposure": { "a": 2.6, "b": 3.4 },
    "stress_level": { "a": 3.9, "b": 2.1 }
  },
  "features": [
    {
      "feature": "noise_exposure",
      "prior": { "a": 2, "b": 3 },
      "posterior": { "a": 2.6, "b": 3.4 },
      "meanPrior": 0.4,
      "meanPosterior": 0.433
    }
  ]
}
```

This is then injected into the ALINE prediction pipeline.

---

# 4. 🗃️ **Data Model**

### **Database table: `user_calendar_connections`**

| Field          | Type      | Description                        |
| -------------- | --------- | ---------------------------------- |
| id             | UUID      | Primary key                        |
| userId         | UUID      | Foreign key to users table         |
| calendarUrl    | TEXT      | Provided ICS/WebCal URL            |
| normalizedUrl  | TEXT      | Converted `webcal://` → `https://` |
| lastVerifiedAt | TIMESTAMP | Last successful fetch              |
| createdAt      | TIMESTAMP |                                    |
| updatedAt      | TIMESTAMP |                                    |

### **Normalization rule**

Backend must convert:

```
webcal://something
```

→

```
https://something
```

This is required because n8n only fetches HTTP(S).

---

# 5. 🧪 **Validation Requirements**

### 5.1 ICS Feed Reachability Test

Backend attempts a 2-second HTTP GET:

* If status 200 → valid
* If content-type contains:

  * `text/calendar`
  * `application/octet-stream`
  * `text/plain`
* If body contains:

  * `BEGIN:VCALENDAR`
  * `BEGIN:VEVENT`

### 5.2 Error messages

* **Invalid URL format** → “Please provide a valid ICS/WebCal URL”
* **Unreachable** → “Could not fetch your calendar. Verify sharing settings.”
* **Not an ICS file** → “This link does not contain valid calendar data”

---

# 6. 🔒 **Security Considerations**

* No OAuth needed → safer and simpler
* But ICS URLs contain embedded secrets
  → **Store encrypted** using app’s secrets mechanism
* App **never displays the full URL again** once saved
* Never log the calendar URL

---

# 7. 📱 UI Requirements

### 7.1 Calendar Selection Screen

Buttons:

* "Google Calendar"
* "Outlook / Office 365"
* "Apple Calendar (iCloud)"
* "Other"

### 7.2 ICS Entry Screen (all types)

Fields:

* Text input (URL)
* “Test & Save” button

### 7.3 Green checkmark if connection succeeds:

* “Calendar connected”
* Show last sync time (from backend)

---

# 8. 🔄 Sync & Refresh Strategy

### App should:

* Trigger context generation once per day (at 02:00 server time)
  OR whenever user requests “Update Tomorrow’s Forecast”
* Backend sends n8n the ICS URL + priors
* n8n returns posteriors
* Backend stores updated posteriors & forwards to ALINE model

---

# 9. 🔌 Integration with n8n Workflow

### n8n input contract (must match exactly):

```json
{
  "userId": "string",
  "calendarUrl": "string",
  "priors": {
    "featureName": { "a": number, "b": number }
  }
}
```

### n8n output contract:

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

This structure feeds directly into the **ALINE prediction engine**.

---

# 10. 🔧 Future Extensions (Optional)

The app should be architected with these future upgrades in mind:

* Support for multiple calendars per user
* Detect overlapping events
* Detect travel (timezone changes)
* ICS caching
* Push notifications when tomorrow looks “high risk”

---

