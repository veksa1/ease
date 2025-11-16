import type { ChecklistApiResponse, ChecklistContextPayload, ChecklistLLMResponse } from '../types/checklist';

class ChecklistService {
  async generateChecklist(payload: ChecklistContextPayload, signal?: AbortSignal): Promise<ChecklistLLMResponse> {
    const response = await fetch('/api/checklist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    let data: ChecklistApiResponse | { message?: string; details?: unknown } | undefined;

    try {
      data = await response.json();
    } catch (error) {
      // no-op; handled below
    }

    if (!response.ok || !data || !('checklist' in data)) {
      const message = (data as any)?.message ?? 'Failed to generate prevention checklist';
      throw new Error(message);
    }

    return (data as ChecklistApiResponse).checklist;
  }
}

export const checklistService = new ChecklistService();
