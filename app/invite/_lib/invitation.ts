import 'server-only';
import { createClient } from '@supabase/supabase-js';

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment configuration');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getInvitationByToken(token: string) {
  if (!token || token.length > 128) return null;
  const db = database();
  // A URL token resolves to the guest first; the guest identifies the wedding.
  const { data: guest, error: guestError } = await db
    .from('guests')
    .select('id, wedding_id, token, name, invited_events, allowed_guests, rsvp_status, personal_message')
    .eq('token', token)
    .maybeSingle();
  if (guestError || !guest) return null;

  const { data: wedding, error: weddingError } = await db
    .from('weddings')
    .select('*')
    .eq('id', guest.wedding_id)
    .maybeSingle();
  if (weddingError || !wedding) return null;

  // Restrict what crosses the Server/Client boundary.
  const fields = [
    'id', 'groom_name', 'bride_name', 'groom_image', 'bride_image',
    'groom_family_members',
    'mehndi_date', 'mehndi_time', 'mehndi_venue', 'mehndi_map_url',
    'nikkah_date', 'nikkah_time', 'nikkah_venue', 'nikkah_map_url',
    'barat_date', 'barat_time', 'barat_venue', 'barat_map_url',
    'walima_date', 'walima_time', 'walima_venue', 'walima_map_url',
  ];
  const safeWedding = Object.fromEntries(
    fields.map(field => [field, wedding[field] ?? null])
  );
  return { wedding: safeWedding, guest };
}

export async function saveInvitationRsvp(input: {
  weddingId: string;
  guestToken: string;
  attendance: 'yes' | 'no';
}) {
  if (!input.weddingId || !input.guestToken ||
      !['yes', 'no'].includes(input.attendance)) {
    return { success: false, error: 'Invalid RSVP.' };
  }
  const db = database();
  const { data: guest, error: lookupError } = await db
    .from('guests')
    .select('id')
    .eq('token', input.guestToken)
    .eq('wedding_id', input.weddingId)
    .maybeSingle();
  if (lookupError || !guest) {
    return { success: false, error: 'Invitation not found.' };
  }
  const { error } = await db.from('guests')
    .update({
      rsvp_status: input.attendance === 'yes' ? 'attending' : 'declined',
      rsvp_updated_at: new Date().toISOString(),
    })
    .eq('id', guest.id)
    .eq('wedding_id', input.weddingId);
  if (error) {
    console.error('RSVP failed', error);
    return { success: false, error: 'Could not save RSVP.' };
  }
  return { success: true };
}
