import type { ChecklistContextPayload, ChecklistLLMResponse } from '../src/types/checklist';

interface ChecklistServerResponse {
  status: number;
  body: { checklist?: ChecklistLLMResponse; message?: string; details?: unknown };
}

const checklistSchema = {
  name: 'ChecklistLLMResponse',
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      riskNarrative: { type: 'string' },
      topTriggers: { type: 'array', items: { type: 'string' } },
      checklist: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            durationMinutes: { type: 'number' },
            category: { type: 'string' },
            timing: { type: 'string' },
            effort: { type: 'string' },
          },
          required: ['id', 'title', 'description', 'durationMinutes', 'category', 'timing', 'effort'],
          additionalProperties: false,
        },
      },
      explainers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            detail: { type: 'string' },
          },
          required: ['title', 'detail'],
          additionalProperties: false,
        },
      },
      calendarAdvisories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            eventTitle: { type: 'string' },
            recommendation: { type: 'string' },
          },
          required: ['eventTitle', 'recommendation'],
          additionalProperties: false,
        },
      },
      followUp: {
        type: 'object',
        properties: {
          reminderInMinutes: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['reminderInMinutes', 'note'],
        additionalProperties: false,
      },
      infoGainSuggestions: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['summary', 'riskNarrative', 'topTriggers', 'checklist', 'explainers', 'calendarAdvisories', 'infoGainSuggestions'],
    additionalProperties: false,
  },
};

export async function generateChecklist(payload: ChecklistContextPayload): Promise<ChecklistServerResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[Checklist] OPENAI_API_KEY missing, using mock response');
    return {
      status: 200,
      body: { checklist: buildMockChecklist(payload) },
    };
  }

  try {
    const model = process.env.OPENAI_CHECKLIST_MODEL ?? 'gpt-4o-mini';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        response_format: {
          type: 'json_schema',
          json_schema: checklistSchema,
        },
        messages: [
          {
            role: 'system',
            content:
              'You are a migraine prevention strategist. Blend biometric data, schedule stressors, prior interventions, and Quick Check context to craft a prioritized prevention checklist. Keep tone calm, avoid medical claims, and keep each step actionable.',
          },
          {
            role: 'user',
            content: `Checklist context JSON:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Checklist] OpenAI call failed, falling back to mock', data);
      return {
        status: 200,
        body: { checklist: buildMockChecklist(payload) },
      };
    }

    const content = data?.choices?.[0]?.message?.content;
    const parsed: ChecklistLLMResponse = typeof content === 'string' ? JSON.parse(content) : JSON.parse(content?.[0]?.text ?? '{}');

    return {
      status: 200,
      body: { checklist: parsed },
    };
  } catch (error) {
    console.error('[Checklist] Exception calling OpenAI, using mock data', error);
    return {
      status: 200,
      body: { checklist: buildMockChecklist(payload) },
    };
  }
}

function buildMockChecklist(payload: ChecklistContextPayload): ChecklistLLMResponse {
  const calendarEvents = payload.environment?.calendar?.events ?? [];
  const riskSummary = payload.alineRisk.currentRiskPercent > 65
    ? 'Elevated risk due to weather pressure swings and recent prodrome notes.'
    : 'Moderate risk window; stay ahead with hydration and breaks.';

  return {
    summary: 'Centered plan to stabilize pressure, prevent caffeine swings, and preserve recovery time.',
    riskNarrative: riskSummary,
    topTriggers: payload.suspectedTriggers.slice(0, 3).map(t => t.label || t.key) || ['Weather pressure drop', 'Poor sleep'],
    checklist: [
      {
        id: 'hydrate-now',
        title: 'Drink 16oz of water now',
        description: 'Balances hydration index and offsets caffeine load.',
        durationMinutes: 2,
        category: 'immediate',
        timing: 'now',
        effort: 'low',
      },
      {
        id: 'cold-compress',
        title: 'Apply cold compress for 10 minutes',
        description: 'Down-regulates pressure sensations reported earlier today.',
        durationMinutes: 10,
        category: 'self-care',
        timing: 'next-hour',
        effort: 'medium',
      },
      {
        id: 'controlled-env',
        title: 'Stay in a controlled environment until pressure stabilizes',
        description: 'Reduces exposure to humidity/pressure swings noted in weather feed.',
        durationMinutes: 20,
        category: 'environment',
        timing: 'next-hour',
        effort: 'low',
      },
    ],
    explainers: [
      {
        title: 'Hydration offsets caffeine load',
        detail: 'Quick Checks show moderate caffeine and low water intake. Rapid hydration helps stabilize blood volume before pressure drops.',
      },
      {
        title: 'Cold compress calms prodrome cues',
        detail: 'You logged prodrome sensations; cooling therapies consistently reduce your severity in past reports.',
      },
    ],
    calendarAdvisories: calendarEvents.slice(0, 2).map(event => ({
      eventTitle: event.title || 'Calendar block',
      recommendation: 'Add a 5-min decompression buffer right after this event.',
    })),
    followUp: {
      reminderInMinutes: 90,
      note: 'Log how you feel so the model learns faster.',
    },
    infoGainSuggestions: payload.alineRisk.infoGainSuggestions.slice(0, 4),
  };
}
