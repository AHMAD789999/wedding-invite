'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

// ==================== HELPERS ====================
async function uploadImage(base64Image: string, folder: string, fileName: string): Promise<string | null> {
  if (!base64Image || !base64Image.startsWith('data:image')) {
    console.log('No valid image data provided');
    return null;
  }

  const supabase = await createClient();
  
  try {
    // Validate/refresh the cookie-backed session before calling Storage.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Your login session expired. Please log out and sign in again.');
    }

    const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.log('Invalid base64 format');
      return null;
    }

    const extension = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const timestamp = Date.now();
    const filePath = `${folder}/${fileName}_${timestamp}.${extension}`;

    console.log(`Uploading image to: ${filePath}`);
    console.log(`Image size: ${buffer.length} bytes`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('wedding_images')
      .upload(filePath, buffer, {
        contentType: `image/${extension}`,
        cacheControl: '3600',
        // Each filename includes a timestamp, so this is always a new object.
        // Using upsert would also require SELECT and UPDATE Storage policies.
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('wedding_images')
      .getPublicUrl(filePath);

    console.log(`Image uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
}

// ==================== SAVE WEDDING DETAILS ====================
export async function saveWeddingDetailsAction(formData: FormData) {
  const supabase = await createClient();
  
  try {
    const weddingId = formData.get('weddingId') as string;
    const groomName = formData.get('groomName') as string;
    const brideName = formData.get('brideName') as string;
    const groomImageBase64 = formData.get('groomImage') as string;
    const brideImageBase64 = formData.get('brideImage') as string;
    const groomFamilyMembers = formData.get('groomFamilyMembers') as string;
    const contactPerson1 = formData.get('contactPerson1') as string;
    const contactNumber1 = formData.get('contactNumber1') as string;
    const contactPerson2 = formData.get('contactPerson2') as string;
    const contactNumber2 = formData.get('contactNumber2') as string;
    
    const mehndiDate = formData.get('mehndiDate') as string;
    const mehndiTime = formData.get('mehndiTime') as string;
    const mehndiVenue = formData.get('mehndiVenue') as string;
    const mehndiMapUrl = formData.get('mehndiMapUrl') as string;
    const baratDate = formData.get('baratDate') as string;
    const baratTime = formData.get('baratTime') as string;
    const baratVenue = formData.get('baratVenue') as string;
    const baratMapUrl = formData.get('baratMapUrl') as string;
    const walimaDate = formData.get('walimaDate') as string;
    const walimaTime = formData.get('walimaTime') as string;
    const walimaVenue = formData.get('walimaVenue') as string;
    const walimaMapUrl = formData.get('walimaMapUrl') as string;

    const familyMembers = groomFamilyMembers?.split('\n').filter(Boolean) || [];

    let groomImageUrl = null;
    let brideImageUrl = null;

    // Upload groom image if provided
    if (groomImageBase64 && groomImageBase64.length > 100) {
      const groomFileName = weddingId ? `groom_${weddingId}` : `groom_${randomUUID()}`;
      groomImageUrl = await uploadImage(groomImageBase64, 'groom', groomFileName);
      console.log('Groom image upload result:', groomImageUrl);
    }

    // Upload bride image if provided
    if (brideImageBase64 && brideImageBase64.length > 100) {
      const brideFileName = weddingId ? `bride_${weddingId}` : `bride_${randomUUID()}`;
      brideImageUrl = await uploadImage(brideImageBase64, 'bride', brideFileName);
      console.log('Bride image upload result:', brideImageUrl);
    }

    // Prepare update data matching your table schema
    const updateData: any = {
      groom_name: groomName,
      bride_name: brideName,
      groom_family_members: familyMembers,
      contact_person_1: contactPerson1 || null,
      contact_number_1: contactNumber1 || null,
      contact_person_2: contactPerson2 || null,
      contact_number_2: contactNumber2 || null,
      mehndi_date: mehndiDate || null,
      mehndi_time: mehndiTime || null,
      mehndi_venue: mehndiVenue || null,
      mehndi_map_url: mehndiMapUrl || null,
      barat_date: baratDate || null,
      barat_time: baratTime || null,
      barat_venue: baratVenue || null,
      barat_map_url: baratMapUrl || null,
      walima_date: walimaDate || null,
      walima_time: walimaTime || null,
      walima_venue: walimaVenue || null,
      walima_map_url: walimaMapUrl || null,
      updated_at: new Date().toISOString(),
    };

    // Add images if uploaded
    if (groomImageUrl) {
      updateData.groom_image = groomImageUrl;
    }
    if (brideImageUrl) {
      updateData.bride_image = brideImageUrl;
    }

    console.log('Final update data:', JSON.stringify(updateData, null, 2));

    let result;
    if (weddingId) {
      // Update existing wedding
      const { data, error } = await supabase
        .from('weddings')
        .update(updateData)
        .eq('id', weddingId)
        .select()
        .single();

      if (error) {
        console.error('Error updating wedding:', error);
        throw error;
      }
      result = data;
      console.log('Wedding updated successfully:', result.id);
      console.log('Groom image saved:', result.groom_image);
      console.log('Bride image saved:', result.bride_image);
    } else {
      // Create new wedding
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Set default values for required fields
      const insertData = {
        ...updateData,
        user_id: userId,
        title: `${groomName} & ${brideName}'s Wedding`,
        theme_config: {
          fontFamily: "Playfair Display",
          primaryColor: "#D4AF37",
          secondaryColor: "#1A1A1A",
          backgroundColor: "#FFFFFF"
        },
        language: 'en',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        map_location: 'https://maps.google.com/?q=Thokar+Niaz+Baig+Lahore',
      };

      const { data, error } = await supabase
        .from('weddings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting wedding:', error);
        throw error;
      }
      result = data;
      console.log('Wedding created successfully:', result.id);
    }

    revalidatePath('/dashboard');
    return { success: true, wedding: result };
  } catch (error) {
    console.error('Error saving wedding details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== ADD FAMILY MEMBER ====================
export async function addFamilyMemberAction(formData: FormData) {
  const supabase = await createClient();
  
  const weddingId = formData.get('weddingId') as string;
  const name = formData.get('name') as string;
  const profileImageBase64 = formData.get('profileImage') as string || null;
  const role = formData.get('role') as string || 'family';

  try {
    let profileImageUrl = null;

    if (profileImageBase64 && profileImageBase64.startsWith('data:image') && profileImageBase64.length > 100) {
      const fileName = `family_${weddingId}_${randomUUID()}`;
      profileImageUrl = await uploadImage(profileImageBase64, 'family-members', fileName);
      console.log('Family member image upload result:', profileImageUrl);
    }

    const { data, error } = await supabase
      .from('family_members')
      .insert({
        wedding_id: weddingId,
        name,
        profile_image: profileImageUrl,
        role,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting family member:', error);
      throw error;
    }

    console.log('Family member added successfully:', data);
    revalidatePath('/dashboard');
    return { success: true, familyMember: data };
  } catch (error) {
    console.error('Error adding family member:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== REMOVE FAMILY MEMBER ====================
export async function removeFamilyMemberAction(formData: FormData) {
  const supabase = await createClient();
  const memberId = formData.get('memberId') as string;

  try {
    const { data: member, error: fetchError } = await supabase
      .from('family_members')
      .select('profile_image')
      .eq('id', memberId)
      .single();

    if (fetchError) {
      console.error('Error fetching family member:', fetchError);
      throw fetchError;
    }

    if (member?.profile_image) {
      try {
        const urlParts = member.profile_image.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('wedding_images') + 1).join('/');
        if (filePath) {
          await supabase.storage.from('wedding_images').remove([filePath]);
          console.log('Image deleted successfully:', filePath);
        }
      } catch (storageError) {
        console.error('Error deleting image:', storageError);
      }
    }

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error deleting family member:', error);
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error removing family member:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== ADD GUEST ====================
export async function addGuestAction(formData: FormData) {
  const supabase = await createClient();
  
  const weddingId = formData.get('weddingId') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string || null;
  const allowedGuests = parseInt(formData.get('allowedGuests') as string || '1', 10);
  const invitedEvents = formData.getAll('invitedEvents') as string[];
  const personalMessage = formData.get('personalMessage') as string || null;
  const titlePrefix = formData.get('titlePrefix') as string || 'Mr';
  const token = randomUUID().substring(0, 8);

  try {
    const { data, error } = await supabase
      .from('guests')
      .insert({
        wedding_id: weddingId,
        name,
        title_prefix: titlePrefix,
        phone,
        allowed_guests: allowedGuests,
        invited_events: invitedEvents.length > 0 ? invitedEvents : ['Mehndi', 'Barat', 'Walima'],
        personal_message: personalMessage,
        token,
        rsvp_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting guest:', error);
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true, guest: data };
  } catch (error) {
    console.error('Error adding guest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== UPDATE GUEST RSVP ====================
export async function updateGuestRsvpAction(formData: FormData) {
  const supabase = await createClient();
  const guestId = formData.get('guestId') as string;
  const rsvpStatus = formData.get('rsvpStatus') as string;

  try {
    const { data, error } = await supabase
      .from('guests')
      .update({
        rsvp_status: rsvpStatus,
        rsvp_updated_at: new Date().toISOString(),
      })
      .eq('id', guestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating RSVP:', error);
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true, guest: data };
  } catch (error) {
    console.error('Error updating RSVP:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== GET FAMILY MEMBERS ====================
export async function getFamilyMembersAction(weddingId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching family members:', error);
      throw error;
    }
    
    return { success: true, familyMembers: data };
  } catch (error) {
    console.error('Error fetching family members:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== DELETE GUEST ====================
export async function deleteGuestAction(formData: FormData) {
  const supabase = await createClient();
  const guestId = formData.get('guestId') as string;

  try {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', guestId);

    if (error) {
      console.error('Error deleting guest:', error);
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting guest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== GET WEDDING DETAILS ====================
export async function getWeddingDetailsAction(weddingId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', weddingId)
      .single();

    if (error) {
      console.error('Error fetching wedding details:', error);
      throw error;
    }
    
    return { success: true, wedding: data };
  } catch (error) {
    console.error('Error fetching wedding details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}