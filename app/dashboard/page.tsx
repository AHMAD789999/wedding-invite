// app/dashboard/page.tsx

import { createClient } from '@/lib/supabase/server';
import GuestManagement from '@/components/dashboard/GuestManagement';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch wedding details
  const { data: weddingData } = await supabase
    .from('weddings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch guests
  const { data: guestsData } = await supabase
    .from('guests')
    .select('*')
    .eq('wedding_id', weddingData?.id || '')
    .order('created_at', { ascending: false });

  // Fetch family members - THIS IS THE IMPORTANT PART
  const { data: familyMembersData } = await supabase
    .from('family_members')
    .select('*')
    .eq('wedding_id', weddingData?.id || '')
    .order('created_at', { ascending: true });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return (
    <GuestManagement
      initialWedding={weddingData || null}
      initialGuests={guestsData || []}
      initialFamilyMembers={familyMembersData || []}
      baseUrl={baseUrl}
    />
  );
}