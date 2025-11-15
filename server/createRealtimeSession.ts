interface RealtimeSessionSuccess {
  status: number;
  body: Record<string, unknown>;
}

export async function createRealtimeSession(): Promise<RealtimeSessionSuccess> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      status: 500,
      body: { message: 'OPENAI_API_KEY is not configured on the server.' },
    };
  }

  const model =
    process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview';
  const voice = process.env.OPENAI_REALTIME_VOICE ?? 'alloy';

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return {
        status: response.status,
        body: {
          message: 'Failed to create OpenAI realtime session',
          details: payload,
        },
      };
    }

    return {
      status: 200,
      body: {
        id: payload.id,
        clientSecret: payload.client_secret?.value,
        expiresAt: payload.client_secret?.expires_at ?? payload.expires_at,
        model: payload.model,
        voice: payload.voice ?? voice,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return {
      status: 500,
      body: { message: 'Unable to reach OpenAI realtime API', details: message },
    };
  }
}
