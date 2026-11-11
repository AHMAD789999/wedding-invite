// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import GuestManagement from '@/components/dashboard/GuestManagement';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Fetch primary wedding record with ALL fields needed by GuestManagement
  const { data: wedding } = await supabase
    .from('weddings')
    .select(`
      id,
      groom_name,
      bride_name,
      groom_image,
      bride_image,
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
      groom_family_members,
      contact_person_1,
      contact_number_1,
      contact_person_2,
      contact_number_2
    `)
    .limit(1)
    .single();

  if (!wedding) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">No Wedding Found</h1>
        <p className="text-gray-500 mt-2">
          Please insert a wedding record in Supabase to start adding guests.
        </p>
      </div>
    );
  }

  // 2. Fetch guests for this wedding
  const { data: guests } = await supabase
    .from('guests')
    .select(`
      id,
      name,
      title_prefix,
      phone,
      allowed_guests,
      invited_events,
      personal_message,
      token,
      rsvp_status,
      rsvp_updated_at,
      created_at
    `)
    .eq('wedding_id', wedding.id)
    .order('created_at', { ascending: false });

  // 3. Fetch family members
  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('id, wedding_id, name, profile_image, role, created_at')
    .eq('wedding_id', wedding.id)
    .order('created_at', { ascending: true });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          {wedding.groom_name} & {wedding.bride_name}'s Wedding
        </h1>
        <p className="text-gray-500">
          Dashboard & Personalized Guest Invitations
        </p>
      </div>

      <GuestManagement
        initialWedding={wedding}
        initialGuests={guests || []}
        initialFamilyMembers={familyMembers || []}
        baseUrl={baseUrl}
      />
    </main>
  );
}