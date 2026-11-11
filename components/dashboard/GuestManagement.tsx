'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  saveWeddingDetailsAction, 
  addGuestAction, 
  updateGuestRsvpAction,
  addFamilyMemberAction,
  removeFamilyMemberAction,
  getFamilyMembersAction,
  deleteGuestAction
} from '@/app/dashboard/actions';

// ==================== INTERFACES ====================
interface Guest {
  id: string;
  name: string;
  title_prefix?: string;
  phone: string | null;
  allowed_guests: number;
  invited_events?: string[];
  personal_message?: string | null;
  token: string;
  rsvp_status?: 'pending' | 'attending' | 'declined' | 'not_attending' | 'maybe';
  rsvp_updated_at?: string;
  created_at?: string;
}

interface FamilyMember {
  id: string;
  wedding_id: string;
  name: string;
  profile_image?: string;
  role?: string;
  created_at: string;
}

interface WeddingDetails {
  id: string;
  groom_name: string;
  bride_name: string;
  groom_image?: string;
  bride_image?: string;
  mehndi_date?: string;
  mehndi_time?: string;
  mehndi_venue?: string;
  mehndi_map_url?: string;
  barat_date?: string;
  barat_time?: string;
  barat_venue?: string;
  barat_map_url?: string;
  walima_date?: string;
  walima_time?: string;
  walima_venue?: string;
  walima_map_url?: string;
  groom_family_members?: string[];
  contact_person_1?: string;
  contact_number_1?: string;
  contact_person_2?: string;
  contact_number_2?: string;
}

interface GuestManagementProps {
  initialWedding: WeddingDetails | null;
  initialGuests: Guest[];
  initialFamilyMembers?: FamilyMember[];
  baseUrl: string;
}

type TabType = 'overview' | 'couple' | 'events' | 'family' | 'guests' | 'rsvp';

// ==================== COLOR SCHEME ====================
const COLORS = {
  primary: '#8B5E3C',
  primaryLight: '#F5EDE8',
  primaryDark: '#6B4226',
  accent: '#C8956E',
  accentLight: '#E8D5C0',
  gold: '#B8860B',
  goldLight: '#FDF5E6',
  rose: '#D4A0A0',
  roseLight: '#FDF0F0',
  sage: '#A8B8A0',
  sageLight: '#F0F5ED',
  cream: '#FDF8F5',
  white: '#FFFFFF',
  text: '#2C1810',
  textLight: '#6B5A4F',
  border: '#EBE5DF',
};

// ==================== MAIN COMPONENT ====================
export default function GuestManagement({
  initialWedding,
  initialGuests,
  initialFamilyMembers = [],
  baseUrl,
}: GuestManagementProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // ==================== STATE ====================
  const [wedding, setWedding] = useState<WeddingDetails | null>(initialWedding);
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(initialFamilyMembers);
  const [isLoading, setIsLoading] = useState(false);

  // Server Component props may change after router.refresh(). Keep local
  // dashboard state in sync with the freshly loaded Supabase rows.
  useEffect(() => {
    setGuests(initialGuests);
  }, [initialGuests]);

  useEffect(() => {
    setWedding(initialWedding);
  }, [initialWedding]);

  useEffect(() => {
    setFamilyMembers(initialFamilyMembers);
  }, [initialFamilyMembers]);

  // A guest may RSVP in another browser. Refresh the server data when
  // the administrator returns to the dashboard (no visual UI changes).
  useEffect(() => {
    const refreshOnFocus = () => router.refresh();
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [router]);


  const [editWeddingDetails, setEditWeddingDetails] = useState(!initialWedding);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedQrGuest, setSelectedQrGuest] = useState<Guest | null>(null);
  const [showFamilyMemberForm, setShowFamilyMemberForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Image states
  const [groomImageFile, setGroomImageFile] = useState<File | null>(null);
  const [brideImageFile, setBrideImageFile] = useState<File | null>(null);
  const [groomImagePreview, setGroomImagePreview] = useState<string | null>(initialWedding?.groom_image || null);
  const [brideImagePreview, setBrideImagePreview] = useState<string | null>(initialWedding?.bride_image || null);

  // Live Timer
  const [now, setNow] = useState<Date>(new Date());

  // Guest Form States
  const [guestName, setGuestName] = useState('');
  const [titlePrefix, setTitlePrefix] = useState('Mr');
  const [guestPhone, setGuestPhone] = useState('');
  const [allowedSeats, setAllowedSeats] = useState(1);
  const [invitedEvents, setInvitedEvents] = useState<string[]>(['Mehndi', 'Barat', 'Walima']);
  const [customParagraph, setCustomParagraph] = useState('');

  // Family Member Form States
  const [familyMemberName, setFamilyMemberName] = useState('');
  const [familyMemberImage, setFamilyMemberImage] = useState<string | null>(null);
  const [familyMemberImagePreview, setFamilyMemberImagePreview] = useState<string | null>(null);
  const [familyMemberRole, setFamilyMemberRole] = useState('family');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (active) {
        setAuthStatus(user ? 'authenticated' : 'unauthenticated');
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setAuthStatus(session?.user ? 'authenticated' : 'unauthenticated');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setLoginError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
      setAuthSubmitting(false);
      return;
    }

    setAuthStatus('authenticated');
    setLoginPassword('');
    setAuthSubmitting(false);
    router.refresh();
  };

  const handleLogout = async () => {
    setAuthSubmitting(true);
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      alert(`Unable to log out: ${error.message}`);
      setAuthSubmitting(false);
      return;
    }

    setAuthStatus('unauthenticated');
    setLoginEmail('');
    setLoginPassword('');
    setAuthSubmitting(false);
    router.replace('/');
    router.refresh();
  };

  // ==================== HELPERS ====================
  const getNextEventDetails = () => {
    if (!wedding) return null;

    const rawEvents = [
      { name: 'Mehndi', date: wedding.mehndi_date, time: wedding.mehndi_time, venue: wedding.mehndi_venue, color: 'amber', icon: '🌺' },
      { name: 'Barat / Nikaah', date: wedding.barat_date, time: wedding.barat_time, venue: wedding.barat_venue, color: 'rose', icon: '💍' },
      { name: 'Walima', date: wedding.walima_date, time: wedding.walima_time, venue: wedding.walima_venue, color: 'emerald', icon: '✨' },
    ];

    const upcomingEvents = rawEvents
      .map((evt) => {
        if (!evt.date) return null;
        const timeStr = evt.time && evt.time.trim() !== '' ? evt.time : '12:00';
        const dateObj = new Date(`${evt.date}T${timeStr}`);
        return { ...evt, dateTime: dateObj };
      })
      .filter((evt): evt is any => evt !== null && !isNaN(evt.dateTime.getTime()) && evt.dateTime > now)
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    if (upcomingEvents.length === 0) return null;

    const nextEvt = upcomingEvents[0];
    const diffMs = nextEvt.dateTime.getTime() - now.getTime();

    return {
      nextEvt,
      countdown: {
        days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diffMs / (1000 * 60)) % 60),
        seconds: Math.floor((diffMs / 1000) % 60),
      },
    };
  };

  const activeCountdownData = getNextEventDetails();

  const getQrImageUrl = (token: string, size = 200) => {
    const inviteUrl = `${baseUrl}/invite/${token}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(inviteUrl)}`;
  };

  const generateDynamicParagraph = () => {
    if (titlePrefix === 'Custom') return customParagraph;
    const name = guestName.trim() || '[Guest Name]';
    if (titlePrefix === 'Family') {
      return `Dear ${name} & Family, With joy in our hearts, we cordially invite you and your family to celebrate the blessed wedding ceremony with us.`;
    }
    if (titlePrefix === 'Mrs') {
      return `Dear Mrs. ${name}, You are cordially invited with warmth and respect to grace our wedding celebration with your presence.`;
    }
    if (titlePrefix === 'Miss') {
      return `Dear Miss ${name}, We would be honored to have your gracious presence at our wedding festivities.`;
    }
    return `Dear Mr. ${name}, You are cordially invited to celebrate the auspicious wedding event with us.`;
  };

  const currentGeneratedParagraph = generateDynamicParagraph();

  const totalSeats = guests.reduce((acc, g) => acc + (g.allowed_guests || 1), 0);

  const getRsvpStats = () => {
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const notAttending = guests.filter(g => (g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending')).length;
    const maybe = guests.filter(g => g.rsvp_status === 'maybe').length;
    const pending = guests.filter(g => g.rsvp_status === 'pending' || !g.rsvp_status).length;
    return { attending, notAttending, maybe, pending };
  };

  const rsvpStats = getRsvpStats();

  // ==================== IMAGE HANDLERS ====================
  const handleGroomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setGroomImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroomImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setBrideImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrideImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFamilyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFamilyMemberImage(base64String);
        setFamilyMemberImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFamilyImage = () => {
    setFamilyMemberImage(null);
    setFamilyMemberImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ==================== FORM HANDLERS ====================
  const handleWeddingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    if (groomImageFile) {
      const reader = new FileReader();
      const groomBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(groomImageFile);
      });
      formData.append('groomImage', groomBase64);
    }
    
    if (brideImageFile) {
      const reader = new FileReader();
      const brideBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(brideImageFile);
      });
      formData.append('brideImage', brideBase64);
    }

    const res = await saveWeddingDetailsAction(formData);
    if (res.success && res.wedding) {
      setWedding(res.wedding);
      setEditWeddingDetails(false);
      setGroomImageFile(null);
      setBrideImageFile(null);
    } else {
      alert(res.error || 'Failed to save wedding details');
    }
    setIsLoading(false);
  };

  const handleEventCheckbox = (evt: string) => {
    if (invitedEvents.includes(evt)) {
      setInvitedEvents(invitedEvents.filter((e) => e !== evt));
    } else {
      setInvitedEvents([...invitedEvents, evt]);
    }
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${baseUrl}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getWhatsAppShareUrl = (guest: Guest) => {
    const inviteUrl = `${baseUrl}/invite/${guest.token}`;
    const qrImageUrl = getQrImageUrl(guest.token, 300);
    const groom = wedding?.groom_name || 'Groom';
    const bride = wedding?.bride_name || 'Bride';

    const message = `Assalam-o-Alaikum ${guest.name} ❤️\n\nYou are cordially invited to celebrate the wedding of ${groom} & ${bride}.\n\n📌 *View Your Digital Card:* ${inviteUrl}\n\n📷 *Your QR Pass:* ${qrImageUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // ==================== TABS ====================
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '📊' },
    { id: 'couple' as TabType, label: 'Couple', icon: '💑' },
    { id: 'events' as TabType, label: 'Events', icon: '📅' },
    { id: 'family' as TabType, label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { id: 'guests' as TabType, label: 'Guests', icon: '👤' },
    { id: 'rsvp' as TabType, label: 'RSVP', icon: '💌' },
  ];

  const getTabColor = (tabId: TabType) => {
    const colors: Record<TabType, string> = {
      overview: 'from-amber-600 to-amber-700',
      couple: 'from-rose-600 to-rose-700',
      events: 'from-amber-600 to-amber-700',
      family: 'from-emerald-600 to-emerald-700',
      guests: 'from-blue-600 to-blue-700',
      rsvp: 'from-purple-600 to-purple-700',
    };
    return colors[tabId] || 'from-amber-600 to-amber-700';
  };

  const getTabBg = (tabId: TabType) => {
    const colors: Record<TabType, string> = {
      overview: 'bg-amber-50',
      couple: 'bg-rose-50',
      events: 'bg-amber-50',
      family: 'bg-emerald-50',
      guests: 'bg-blue-50',
      rsvp: 'bg-purple-50',
    };
    return colors[tabId] || 'bg-amber-50';
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#8B5E3C] border-t-transparent" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center p-4 font-sans text-[#2C1810]">
        <div className="w-full max-w-md bg-white border border-[#EBE5DF] rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#6B4226] via-[#8B5E3C] to-[#6B4226] text-white p-7 text-center">
            <h1 className="text-2xl font-black tracking-wide">Wedding Portal</h1>
            <p className="text-xs text-[#E8D5C0] font-semibold uppercase tracking-widest mt-1">
              Digital Invitation Dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-7 sm:p-8 space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl text-xs font-semibold text-center">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase mb-1.5">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="w-full px-4 py-3 border border-[#C8956E] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C8956E]/40"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1.5">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="w-full px-4 py-3 border border-[#C8956E] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C8956E]/40"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-[#8B5E3C] hover:bg-[#6B4226] text-white font-bold py-3 rounded-xl uppercase text-xs tracking-wider transition disabled:opacity-50"
            >
              {authSubmitting ? 'Signing in...' : 'Sign in to dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-[#2C1810] p-4 sm:p-6 bg-[#FDF8F5] min-h-screen">
      
      {/* ==================== LOADING OVERLAY ==================== */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#8B5E3C] border-t-transparent"></div>
            <p className="mt-4 text-sm font-medium text-[#6B5A4F]">Loading...</p>
          </div>
        </div>
      )}

      {/* ==================== TOP BANNER ==================== */}
      <div className="bg-gradient-to-r from-[#6B4226] via-[#8B5E3C] to-[#6B4226] text-white p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-[#C8956E]/30">
        <div>
          <span className="inline-block px-3 py-1 bg-[#C8956E]/20 text-[#E8D5C0] text-xs font-semibold rounded-full border border-[#C8956E]/30 mb-2">
            🎉 Wedding Management Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {wedding ? `${wedding.groom_name} & ${wedding.bride_name}'s Wedding` : 'Event Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-[#E8D5C0] font-medium mt-1">
            Manage your event details, dynamic guest passes & real-time digital invitations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditWeddingDetails(!editWeddingDetails)}
            className="bg-[#C8956E] hover:bg-[#B8860B] text-white px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm uppercase tracking-wider transition shadow-md hover:shadow-[#C8956E]/40 active:scale-[0.98] flex items-center gap-2"
          >
            <span>{editWeddingDetails ? '✕ Close Settings' : '⚙️ Edit Event Details'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={authSubmitting}
            className="bg-white/10 hover:bg-red-600 text-white border border-white/30 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm uppercase tracking-wider transition disabled:opacity-50"
          >
            {authSubmitting ? 'Signing out...' : '↪ Log out'}
          </button>
        </div>
      </div>

      {/* ==================== COUNTDOWN BANNER ==================== */}
      {activeCountdownData && (
        <div className={`bg-gradient-to-br from-${activeCountdownData.nextEvt.color}-700 via-${activeCountdownData.nextEvt.color}-600 to-${activeCountdownData.nextEvt.color}-800 text-white p-6 rounded-3xl shadow-lg border border-${activeCountdownData.nextEvt.color}-500/20 flex flex-col md:flex-row items-center justify-between gap-6`}>
          <div className="space-y-1 text-center md:text-left">
            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest border border-white/20">
              ⏰ Up Next
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-wide pt-1 flex items-center gap-2">
              <span>{activeCountdownData.nextEvt.icon}</span>
              {activeCountdownData.nextEvt.name}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-white/80 flex flex-wrap justify-center md:justify-start items-center gap-2">
              <span>📅 {activeCountdownData.nextEvt.date}</span>
              <span>•</span>
              <span>⏰ {activeCountdownData.nextEvt.time || '12:00'}</span>
              {activeCountdownData.nextEvt.venue && (
                <>
                  <span>•</span>
                  <span>📍 {activeCountdownData.nextEvt.venue}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="text-center min-w-[50px]">
              <span className="text-2xl sm:text-3xl font-black text-white block">{String(activeCountdownData.countdown.days).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Days</span>
            </div>
            <span className="text-xl font-bold text-white/50 mb-3">:</span>
            <div className="text-center min-w-[50px]">
              <span className="text-2xl sm:text-3xl font-black text-white block">{String(activeCountdownData.countdown.hours).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Hours</span>
            </div>
            <span className="text-xl font-bold text-white/50 mb-3">:</span>
            <div className="text-center min-w-[50px]">
              <span className="text-2xl sm:text-3xl font-black text-white block">{String(activeCountdownData.countdown.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Mins</span>
            </div>
            <span className="text-xl font-bold text-white/50 mb-3">:</span>
            <div className="text-center min-w-[50px]">
              <span className="text-2xl sm:text-3xl font-black text-${activeCountdownData.nextEvt.color}-300 block">{String(activeCountdownData.countdown.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Secs</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STATS CARDS ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EBE5DF] shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <p className="text-xs font-semibold text-[#6B5A4F] uppercase">Total Guests</p>
          <p className="text-2xl font-black text-[#2C1810] mt-1">{guests.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#EBE5DF] shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <p className="text-xs font-semibold text-[#6B5A4F] uppercase">Total Seats</p>
          <p className="text-2xl font-black text-[#8B5E3C] mt-1">{totalSeats}</p>
        </div>
        <div className="bg-[#F0F5ED] p-5 rounded-2xl border border-[#A8B8A0]/30 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <p className="text-xs font-semibold text-[#6B8B5A] uppercase">✅ Attending</p>
          <p className="text-2xl font-black text-[#4A7A3A] mt-1">{rsvpStats.attending}</p>
        </div>
        <div className="bg-[#FDF5E6] p-5 rounded-2xl border border-[#B8860B]/30 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <p className="text-xs font-semibold text-[#B8860B]/70 uppercase">⏳ Pending</p>
          <p className="text-2xl font-black text-[#B8860B] mt-1">{rsvpStats.pending}</p>
        </div>
      </div>

      {/* ==================== TABS NAVIGATION ==================== */}
      <div className="bg-white rounded-2xl border border-[#EBE5DF] shadow-sm p-1.5 overflow-x-auto">
        <div className="flex flex-wrap gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2
                ${activeTab === tab.id 
                  ? `bg-gradient-to-r ${getTabColor(tab.id)} text-white shadow-md` 
                  : 'text-[#6B5A4F] hover:bg-[#F5EDE8] hover:text-[#2C1810]'
                }
              `}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== TAB CONTENT ==================== */}
      <div className={`bg-white rounded-3xl border border-[#EBE5DF] shadow-sm p-6 sm:p-8 ${getTabBg(activeTab)}`}>
        
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE5DF] pb-4">
              <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                <span className="text-2xl">📊</span> Dashboard Overview
              </h2>
              <p className="text-sm text-[#6B5A4F] mt-1">Quick snapshot of your wedding management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FDF8F5] p-5 rounded-2xl border border-[#EBE5DF] text-center">
                <div className="text-3xl mb-2">👤</div>
                <p className="text-2xl font-bold text-[#2C1810]">{guests.length}</p>
                <p className="text-xs text-[#6B5A4F] uppercase tracking-wider">Total Guests</p>
              </div>
              <div className="bg-[#FDF8F5] p-5 rounded-2xl border border-[#EBE5DF] text-center">
                <div className="text-3xl mb-2">💺</div>
                <p className="text-2xl font-bold text-[#8B5E3C]">{totalSeats}</p>
                <p className="text-xs text-[#6B5A4F] uppercase tracking-wider">Total Seats</p>
              </div>
              <div className="bg-[#FDF8F5] p-5 rounded-2xl border border-[#EBE5DF] text-center">
                <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
                <p className="text-2xl font-bold text-[#4A7A3A]">{familyMembers.length}</p>
                <p className="text-xs text-[#6B5A4F] uppercase tracking-wider">Family Members</p>
              </div>
              <div className="bg-[#FDF8F5] p-5 rounded-2xl border border-[#EBE5DF] text-center">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-2xl font-bold text-[#B8860B]">3</p>
                <p className="text-xs text-[#6B5A4F] uppercase tracking-wider">Events</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={() => setActiveTab('couple')} className="bg-white p-4 rounded-xl border border-[#EBE5DF] hover:border-[#8B5E3C] transition text-center">
                <span className="text-2xl block mb-1">💑</span>
                <span className="text-xs font-medium text-[#6B5A4F]">Edit Couple</span>
              </button>
              <button onClick={() => setActiveTab('events')} className="bg-white p-4 rounded-xl border border-[#EBE5DF] hover:border-[#8B5E3C] transition text-center">
                <span className="text-2xl block mb-1">📅</span>
                <span className="text-xs font-medium text-[#6B5A4F]">Events</span>
              </button>
              <button onClick={() => setActiveTab('family')} className="bg-white p-4 rounded-xl border border-[#EBE5DF] hover:border-[#8B5E3C] transition text-center">
                <span className="text-2xl block mb-1">👨‍👩‍👧‍👦</span>
                <span className="text-xs font-medium text-[#6B5A4F]">Family</span>
              </button>
              <button onClick={() => setActiveTab('guests')} className="bg-white p-4 rounded-xl border border-[#EBE5DF] hover:border-[#8B5E3C] transition text-center">
                <span className="text-2xl block mb-1">👤</span>
                <span className="text-xs font-medium text-[#6B5A4F]">Guests</span>
              </button>
            </div>
          </div>
        )}

        {/* ===== COUPLE TAB ===== */}
        {activeTab === 'couple' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE5DF] pb-4">
              <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                <span className="text-2xl">💑</span> Couple Information
              </h2>
              <p className="text-sm text-[#6B5A4F] mt-1">Manage groom & bride details with photos</p>
            </div>

            {editWeddingDetails ? (
              <form onSubmit={handleWeddingSubmit} className="space-y-6">
                <input type="hidden" name="weddingId" value={wedding?.id || ''} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#FDF0F0] p-6 rounded-2xl border border-[#D4A0A0]/30">
                    <label className="block text-xs font-semibold text-[#8B5E3C] uppercase mb-2">🤵 Groom Name *</label>
                    <input
                      type="text"
                      name="groomName"
                      required
                      defaultValue={wedding?.groom_name || ''}
                      placeholder="e.g. Wajid Ali"
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    />
                    
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-[#8B5E3C] uppercase mb-2">🖼️ Groom Photo</label>
                      <div className="flex items-center gap-4">
                        {groomImagePreview || wedding?.groom_image ? (
                          <img 
                            src={groomImagePreview || wedding?.groom_image} 
                            alt="Groom" 
                            className="w-16 h-16 rounded-full object-cover border-2 border-[#D4A0A0]"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-[#D4A0A0]/20 flex items-center justify-center text-3xl text-[#D4A0A0] border-2 border-dashed border-[#D4A0A0]/30">
                            🤵
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleGroomImageUpload}
                            className="hidden"
                            id="groomImageUpload"
                          />
                          <label
                            htmlFor="groomImageUpload"
                            className="inline-block px-4 py-2 bg-[#8B5E3C] hover:bg-[#6B4226] text-white text-xs font-bold uppercase rounded-xl cursor-pointer transition shadow-sm"
                          >
                            {groomImagePreview || wedding?.groom_image ? '🔄 Change' : '📤 Upload'}
                          </label>
                          <p className="text-[10px] text-[#6B5A4F] mt-1">PNG, JPG (max 5MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FDF0F5] p-6 rounded-2xl border border-[#D4A0A0]/30">
                    <label className="block text-xs font-semibold text-[#8B5E3C] uppercase mb-2">👰 Bride Name *</label>
                    <input
                      type="text"
                      name="brideName"
                      required
                      defaultValue={wedding?.bride_name || ''}
                      placeholder="e.g. Sehar"
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    />
                    
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-[#8B5E3C] uppercase mb-2">🖼️ Bride Photo</label>
                      <div className="flex items-center gap-4">
                        {brideImagePreview || wedding?.bride_image ? (
                          <img 
                            src={brideImagePreview || wedding?.bride_image} 
                            alt="Bride" 
                            className="w-16 h-16 rounded-full object-cover border-2 border-[#D4A0A0]"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-[#D4A0A0]/20 flex items-center justify-center text-3xl text-[#D4A0A0] border-2 border-dashed border-[#D4A0A0]/30">
                            👰
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBrideImageUpload}
                            className="hidden"
                            id="brideImageUpload"
                          />
                          <label
                            htmlFor="brideImageUpload"
                            className="inline-block px-4 py-2 bg-[#8B5E3C] hover:bg-[#6B4226] text-white text-xs font-bold uppercase rounded-xl cursor-pointer transition shadow-sm"
                          >
                            {brideImagePreview || wedding?.bride_image ? '🔄 Change' : '📤 Upload'}
                          </label>
                          <p className="text-[10px] text-[#6B5A4F] mt-1">PNG, JPG (max 5MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#8B5E3C] to-[#6B4226] hover:from-[#6B4226] hover:to-[#4A2A1A] text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? '⏳ Saving...' : '💾 Save Couple Details'}
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FDF0F0] p-6 rounded-2xl border border-[#D4A0A0]/30 text-center">
                  {wedding?.groom_image ? (
                    <img src={wedding.groom_image} alt="Groom" className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-[#D4A0A0] shadow-md" />
                  ) : (
                    <div className="text-6xl mb-3">🤵</div>
                  )}
                  <h3 className="text-xl font-bold text-[#2C1810]">{wedding?.groom_name || 'Not Set'}</h3>
                  <p className="text-xs text-[#8B5E3C] font-semibold uppercase mt-1">Groom</p>
                </div>
                <div className="bg-[#FDF0F5] p-6 rounded-2xl border border-[#D4A0A0]/30 text-center">
                  {wedding?.bride_image ? (
                    <img src={wedding.bride_image} alt="Bride" className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-[#D4A0A0] shadow-md" />
                  ) : (
                    <div className="text-6xl mb-3">👰</div>
                  )}
                  <h3 className="text-xl font-bold text-[#2C1810]">{wedding?.bride_name || 'Not Set'}</h3>
                  <p className="text-xs text-[#8B5E3C] font-semibold uppercase mt-1">Bride</p>
                </div>
                <div className="md:col-span-2 text-center py-4">
                  <button
                    onClick={() => setEditWeddingDetails(true)}
                    className="bg-[#8B5E3C] hover:bg-[#6B4226] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition"
                  >
                    ✏️ Edit Couple Details
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== EVENTS TAB ===== */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE5DF] pb-4">
              <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                <span className="text-2xl">📅</span> Events Schedule
              </h2>
              <p className="text-sm text-[#6B5A4F] mt-1">Manage all wedding event details</p>
            </div>

            {editWeddingDetails ? (
              <form
                action={async (formData) => {
                  setIsLoading(true);
                  const res = await saveWeddingDetailsAction(formData);
                  if (res.success && res.wedding) {
                    setWedding(res.wedding);
                    setEditWeddingDetails(false);
                  } else {
                    alert(res.error || 'Failed to save wedding details');
                  }
                  setIsLoading(false);
                }}
                className="space-y-6"
              >
                <input type="hidden" name="weddingId" value={wedding?.id || ''} />
                <input type="hidden" name="groomName" value={wedding?.groom_name || ''} />
                <input type="hidden" name="brideName" value={wedding?.bride_name || ''} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Mehndi */}
                  <div className="bg-[#FDF5E6] p-5 rounded-2xl border border-[#B8860B]/20 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌺</span>
                      <span className="inline-block px-3 py-1 bg-[#B8860B] text-white text-[11px] font-bold rounded-full uppercase">Mehndi</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#B8860B] uppercase">Date</label>
                        <input type="date" name="mehndiDate" defaultValue={wedding?.mehndi_date || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#B8860B] uppercase">Time</label>
                        <input type="time" name="mehndiTime" defaultValue={wedding?.mehndi_time || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#B8860B] uppercase">Venue</label>
                        <input type="text" name="mehndiVenue" placeholder="Venue Address" defaultValue={wedding?.mehndi_venue || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#B8860B] uppercase">Map Link</label>
                        <input type="url" name="mehndiMapUrl" placeholder="Google Map Link" defaultValue={wedding?.mehndi_map_url || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition text-[#8B5E3C]" />
                      </div>
                    </div>
                  </div>

                  {/* Barat */}
                  <div className="bg-[#FDF0F0] p-5 rounded-2xl border border-[#D4A0A0]/20 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💍</span>
                      <span className="inline-block px-3 py-1 bg-[#D4A0A0] text-white text-[11px] font-bold rounded-full uppercase">Barat</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#D4A0A0] uppercase">Date</label>
                        <input type="date" name="baratDate" defaultValue={wedding?.barat_date || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#D4A0A0] uppercase">Time</label>
                        <input type="time" name="baratTime" defaultValue={wedding?.barat_time || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#D4A0A0] uppercase">Venue</label>
                        <input type="text" name="baratVenue" placeholder="Venue Address" defaultValue={wedding?.barat_venue || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#D4A0A0] uppercase">Map Link</label>
                        <input type="url" name="baratMapUrl" placeholder="Google Map Link" defaultValue={wedding?.barat_map_url || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition text-[#8B5E3C]" />
                      </div>
                    </div>
                  </div>

                  {/* Walima */}
                  <div className="bg-[#F0F5ED] p-5 rounded-2xl border border-[#A8B8A0]/20 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✨</span>
                      <span className="inline-block px-3 py-1 bg-[#A8B8A0] text-white text-[11px] font-bold rounded-full uppercase">Walima</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#6B8B5A] uppercase">Date</label>
                        <input type="date" name="walimaDate" defaultValue={wedding?.walima_date || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#6B8B5A] uppercase">Time</label>
                        <input type="time" name="walimaTime" defaultValue={wedding?.walima_time || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#6B8B5A] uppercase">Venue</label>
                        <input type="text" name="walimaVenue" placeholder="Venue Address" defaultValue={wedding?.walima_venue || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#6B8B5A] uppercase">Map Link</label>
                        <input type="url" name="walimaMapUrl" placeholder="Google Map Link" defaultValue={wedding?.walima_map_url || ''} className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-sm font-medium focus:border-[#8B5E3C] outline-none transition text-[#8B5E3C]" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#B8860B] to-[#8B6914] hover:from-[#8B6914] hover:to-[#6B4F0A] text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? '⏳ Saving...' : '💾 Save Events Schedule'}
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-[#FDF5E6] p-5 rounded-2xl border border-[#B8860B]/20 text-center">
                  <div className="text-4xl mb-2">🌺</div>
                  <h4 className="font-bold text-[#2C1810]">Mehndi</h4>
                  <p className="text-sm text-[#B8860B] font-medium">{wedding?.mehndi_date || 'Not Set'}</p>
                  <p className="text-xs text-[#6B5A4F]">{wedding?.mehndi_venue || 'Venue not set'}</p>
                </div>
                <div className="bg-[#FDF0F0] p-5 rounded-2xl border border-[#D4A0A0]/20 text-center">
                  <div className="text-4xl mb-2">💍</div>
                  <h4 className="font-bold text-[#2C1810]">Barat</h4>
                  <p className="text-sm text-[#D4A0A0] font-medium">{wedding?.barat_date || 'Not Set'}</p>
                  <p className="text-xs text-[#6B5A4F]">{wedding?.barat_venue || 'Venue not set'}</p>
                </div>
                <div className="bg-[#F0F5ED] p-5 rounded-2xl border border-[#A8B8A0]/20 text-center">
                  <div className="text-4xl mb-2">✨</div>
                  <h4 className="font-bold text-[#2C1810]">Walima</h4>
                  <p className="text-sm text-[#6B8B5A] font-medium">{wedding?.walima_date || 'Not Set'}</p>
                  <p className="text-xs text-[#6B5A4F]">{wedding?.walima_venue || 'Venue not set'}</p>
                </div>
                <div className="md:col-span-3 text-center py-4">
                  <button
                    onClick={() => setEditWeddingDetails(true)}
                    className="bg-[#B8860B] hover:bg-[#8B6914] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition"
                  >
                    ✏️ Edit Events
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== FAMILY TAB ===== */}
        {activeTab === 'family' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE5DF] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                  <span className="text-2xl">👨‍👩‍👧‍👦</span> Family Members
                </h2>
                <p className="text-sm text-[#6B5A4F] mt-1">{familyMembers.length} family members</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFamilyMemberForm(!showFamilyMemberForm)}
                className="bg-[#8B5E3C] hover:bg-[#6B4226] text-white px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition shadow-md flex items-center gap-2"
              >
                <span>+</span> Add Member
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyMembers.map((member) => (
                <div key={member.id} className="bg-white border border-[#EBE5DF] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] flex items-center gap-4">
                  {member.profile_image ? (
                    <img 
                      src={member.profile_image} 
                      alt={member.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#C8956E] shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#F5EDE8] text-[#8B5E3C] flex items-center justify-center text-2xl font-bold border-2 border-[#EBE5DF] shadow-md">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#2C1810] text-sm truncate">{member.name}</p>
                    <span className="inline-block px-2 py-0.5 bg-[#F5EDE8] text-[#8B5E3C] text-[10px] font-bold rounded-full uppercase">
                      {member.role || 'Family'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Are you sure you want to remove this member?')) {
                        const formData = new FormData();
                        formData.append('memberId', member.id);
                        const res = await removeFamilyMemberAction(formData);
                        if (res.success) {
                          setFamilyMembers(familyMembers.filter(m => m.id !== member.id));
                        } else {
                          alert(res.error || 'Failed to remove member');
                        }
                      }
                    }}
                    className="text-red-400 hover:text-red-600 text-xl font-bold transition hover:scale-110"
                  >
                    ×
                  </button>
                </div>
              ))}
              {familyMembers.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-5xl mb-3">👤</div>
                  <p className="text-[#6B5A4F] font-medium">No family members added yet</p>
                  <p className="text-sm text-[#6B5A4F]/70">Click "Add Member" to get started</p>
                </div>
              )}
            </div>

            {showFamilyMemberForm && wedding && (
              <div className="bg-[#F5EDE8] p-6 rounded-2xl border-2 border-[#C8956E]/30 shadow-lg space-y-5">
                <h3 className="text-lg font-bold text-[#2C1810] flex items-center gap-2">
                  <span>✨</span> Add New Family Member
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">👤 Full Name *</label>
                    <input
                      type="text"
                      value={familyMemberName}
                      onChange={(e) => setFamilyMemberName(e.target.value)}
                      placeholder="e.g. Mr. Muhammad Bashir"
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">👔 Role</label>
                    <select
                      value={familyMemberRole}
                      onChange={(e) => setFamilyMemberRole(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    >
                      <option value="family">👨‍👩‍👧‍👦 Family</option>
                      <option value="father">👨 Father</option>
                      <option value="mother">👩 Mother</option>
                      <option value="brother">👦 Brother</option>
                      <option value="sister">👧 Sister</option>
                      <option value="uncle">👨 Uncle</option>
                      <option value="aunt">👩 Aunt</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">🖼️ Profile Picture</label>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {familyMemberImagePreview ? (
                        <div className="relative group">
                          <img 
                            src={familyMemberImagePreview} 
                            alt="Preview" 
                            className="w-24 h-24 rounded-full object-cover border-2 border-[#C8956E] shadow-lg"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveFamilyImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition shadow-md hover:scale-110"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-[#EBE5DF] flex items-center justify-center text-3xl text-[#6B5A4F]">
                          📷
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFamilyImageUpload}
                        className="hidden"
                        id="familyImageUpload"
                      />
                      <label
                        htmlFor="familyImageUpload"
                        className="inline-block px-5 py-3 bg-[#8B5E3C] hover:bg-[#6B4226] text-white text-xs font-bold uppercase rounded-xl cursor-pointer transition shadow-md"
                      >
                        {familyMemberImagePreview ? '🔄 Change Image' : '📤 Upload Image'}
                      </label>
                      <p className="text-[10px] text-[#6B5A4F] mt-2">PNG, JPG, GIF (max 5MB)</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!familyMemberName.trim()) {
                        alert('Please enter a member name');
                        return;
                      }
                      setIsLoading(true);
                      const formData = new FormData();
                      formData.append('weddingId', wedding.id);
                      formData.append('name', familyMemberName);
                      formData.append('profileImage', familyMemberImage || '');
                      formData.append('role', familyMemberRole);
                      const res = await addFamilyMemberAction(formData);
                      if (res.success && res.familyMember) {
                        setFamilyMembers([...familyMembers, res.familyMember]);
                        setFamilyMemberName('');
                        setFamilyMemberImage(null);
                        setFamilyMemberImagePreview(null);
                        setFamilyMemberRole('family');
                        setShowFamilyMemberForm(false);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      } else {
                        alert(res.error || 'Failed to add family member');
                      }
                      setIsLoading(false);
                    }}
                    disabled={isLoading}
                    className="flex-1 bg-[#8B5E3C] hover:bg-[#6B4226] text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? '⏳ Adding...' : '✅ Add Member'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFamilyMemberForm(false);
                      setFamilyMemberName('');
                      setFamilyMemberImage(null);
                      setFamilyMemberImagePreview(null);
                      setFamilyMemberRole('family');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-6 py-3.5 bg-white border border-[#EBE5DF] hover:bg-[#F5EDE8] text-[#6B5A4F] font-bold rounded-xl text-sm uppercase transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== GUESTS TAB ===== */}
        {activeTab === 'guests' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE5DF] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                  <span className="text-2xl">👤</span> Guest Cards
                </h2>
                <p className="text-sm text-[#6B5A4F] mt-1">{guests.length} guests invited</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuestForm(!showGuestForm)}
                disabled={!wedding}
                className="bg-[#8B5E3C] hover:bg-[#6B4226] text-white px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{showGuestForm ? '✕ Close' : '➕ Add Guest'}</span>
              </button>
            </div>

            {showGuestForm && wedding && (
              <form
                action={async (formData) => {
                  formData.append('personalMessage', currentGeneratedParagraph);
                  formData.append('titlePrefix', titlePrefix);
                  
                  invitedEvents.forEach((evt) => {
                    formData.append('invitedEvents', evt);
                  });

                  setIsLoading(true);
                  const res = await addGuestAction(formData);
                  if (res.success && res.guest) {
                    setGuests([res.guest, ...guests]);
                    setGuestName('');
                    setGuestPhone('');
                    setAllowedSeats(1);
                    setCustomParagraph('');
                    setShowGuestForm(false);
                  } else {
                    alert(res.error || 'Failed to add guest');
                  }
                  setIsLoading(false);
                }}
                className="bg-[#F5EDE8] border-2 border-[#C8956E]/30 p-6 rounded-2xl shadow-lg space-y-5"
              >
                <input type="hidden" name="weddingId" value={wedding.id} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">👤 Guest Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Ahmad"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">📱 Phone</label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="03001234567"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">💺 Seats *</label>
                    <input
                      type="number"
                      name="allowedGuests"
                      min="1"
                      max="50"
                      required
                      value={allowedSeats}
                      onChange={(e) => setAllowedSeats(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-bold text-[#8B5E3C] focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-3">Select Honorific:</label>
                  <div className="flex flex-wrap gap-2">
                    {['Mr', 'Mrs', 'Miss', 'Family', 'Custom'].map((prefix) => (
                      <label
                        key={prefix}
                        className={`px-4 py-2 rounded-xl border cursor-pointer text-xs font-bold transition ${
                          titlePrefix === prefix
                            ? 'bg-[#8B5E3C] text-white border-[#8B5E3C] shadow-sm'
                            : 'bg-white text-[#6B5A4F] border-[#EBE5DF] hover:bg-[#F5EDE8]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="titlePrefixRadio"
                          value={prefix}
                          checked={titlePrefix === prefix}
                          onChange={() => setTitlePrefix(prefix)}
                          className="hidden"
                        />
                        {prefix}
                      </label>
                    ))}
                  </div>
                </div>

                {titlePrefix === 'Custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">✏️ Custom Message</label>
                    <textarea
                      rows={3}
                      value={customParagraph}
                      onChange={(e) => setCustomParagraph(e.target.value)}
                      placeholder="Enter your custom message..."
                      className="w-full px-4 py-3 bg-white border border-[#EBE5DF] rounded-xl text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#C8956E]/30 outline-none transition"
                    />
                  </div>
                )}

                <div className="bg-[#2C1810] text-[#E8D5C0] p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-[#C8956E] tracking-wider">📝 Preview:</p>
                  <p className="text-sm font-serif leading-relaxed italic text-[#F5EDE8]">
                    "{currentGeneratedParagraph}"
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B5A4F] uppercase mb-2">Events:</label>
                  <div className="flex flex-wrap gap-4 p-4 bg-white border border-[#EBE5DF] rounded-xl">
                    {['Mehndi', 'Barat', 'Walima'].map((evt) => (
                      <label key={evt} className="flex items-center gap-2 cursor-pointer text-sm text-[#2C1810]">
                        <input
                          type="checkbox"
                          value={evt}
                          checked={invitedEvents.includes(evt)}
                          onChange={() => handleEventCheckbox(evt)}
                          className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                        />
                        {evt}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#8B5E3C] to-[#6B4226] hover:from-[#6B4226] hover:to-[#4A2A1A] text-white font-bold py-3.5 rounded-xl uppercase text-sm tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? '⏳ Generating...' : '🎯 Generate Guest Pass'}
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2C1810] text-[#E8D5C0] text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-4">Guest</th>
                    <th className="p-4 text-center">QR</th>
                    <th className="p-4 text-center">Seats</th>
                    <th className="p-4">Events</th>
                    <th className="p-4 text-center">RSVP</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE5DF]">
                  {guests.map((g) => (
                    <tr key={g.id} className="hover:bg-[#F5EDE8]/50 transition">
                      <td className="p-4">
                        <p className="font-bold text-[#2C1810] text-sm">{g.name}</p>
                        <span className="text-[10px] text-[#6B5A4F] font-bold uppercase">{g.title_prefix || 'Mr'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => setSelectedQrGuest(g)} className="group">
                          <img
                            src={getQrImageUrl(g.token, 80)}
                            alt="QR"
                            className="w-10 h-10 border border-[#EBE5DF] rounded-lg bg-white p-1 group-hover:border-[#8B5E3C] group-hover:scale-105 transition shadow-sm"
                          />
                        </button>
                      </td>
                      <td className="p-4 text-center font-black text-[#8B5E3C]">{g.allowed_guests}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(g.invited_events || ['Mehndi', 'Barat', 'Walima']).map((e) => (
                            <span key={e} className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                              e === 'Mehndi' ? 'bg-[#FDF5E6] text-[#B8860B] border-[#B8860B]/20' :
                              e === 'Barat' ? 'bg-[#FDF0F0] text-[#D4A0A0] border-[#D4A0A0]/20' :
                              'bg-[#F0F5ED] text-[#6B8B5A] border-[#A8B8A0]/20'
                            }`}>
                              {e}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                          g.rsvp_status === 'attending' ? 'bg-[#F0F5ED] text-[#4A7A3A]' :
                          (g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending') ? 'bg-[#FDF0F0] text-[#D4A0A0]' :
                          g.rsvp_status === 'maybe' ? 'bg-[#FDF5E6] text-[#B8860B]' :
                          'bg-[#F5EDE8] text-[#6B5A4F]'
                        }`}>
                          {g.rsvp_status === 'attending' ? '✅ Attending' :
                           (g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending') ? '❌ Not Attending' :
                           g.rsvp_status === 'maybe' ? '🤔 Maybe' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleCopyLink(g.token)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#F5EDE8] hover:bg-[#EBE5DF] text-[#6B5A4F] rounded-lg transition"
                        >
                          {copiedToken === g.token ? '✅' : '📋'}
                        </button>
                        <a
                          href={getWhatsAppShareUrl(g)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-semibold bg-[#8B5E3C] hover:bg-[#6B4226] text-white rounded-lg transition inline-block"
                        >
                          💬
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {guests.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">👤</div>
                  <p className="text-[#6B5A4F] font-medium">No guests added yet</p>
                  <p className="text-sm text-[#6B5A4F]/70">Click "Add Guest" to create invitations</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== RSVP TAB ===== */}
        {activeTab === 'rsvp' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE5DF] pb-4">
              <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                <span className="text-2xl">💌</span> RSVP Status
              </h2>
              <p className="text-sm text-[#6B5A4F] mt-1">Track guest attendance responses</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#F0F5ED] p-4 rounded-2xl border border-[#A8B8A0]/30 text-center hover:shadow-md transition">
                <p className="text-2xl font-black text-[#4A7A3A]">{rsvpStats.attending}</p>
                <p className="text-xs font-semibold text-[#6B8B5A] uppercase">✅ Attending</p>
              </div>
              <div className="bg-[#FDF0F0] p-4 rounded-2xl border border-[#D4A0A0]/30 text-center hover:shadow-md transition">
                <p className="text-2xl font-black text-[#D4A0A0]">{rsvpStats.notAttending}</p>
                <p className="text-xs font-semibold text-[#D4A0A0]/70 uppercase">❌ Not Attending</p>
              </div>
              <div className="bg-[#FDF5E6] p-4 rounded-2xl border border-[#B8860B]/30 text-center hover:shadow-md transition">
                <p className="text-2xl font-black text-[#B8860B]">{rsvpStats.maybe}</p>
                <p className="text-xs font-semibold text-[#B8860B]/70 uppercase">🤔 Maybe</p>
              </div>
              <div className="bg-[#F5EDE8] p-4 rounded-2xl border border-[#EBE5DF] text-center hover:shadow-md transition">
                <p className="text-2xl font-black text-[#6B5A4F]">{rsvpStats.pending}</p>
                <p className="text-xs font-semibold text-[#6B5A4F]/70 uppercase">⏳ Pending</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2C1810] text-[#E8D5C0] text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-4">Guest</th>
                    <th className="p-4 text-center">Seats</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Updated</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE5DF]">
                  {guests.map((g) => (
                    <tr key={g.id} className="hover:bg-[#F5EDE8]/50 transition">
                      <td className="p-4">
                        <p className="font-bold text-[#2C1810] text-sm">{g.name}</p>
                        <span className="text-[10px] text-[#6B5A4F] font-bold uppercase">{g.title_prefix || 'Mr'}</span>
                      </td>
                      <td className="p-4 text-center font-black text-[#8B5E3C]">{g.allowed_guests}</td>
                      <td className="p-4 text-center">
                        <form
                          action={async (formData) => {
                            const res = await updateGuestRsvpAction(formData);
                            if (res.success && res.guest) {
                              setGuests((current) => current.map((guest) => guest.id === res.guest.id ? res.guest : guest));
                            } else {
                              alert(res.error || 'Failed to update RSVP status');
                            }
                          }}
                        >
                          <input type="hidden" name="guestId" value={g.id} />
                          <select
                            name="rsvpStatus"
                            key={`${g.id}-${g.rsvp_status || 'pending'}`}
                            defaultValue={g.rsvp_status === 'not_attending' ? 'declined' : (g.rsvp_status || 'pending')}
                            onChange={(e) => e.target.closest('form')?.requestSubmit()}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 outline-none transition ${
                              g.rsvp_status === 'attending' ? 'bg-[#F0F5ED] text-[#4A7A3A] border-[#A8B8A0]' :
                              (g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending') ? 'bg-[#FDF0F0] text-[#D4A0A0] border-[#D4A0A0]' :
                              g.rsvp_status === 'maybe' ? 'bg-[#FDF5E6] text-[#B8860B] border-[#B8860B]' :
                              'bg-[#F5EDE8] text-[#6B5A4F] border-[#EBE5DF]'
                            }`}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="attending">✅ Attending</option>
                            <option value="declined">❌ Not Attending</option>
                            <option value="maybe">🤔 Maybe</option>
                          </select>
                        </form>
                      </td>
                      <td className="p-4 text-center text-[10px] text-[#6B5A4F]">
                        {g.rsvp_updated_at ? new Date(g.rsvp_updated_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleCopyLink(g.token)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#F5EDE8] hover:bg-[#EBE5DF] text-[#6B5A4F] rounded-lg transition"
                        >
                          📋 Copy Link
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {guests.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">📊</div>
                  <p className="text-[#6B5A4F] font-medium">No RSVP data available</p>
                  <p className="text-sm text-[#6B5A4F]/70">Add guests to track their responses</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== QR MODAL ==================== */}
      {selectedQrGuest && (
        <div className="fixed inset-0 z-50 bg-[#2C1810]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedQrGuest(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F5EDE8] hover:bg-[#EBE5DF] text-[#6B5A4F] flex items-center justify-center text-xl font-bold transition"
            >
              ✕
            </button>
            <div>
              <h3 className="text-lg font-extrabold text-[#2C1810]">🎟️ Event Pass</h3>
              <p className="text-xs font-bold text-[#8B5E3C] uppercase mt-0.5">
                {selectedQrGuest.title_prefix || 'Mr'} {selectedQrGuest.name}
              </p>
              <p className="text-[10px] text-[#6B5A4F] mt-1">
                💺 {selectedQrGuest.allowed_guests} Seats • {
                  selectedQrGuest.rsvp_status === 'attending' ? '✅ Attending' :
                  (selectedQrGuest.rsvp_status === 'declined' || selectedQrGuest.rsvp_status === 'not_attending') ? '❌ Not Attending' :
                  selectedQrGuest.rsvp_status === 'maybe' ? '🤔 Maybe' : '⏳ Pending'
                }
              </p>
            </div>

            <div className="p-4 bg-[#F5EDE8] rounded-2xl border border-[#EBE5DF] inline-block">
              <img
                src={getQrImageUrl(selectedQrGuest.token, 300)}
                alt="QR Code"
                className="w-48 h-48 bg-white p-2 rounded-xl mx-auto shadow-sm"
              />
            </div>

            <p className="text-[11px] text-[#6B5A4F] font-medium">Scan QR at venue entrance</p>

            <div className="flex gap-3 pt-2">
              <a
                href={getQrImageUrl(selectedQrGuest.token, 500)}
                target="_blank"
                download={`QR_Pass_${selectedQrGuest.name}.png`}
                className="flex-1 py-2.5 bg-[#2C1810] hover:bg-[#1A0F0A] text-white text-xs font-bold uppercase rounded-xl transition"
              >
                ⬇️ Download
              </a>
              <button
                type="button"
                onClick={() => setSelectedQrGuest(null)}
                className="flex-1 py-2.5 bg-[#F5EDE8] hover:bg-[#EBE5DF] text-[#6B5A4F] text-xs font-bold uppercase rounded-xl transition"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
