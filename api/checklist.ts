import { generateChecklist } from '../server/generateChecklist';
import type { ChecklistContextPayload } from '../src/types/checklist';

type RequestLike = {
  method?: string;
  body?: ChecklistContextPayload | string;
  headers: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(payload: unknown): void;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const result = await generateChecklist(body as ChecklistContextPayload);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: 'Checklist generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
