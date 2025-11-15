import { PersonalMigraineProfile } from '../types';

export async function savePersonalMigraineProfile(
  payload: PersonalMigraineProfile
): Promise<void> {
  const response = await fetch('/api/user/personal-migraine-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to save personal migraine profile');
  }
}
