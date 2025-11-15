# n8n Workflow for ALINE Calendar Context Generation

This document describes how to set up an n8n workflow to process calendar events and generate updated prior distributions for ALINE predictions.

## Workflow Overview

The workflow receives calendar URLs and prior distributions, analyzes upcoming events, and returns updated posteriors that reflect anticipated conditions.

## Workflow Structure

### 1. Webhook Trigger

**Node Type:** Webhook
**Method:** POST
**Path:** `/webhook/aline-context`

**Expected Input:**
```json
{
  "userId": "demo-user",
  "calendarUrl": "https://calendar.google.com/calendar/ical/.../basic.ics",
  "priors": {
    "stress_level": { "a": 3.0, "b": 2.0 },
    "noise_exposure": { "a": 2.0, "b": 3.0 },
    "sleep_quality": { "a": 5.0, "b": 2.0 }
  }
}
```

### 2. Fetch ICS Feed

**Node Type:** HTTP Request
**Method:** GET
**URL:** `{{ $json.calendarUrl }}`

**Settings:**
- Follow Redirects: Yes
- Timeout: 10 seconds
- Response Format: Text

**Output:** Raw ICS file content

### 3. Parse ICS Content

**Node Type:** Code (JavaScript)

```javascript
// Parse ICS and extract tomorrow's events
const icsContent = $input.item.json.data;

// Simple ICS parser for events
const events = [];
const lines = icsContent.split('\n');
let currentEvent = null;

for (let line of lines) {
  line = line.trim();
  
  if (line === 'BEGIN:VEVENT') {
    currentEvent = {};
  } else if (line === 'END:VEVENT' && currentEvent) {
    events.push(currentEvent);
    currentEvent = null;
  } else if (currentEvent) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':');
    
    if (key === 'SUMMARY') {
      currentEvent.summary = value;
    } else if (key.startsWith('DTSTART')) {
      currentEvent.start = value;
    } else if (key.startsWith('DTEND')) {
      currentEvent.end = value;
    } else if (key === 'LOCATION') {
      currentEvent.location = value;
    }
  }
}

// Filter for tomorrow's events
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0].replace(/-/g, '');

const tomorrowEvents = events.filter(event => {
  return event.start && event.start.includes(tomorrowStr);
});

return {
  json: {
    userId: $input.first().json.userId,
    priors: $input.first().json.priors,
    tomorrowEvents: tomorrowEvents,
    eventCount: tomorrowEvents.length
  }
};
```

### 4. Analyze Events with LLM

**Node Type:** OpenAI / Anthropic / Other LLM

**Prompt Template:**
```
You are analyzing a user's calendar to predict environmental and behavioral factors for migraine prediction.

Tomorrow's Calendar Events:
{{ $json.tomorrowEvents.map(e => `- ${e.summary} at ${e.start} (${e.location || 'No location'})`).join('\n') }}

Current Prior Distributions (Beta distribution parameters):
{{ JSON.stringify($json.priors, null, 2) }}

Based on these events, estimate how each factor might change tomorrow:
- stress_level: Higher for meetings, deadlines, presentations
- noise_exposure: Higher for social events, commutes, open offices
- sleep_quality: Lower if late events or early morning commitments
- exercise_duration: Consider if exercise/sports events scheduled
- screen_time: Higher for desk work, meetings

For each factor in the priors:
1. Assess if tomorrow's events will increase/decrease it
2. Adjust the Beta distribution parameters (a, b) accordingly
3. Explain your reasoning

Return ONLY valid JSON in this exact format:
{
  "posteriors": {
    "stress_level": { "a": 3.5, "b": 1.8 },
    "noise_exposure": { "a": 2.3, "b": 2.9 }
  },
  "reasoning": {
    "stress_level": "3 back-to-back meetings suggest higher stress",
    "noise_exposure": "Office environment increases noise slightly"
  }
}
```

**Settings:**
- Model: GPT-4 or Claude 3 Sonnet
- Temperature: 0.3 (for consistency)
- Max Tokens: 1000

### 5. Process LLM Response

**Node Type:** Code (JavaScript)

```javascript
// Parse LLM response and ensure proper format
const llmResponse = $input.first().json.message?.content || $input.first().json.output;
const userId = $input.first().json.userId;
const priors = $input.first().json.priors;

let analysis;
try {
  // Extract JSON from response (might be wrapped in markdown)
  const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    analysis = JSON.parse(jsonMatch[0]);
  } else {
    analysis = JSON.parse(llmResponse);
  }
} catch (e) {
  // Fallback: return priors unchanged
  analysis = {
    posteriors: priors,
    reasoning: { error: "Failed to parse LLM response" }
  };
}

// Ensure all prior features have posteriors
const posteriors = { ...priors };
Object.keys(analysis.posteriors || {}).forEach(key => {
  posteriors[key] = analysis.posteriors[key];
});

// Calculate feature details
const features = Object.keys(posteriors).map(featureName => {
  const prior = priors[featureName] || { a: 1, b: 1 };
  const posterior = posteriors[featureName];
  
  // Beta distribution mean = a / (a + b)
  const meanPrior = prior.a / (prior.a + prior.b);
  const meanPosterior = posterior.a / (posterior.a + posterior.b);
  
  return {
    feature: featureName,
    prior: prior,
    posterior: posterior,
    meanPrior: parseFloat(meanPrior.toFixed(4)),
    meanPosterior: parseFloat(meanPosterior.toFixed(4)),
    reasoning: analysis.reasoning?.[featureName] || "No reasoning provided"
  };
});

return {
  json: {
    userId: userId,
    posteriors: posteriors,
    features: features,
    timestamp: new Date().toISOString()
  }
};
```

### 6. Return Response

**Node Type:** Respond to Webhook

**Response:**
```json
{
  "userId": "{{ $json.userId }}",
  "posteriors": "{{ $json.posteriors }}",
  "features": "{{ $json.features }}",
  "timestamp": "{{ $json.timestamp }}"
}
```

## Workflow Configuration

### Environment Variables

Set these in n8n settings:

```bash
OPENAI_API_KEY=sk-...  # If using OpenAI
ANTHROPIC_API_KEY=...  # If using Claude
```

### Error Handling

Add error handling nodes:

1. **On HTTP Request Failure:**
   - Return priors unchanged
   - Log error for debugging

2. **On LLM Failure:**
   - Fallback to rule-based adjustments
   - Or return priors unchanged

3. **On Parse Failure:**
   - Return priors unchanged with error flag

## Testing the Workflow

### Test with curl:

```bash
curl -X POST https://your-n8n.com/webhook/aline-context \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "calendarUrl": "https://calendar.google.com/calendar/ical/.../basic.ics",
    "priors": {
      "stress_level": { "a": 3, "b": 2 },
      "noise_exposure": { "a": 2, "b": 3 }
    }
  }'
```

### Expected Response:

```json
{
  "userId": "test-user",
  "posteriors": {
    "stress_level": { "a": 3.8, "b": 1.9 },
    "noise_exposure": { "a": 2.4, "b": 2.8 }
  },
  "features": [
    {
      "feature": "stress_level",
      "prior": { "a": 3, "b": 2 },
      "posterior": { "a": 3.8, "b": 1.9 },
      "meanPrior": 0.6,
      "meanPosterior": 0.667,
      "reasoning": "Multiple meetings indicate higher stress"
    }
  ],
  "timestamp": "2025-11-15T12:00:00Z"
}
```

## Simple Rule-Based Alternative

If you don't want to use an LLM, implement simple rules:

```javascript
// Count events
const eventCount = $json.tomorrowEvents.length;
const priors = $json.priors;
const posteriors = {};

// Simple heuristics
Object.keys(priors).forEach(feature => {
  const prior = priors[feature];
  let posterior = { ...prior };
  
  if (feature === 'stress_level') {
    // More events = higher stress
    const stressIncrease = Math.min(eventCount * 0.2, 1.0);
    posterior.a = prior.a + stressIncrease;
    posterior.b = prior.b - stressIncrease * 0.5;
  }
  
  if (feature === 'noise_exposure') {
    // Social/meeting events increase noise
    const meetings = $json.tomorrowEvents.filter(e => 
      e.summary.toLowerCase().includes('meeting') ||
      e.summary.toLowerCase().includes('call')
    ).length;
    posterior.a = prior.a + meetings * 0.15;
  }
  
  posteriors[feature] = posterior;
});

return { json: { posteriors } };
```

## Deployment

### n8n Cloud
1. Create new workflow
2. Import nodes from above
3. Activate workflow
4. Copy webhook URL
5. Set in ALINE backend config

### Self-Hosted n8n
1. Deploy n8n via Docker:
   ```bash
   docker run -d \
     -p 5678:5678 \
     -e N8N_BASIC_AUTH_ACTIVE=true \
     -e N8N_BASIC_AUTH_USER=admin \
     -e N8N_BASIC_AUTH_PASSWORD=yourpassword \
     n8nio/n8n
   ```
2. Access at http://localhost:5678
3. Create workflow
4. Configure webhook URL in ALINE

## Security Notes

1. **Webhook Authentication:** Consider adding auth token to webhook
2. **Rate Limiting:** Add to prevent abuse
3. **URL Validation:** n8n inherits ALINE's validation
4. **LLM Costs:** Monitor API usage if using commercial LLMs

## Monitoring

Track these metrics:
- Webhook success rate
- ICS fetch success rate
- LLM response time
- Average posterior shift
- Error rates by failure type

## Future Enhancements

1. **Event Classification:** Train model to classify event types
2. **User History:** Learn from past events and outcomes
3. **Multi-Day Lookahead:** Analyze next 3-7 days
4. **Travel Detection:** Detect timezone changes
5. **Caching:** Cache ICS feeds to reduce fetches

---

This workflow provides the n8n integration needed for calendar-based context generation in ALINE.
