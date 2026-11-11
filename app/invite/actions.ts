'use server';

import { saveInvitationRsvp } from './_lib/invitation';

export async function submitWeddingRsvpAction(input: {
  weddingId: string;
  guestToken: string;
  attendance: 'yes' | 'no';
  message?: string;
}) {
  // The given guest table has no RSVP message field; do not overwrite
  // personal_message (which is the admin-authored invitation message).
  try {
    return await saveInvitationRsvp(input);
  } catch (error) {
    console.error('RSVP action error', error);
    return { success: false, error: 'Could not save RSVP.' };
  }
}
