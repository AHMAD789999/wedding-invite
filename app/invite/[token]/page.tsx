// app/invite/[token]/page.tsx
// Same Supabase query pattern as the existing WeddingLandingPage route.
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BloomInvitation from '../BloomInvitation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

interface FamilyMemberRow {
  id: string;
  name: string;
  profile_image?: string | null;
  role?: string | null;
  created_at?: string | null;
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length > 128) notFound();

  const supabase = await createClient();

  // IMPORTANT: Keep the original guest -> wedding joined query.
  const { data: guest, error } = await supabase
    .from('guests')
    .select(`
      id,
      name,
      title_prefix,
      allowed_guests,
      invited_events,
      personal_message,
      token,
      rsvp_status,
      rsvp_updated_at,
      wedding:weddings (
        id,
        groom_name,
        bride_name,
        groom_image,
        bride_image,
        groom_family_members,
        mehndi_date,
        mehndi_time,
        mehndi_venue,
        mehndi_map_url,
        barat_date,
        barat_time,
        barat_venue,
        barat_map_url,
        walima_date,
        walima_time,
        walima_venue,
        walima_map_url,
        contact_person_1,
        contact_number_1,
        contact_person_2,
        contact_number_2
      )
    `)
    .eq('token', token)
    .single();

  if (error || !guest) notFound();

  // Runtime shape from your original joined query (one wedding per guest).
  const weddingValue = guest.wedding as unknown;
  const wedding = Array.isArray(weddingValue) ? weddingValue[0] : weddingValue;
  if (!wedding || typeof wedding !== 'object' || !('id' in wedding)) {
    notFound();
  }
  const weddingId = (wedding as { id: string }).id;

  let familyMembers: FamilyMemberRow[] = [];
  const { data: familyData, error: familyError } = await supabase
    .from('family_members')
    .select('id, name, profile_image, role, created_at')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: true });

  if (!familyError && familyData) {
    familyMembers = familyData as FamilyMemberRow[];
  }

  // Same props as the original landing-page pattern, plus wedding for Bloom.
  // Casting is necessary only because the JSX component has no TS declarations.
  return (
    <BloomInvitation
      wedding={wedding}
      guest={guest}
      familyMembers={familyMembers}
    />
  );
}
