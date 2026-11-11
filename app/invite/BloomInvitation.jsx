'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { submitWeddingRsvpAction } from './actions'; // Existing server action handles token verification and database writes.

import clusterImage from './assets/images/cluster.webp';
import dividerImage from './assets/images/divider.webp';
import flowerImage from './assets/images/flower.webp';
import garlandBandImage from './assets/images/garland-band.webp';
import garlandLeftImage from './assets/images/garland-left.webp';
import openerPoster from './assets/images/opener-poster.jpg';
import sprigImage from './assets/images/sprig.webp';
import petal0 from './assets/images/petal0.webp';
import petal1 from './assets/images/petal1.webp';
import petal2 from './assets/images/petal2.webp';
import petal3 from './assets/images/petal3.webp';
import petal4 from './assets/images/petal4.webp';
import petal5 from './assets/images/petal5.webp';
import petal6 from './assets/images/petal6.webp';

const importedAssets = {
  'audio/music.mp3': '/invite/audio/music.mp3',
  'images/cluster.webp': clusterImage,
  'images/divider.webp': dividerImage,
  'images/flower.webp': flowerImage,
  'images/garland-band.webp': garlandBandImage,
  'images/garland-left.webp': garlandLeftImage,
  'images/opener-poster.jpg': openerPoster,
  'images/sprig.webp': sprigImage,
  'images/petal0.webp': petal0, 'images/petal1.webp': petal1, 'images/petal2.webp': petal2,
  'images/petal3.webp': petal3, 'images/petal4.webp': petal4, 'images/petal5.webp': petal5, 'images/petal6.webp': petal6,
};
// The opener video is too large for Git (*.mp4 is gitignored). Host it externally and set
// NEXT_PUBLIC_BLOOM_OPENER_VIDEO_URL to enable it; otherwise the cover shows the poster only.
const openerVideoUrl = process.env.NEXT_PUBLIC_BLOOM_OPENER_VIDEO_URL || '';
const asset = (name) => {
  const imported = importedAssets[name];
  if (!imported) throw new Error(`Bloom asset is not registered: ${name}`);
  return typeof imported === 'string' ? imported : imported.src;
};
// Data comes from the wedding/guest records passed by the server page.
const eventDefinitions = [
  { title: 'Mehndi', prefix: 'mehndi', note: 'Join us for the Mehndi celebration.' },
  { title: 'Nikkah', prefix: 'nikkah', note: 'Join us for the Nikkah ceremony.' },
  { title: 'Barat', prefix: 'barat', note: 'Join us for the Barat celebration.' },
  { title: 'Walima', prefix: 'walima', note: 'Join us for the Walima reception.' },
];

// Deterministic date rendering avoids server/client locale and timezone mismatches.
// A Supabase DATE is interpreted as a calendar date, not as a UTC/local instant.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function formatDate(date, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return '';
  const parts = [];
  if (options.weekday) parts.push(WEEKDAYS[value.getUTCDay()]);
  if (options.day) parts.push(String(day));
  if (options.month) parts.push(options.month === 'short' ? MONTHS[month - 1].slice(0, 3) : MONTHS[month - 1]);
  if (options.year) parts.push(String(year));
  return parts.join(' ');
}
function formatTime(time) {
  if (!time) return '';
  const [hours, minutes] = String(time).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}
function eventTimestamp(date, time) {
  if (!date) return null;
  const normalizedTime = String(time || '19:00:00').slice(0, 8);
  const candidate = new Date(`${String(date).slice(0, 10)}T${normalizedTime}+05:00`).getTime();
  return Number.isFinite(candidate) ? candidate : null;
}
function buildEvents(wedding, guest) {
  const invited = Array.isArray(guest?.invited_events) ? guest.invited_events.map(x => String(x).toLowerCase()) : null;
  return eventDefinitions.flatMap(({ title, prefix, note }) => {
    if (invited && !invited.includes(title.toLowerCase())) return [];
    const date = wedding[`${prefix}_date`];
    if (!date) return [];
    const rawTime = wedding[`${prefix}_time`] || '19:00:00';
    const timestamp = eventTimestamp(date, rawTime);
    if (timestamp === null) return [];
    const compact = (timestampValue) => new Date(timestampValue).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return [{ title, rawDate: date, rawTime, timestamp, date: formatDate(date),
      time: formatTime(rawTime), venue: wedding[`${prefix}_venue`] || '',
      url: /^https?:\/\//i.test(wedding[`${prefix}_map_url`] || '') ? wedding[`${prefix}_map_url`] : '', note,
      start: compact(timestamp), end: compact(timestamp + 3 * 3600000) }];
  }).sort((a, b) => a.timestamp - b.timestamp);
}


function Ornament({ src = 'sprig.webp', className = '', alt = '' }) {
  return <div className={`flora ${className}`} data-r aria-hidden="true"><span className="rs"><img src={asset(`images/${src}`)} alt={alt} /></span></div>;
}

function Divider({ className = '' }) {
  return <div className={`rule ${className}`} data-r><img src={asset('images/divider.webp')} alt="" /></div>;
}

function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...props }) {
  return <Tag className={className} data-r style={{ '--d': `${delay}s` }} {...props}>{children}</Tag>;
}

function PetalCanvas({ enabled, burstKey }) {
  const canvasRef = useRef(null);
  const burstRef = useRef(0);
  useEffect(() => { burstRef.current = burstKey; }, [burstKey]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const images = Array.from({ length: 7 }, (_, i) => {
      const image = new Image(); image.src = asset(`images/petal${i}.webp`); return image;
    });
    let frame = 0, last = 0, lastBurstKey = burstRef.current, lastAmbient = 0;
    const petals = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`; canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const add = (x = Math.random() * innerWidth, y = -20, amount = 1) => {
      for (let i = 0; i < amount; i++) petals.push({ image: images[(Math.random() * images.length) | 0], x: x + (Math.random() - .5) * 160, y: y - Math.random() * 80, vx: (Math.random() - .5) * 25, vy: 24 + Math.random() * 45, size: 12 + Math.random() * 14, phase: Math.random() * 6, spin: (Math.random() - .5) * 2, life: 8 + Math.random() * 4, age: 0 });
    };
    const tick = (time) => {
      frame = requestAnimationFrame(tick);
      if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const dt = Math.min(.05, (time - (last || time)) / 1000); last = time;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (burstRef.current !== lastBurstKey) { lastBurstKey = burstRef.current; add(innerWidth / 2, innerHeight * .44, 24); }
      if (time - lastAmbient > 700) { lastAmbient = time; add(Math.random() * innerWidth, -10, 1); }
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i]; p.age += dt; p.x += (p.vx + Math.sin(p.age * 1.5 + p.phase) * 16) * dt; p.y += p.vy * dt; p.phase += p.spin * dt;
        if (p.age > p.life || p.y > innerHeight + 30) { petals.splice(i, 1); continue; }
        const fade = Math.min(1, p.age * 2, (p.life - p.age) * .8);
        if (p.image.complete && p.image.naturalWidth) { ctx.save(); ctx.globalAlpha = fade * .8; ctx.translate(p.x, p.y); ctx.rotate(p.phase); ctx.drawImage(p.image, -p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); }
      }
    };
    resize(); window.addEventListener('resize', resize); frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [enabled]);
  return <canvas ref={canvasRef} className="petal-canvas" aria-hidden="true" />;
}

function ScratchCard({ onReveal, event, coupleNames }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const scratchMoveCount = useRef(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = bounds.width * dpr; canvas.height = bounds.height * dpr;
    ctx.scale(dpr, dpr);
    const gradient = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
    gradient.addColorStop(0, '#d8c7a6'); gradient.addColorStop(.5, '#eee2c9'); gradient.addColorStop(1, '#c8b18b');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.font = '600 12px Cormorant Garamond'; ctx.textAlign = 'center'; ctx.fillText('✧  SCRATCH TO REVEAL  ✧', bounds.width / 2, bounds.height / 2);
    // Opaque paint clears the coating fully so the scratch threshold can be reached.
    ctx.fillStyle = '#000';
    ctx.globalCompositeOperation = 'destination-out';
  }, []);
  const revealIfCleared = () => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 16) clear++;
    if (clear / (pixels.length / 4) > .18) { setRevealed(true); onReveal(); }
  };
  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };
  const scratch = (event) => {
    if (!drawing.current || revealed) return;
    const ctx = canvasRef.current.getContext('2d'); const [x, y] = point(event);
    ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.fill();
    scratchMoveCount.current += 1;
    if (scratchMoveCount.current % 3 === 0) revealIfCleared();
  };
  return <div className={`scratch ${revealed ? 'revealed' : ''}`}>
    <span className="k">THE {event?.title?.toUpperCase() || "WEDDING"} OF {coupleNames.toUpperCase()}</span><strong className="d">{event ? formatDate(event.rawDate, { day: "numeric", month: "long", year: "numeric" }) : "Date to be announced"}</strong><span className="dd">{event ? formatDate(event.rawDate, { weekday: "long" }) : ""}</span><span className="t">{event?.time || ""}{event?.venue ? ` · ${event.venue}` : ""}</span>
    {!revealed && <canvas ref={canvasRef} aria-label="Scratch to reveal the wedding date" onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratch(e); }} onPointerMove={scratch} onPointerUp={() => { drawing.current = false; revealIfCleared(); }} onPointerCancel={() => { drawing.current = false; revealIfCleared(); }} />}
    {!revealed && <button type="button" className="scratch-reveal" onClick={() => { setRevealed(true); onReveal(); }}>Tap to reveal date</button>}
  </div>;
}

function CalendarButton({ event, coupleNames }) {
  const add = () => {
    if (!event?.start) return;
    const escapeIcs = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bloom Invitation//EN', 'BEGIN:VEVENT',
      `UID:${event.start}-${event.title.toLowerCase()}@bloom`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART:${event.start}`, `DTEND:${event.end}`,
      `SUMMARY:${escapeIcs(`${event.title} — ${coupleNames || 'Wedding'}`)}`,
      `LOCATION:${escapeIcs(event.venue)}`, `DESCRIPTION:${escapeIcs(event.note)}`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${event.title.toLowerCase()}-wedding.ics`; a.click();
    URL.revokeObjectURL(url);
  };
  return <button type="button" className="btn" onClick={add}><CalendarIcon /> Add to calendar</button>;
}
function CalendarIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>; }

function CelebrationCard({ event, index, onPetal, coupleNames }) {
  return <Reveal className="ev" delay={index * .12}>
    <Ornament className={`evsprig ${index % 2 ? 'er' : 'el'}`} src="sprig.webp" />
    <p className="when">{event.date}</p><h3 className="write">{event.title}</h3><p className="time">{event.time}</p><p className="venue">{event.venue}</p><p className="note">{event.note}</p>
    <div className="btns">{event.url && <a className="btn" href={event.url} target="_blank" rel="noreferrer">Venue location</a>}<CalendarButton event={event} coupleNames={coupleNames} /></div>
    <img className="sep" src={asset('images/divider.webp')} alt="" onClick={onPetal} />
  </Reveal>;
}

export default function BloomInvitation({ wedding, guest, familyMembers = [] }) {
  const groomName = wedding?.groom_name || '';
  const brideName = wedding?.bride_name || '';
  const groomFirstName = groomName.trim().split(/\s+/)[0] || '';
  const brideFirstName = brideName.trim().split(/\s+/)[0] || '';
  const coupleNames = `${groomFirstName} & ${brideFirstName}`;
  const events = buildEvents(wedding || {}, guest);
  const mainEvent = events.find(e => e.title === 'Nikkah') || events.find(e => e.title === 'Barat') || events[0];
  const firstEvent = events[0], lastEvent = events[events.length - 1];
  const weddingDateRange = firstEvent ? (
    firstEvent.rawDate === lastEvent.rawDate
      ? formatDate(firstEvent.rawDate, { day: 'numeric', month: 'long', year: 'numeric' })
      : `${formatDate(firstEvent.rawDate, { day: 'numeric', month: 'short' })} – ${formatDate(lastEvent.rawDate, { day: 'numeric', month: 'long', year: 'numeric' })}`
  ) : 'Date to be announced';
  const countdownTarget = mainEvent?.timestamp ?? null;
  const [opened, setOpened] = useState(false);
  const [coverVisible, setCoverVisible] = useState(true);
  const [musicNotice, setMusicNotice] = useState('');
  const [coverOpening, setCoverOpening] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [countdown, setCountdown] = useState([0, 0, 0, 0]);
  const [burstKey, setBurstKey] = useState(0);
  const [rsvpSent, setRsvpSent] = useState(false);
  const [rsvpChoice, setRsvpChoice] = useState(guest?.rsvp_status === 'attending' ? 'yes' : guest?.rsvp_status === 'declined' ? 'no' : '');
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpError, setRsvpError] = useState('');
  const musicRef = useRef(null);
  const videoRef = useRef(null);
  const finishRef = useRef(null);
  const openStartedRef = useRef(false);

  const openInvitation = useCallback(() => {
    if (opened || openStartedRef.current) return;
    openStartedRef.current = true;
    setCoverOpening(true);
    if (videoRef.current) videoRef.current.pause();
    musicRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    finishRef.current = window.setTimeout(() => {
      setOpened(true); document.body.classList.add('go'); document.documentElement.classList.remove('locked');
      window.setTimeout(() => setCoverVisible(false), 1400);
    }, 1200);
  }, [opened]);

  const beginOpen = useCallback(() => {
    if (opened || coverOpening) return;
    setCoverOpening(true);
    musicRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    const video = videoRef.current;
    if (!video) { openInvitation(); return; }
    const fallback = window.setTimeout(openInvitation, 4600);
    video.onended = () => { window.clearTimeout(fallback); openInvitation(); };
    video.play().catch(openInvitation);
  }, [coverOpening, opened, openInvitation]);

  useEffect(() => {
    document.documentElement.classList.add('locked');
    const observer = new IntersectionObserver((items) => items.forEach((item) => { if (item.isIntersecting) { item.target.classList.add('in'); observer.unobserve(item.target); } }), { threshold: .15 });
    document.querySelectorAll('[data-r]').forEach((node) => observer.observe(node));
    const quranObserver = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) { musicRef.current?.pause(); setMusicNotice('Music paused in reverence of the Quranic verse'); }
      else setMusicNotice('');
    }, { threshold: .55 });
    document.querySelectorAll('.inv .script, .closing .dua').forEach((node) => quranObserver.observe(node));
    return () => { observer.disconnect(); quranObserver.disconnect(); window.clearTimeout(finishRef.current); document.documentElement.classList.remove('locked'); document.body.classList.remove('go'); };
  }, []);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, (countdownTarget ?? Date.now()) - Date.now());
      setCountdown([Math.floor(diff / 86400000), Math.floor(diff / 3600000) % 24, Math.floor(diff / 60000) % 60, Math.floor(diff / 1000) % 60]);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [countdownTarget]);

  const toggleMusic = () => {
    const audio = musicRef.current; if (!audio) return;
    if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => {}); else { audio.pause(); setPlaying(false); }
  };
  const submitRsvp = async (event) => {
    event.preventDefault();
    if (rsvpSubmitting) return;
    const form = new FormData(event.currentTarget);
    const attendance = form.get('attendance');
    if (attendance !== 'yes' && attendance !== 'no') { setRsvpError('Please choose an attendance option.'); return; }
    setRsvpSubmitting(true);
    try {
      const result = await submitWeddingRsvpAction({ weddingId: wedding?.id, guestToken: guest?.token, attendance, message: String(form.get('note') || '') });
      if (!result.success) throw new Error(result.error || 'Could not save RSVP');
      setRsvpChoice(attendance);
      setRsvpError(''); setRsvpSent(true); setBurstKey((key) => key + 1);
    } catch (error) { setRsvpError(error instanceof Error ? error.message : 'We could not send your RSVP. Please try again later.'); }
    finally { setRsvpSubmitting(false); }
  };

  const petalBurst = () => setBurstKey((key) => key + 1);

  return <>
    <PetalCanvas enabled={opened} burstKey={burstKey} />
    {coverVisible && <div id="cover" className={`cover ${coverOpening ? 'opening' : ''} ${opened ? 'gone' : ''}`} role="button" tabIndex={0} aria-label="Open the invitation" onClick={beginOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') beginOpen(); }}>
      <div className="cover-stage">{openerVideoUrl
        ? <video ref={videoRef} id="openVideo" className="cover-video" src={openerVideoUrl} poster={asset('images/opener-poster.jpg')} muted playsInline preload="auto" />
        : <img id="openVideo" className="cover-video" src={asset('images/opener-poster.jpg')} alt="" aria-hidden="true" />}</div>
      <span className="bud-halo" aria-hidden="true"><i /><i /></span>
      <div className="cover-title"><p>THE WEDDING OF</p><h2>{coupleNames}</h2></div>
      <p className="cover-hint"><span>TAP THE BUD TO OPEN</span></p>
      <button type="button" className="skip" onClick={(e) => { e.stopPropagation(); openInvitation(); }}>SKIP ›</button>
    </div>}

    <main id="page" className="page" aria-live="polite">
      <section className="hero" id="hero" onClick={() => document.body.classList.add('tapped')}>
        <div className="hang hang-l" onClick={petalBurst}><span className="rs"><img src={asset('images/cluster.webp')} alt="" /></span></div>
        <div className="hang hang-r" onClick={petalBurst}><span className="rs"><img src={asset('images/cluster.webp')} alt="" /></span></div>
        <div className="hero-text">
          <p className="eyebrow">TOGETHER WITH THEIR FAMILIES</p><p className="lead">joyfully invite you to celebrate the wedding of</p>
          <h1 className="names"><span className="n1">{groomFirstName}</span><span className="amp">&amp;</span><span className="n2">{brideFirstName}</span></h1>
          <Divider /><p className="hero-date">{weddingDateRange}</p><p className="hero-place">{mainEvent?.venue || "PAKISTAN"}</p>
        </div>
        <div className="garland gl" onClick={petalBurst}><span className="rs"><img src={asset('images/garland-left.webp')} alt="" /></span></div>
        <div className="garland gr" onClick={petalBurst}><span className="rs"><img src={asset('images/garland-left.webp')} alt="" /></span></div>
        <p className="tap-hint"><span>Tap the flowers</span></p><div className="scroll-cue"><i /></div>
      </section>

      <section className="sec inv" id="invitation">
        <Reveal className="band"><img src={asset('images/garland-band.webp')} alt="" /></Reveal>
        <Reveal className="inv-in">
          <p className="script">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</p><p className="label">{Array.isArray(wedding?.groom_family_members) && wedding.groom_family_members.length ? wedding.groom_family_members.join(" & ") : "Together with their families"}</p>
          <p className="body">request the pleasure of your company<br />at the wedding of</p>{wedding?.groom_image && <img src={wedding.groom_image} alt={`${groomName} portrait`} loading="lazy" style={{ display: 'block', width: 82, height: 82, borderRadius: '50%', objectFit: 'cover', margin: '12px auto 6px', border: '1px solid #d8c7a6' }} />}
          <p className="nm">{groomName}</p><p className="body">&amp;</p>
          {wedding?.bride_image && <img src={wedding.bride_image} alt={`${brideName} portrait`} loading="lazy" style={{ display: 'block', width: 82, height: 82, borderRadius: '50%', objectFit: 'cover', margin: '12px auto 6px', border: '1px solid #d8c7a6' }} />}
          <p className="nm">{brideName}</p>
          <p className="body">Your presence and prayers would make<br />our celebration complete.</p>
        </Reveal>
        <Reveal className="swag"><img src={asset('images/garland-band.webp')} alt="" /></Reveal>
        <Ornament className="corner tl" src="flower.webp" /><Ornament className="corner br" src="flower.webp" />
      </section>

      <section className="sec frame" id="save-date">
        <Reveal><p className="eyebrow">THE MOST SPECIAL DAY</p><h2 className="h2">Save the Date</h2><Divider /><p className="p">Scratch the card to reveal the date</p></Reveal>
        <Reveal className="scard-wrap"><ScratchCard onReveal={petalBurst} event={mainEvent} coupleNames={coupleNames} /></Reveal>
        <Reveal className="btns">{mainEvent && <CalendarButton event={mainEvent} coupleNames={coupleNames} />}</Reveal>
        <Ornament className="corner tr" src="flower.webp" /><Ornament className="corner bl lean" src="sprig.webp" />
      </section>

      <section className="sec frame" id="countdown">
        <Reveal><p className="eyebrow">UNTIL WE SAY QUBOOL HAI</p><h2 className="h2">Counting the days</h2><Divider /></Reveal>
        <Reveal className="cd">{countdown.map((value, i) => <div key={i}><b>{String(value).padStart(2, '0')}</b><span>{['Days', 'Hours', 'Minutes', 'Seconds'][i]}</span></div>)}</Reveal>
        <Ornament className="corner tr" src="flower.webp" /><Ornament className="corner tl" src="flower.webp" />
      </section>

      <section className="sec evsec" id="celebrations">
        <Reveal className="evband"><img src={asset('images/garland-band.webp')} alt="" /></Reveal>
        <div className="arch-wrap"><Reveal className="awning" /><Reveal className="arch"><p className="eyebrow">JOIN US FOR</p><h2 className="h2">The Celebrations</h2><Divider /></Reveal><Ornament className="crown" src="flower.webp" /></div>
        {events.map((event, index) => <CelebrationCard key={event.title} event={event} index={index} onPetal={petalBurst} coupleNames={coupleNames} />)}
        <Ornament className="evsprig el" src="sprig.webp" />
      </section>

      <section className="sec frame" id="rsvp">
        <Reveal><p className="eyebrow">KINDLY RESPOND</p><h2 className="h2">Will you join us?</h2><Divider /></Reveal>
        {rsvpSent ? <div className="thanks">{'Thank you. Your RSVP has been received.'}</div> : <form className="form" onSubmit={submitRsvp}>
          <Reveal className="fld"><label htmlFor="rName">Full name</label><input id="rName" name="name" type="text" autoComplete="name" defaultValue={guest?.name || ""} readOnly required /></Reveal>
          <Reveal className="fld"><span className="lbl">Will you be attending?</span><div className="choice"><label><input type="radio" name="attendance" value="yes" defaultChecked={rsvpChoice === "yes"} required /> Joyfully accepts</label><label><input type="radio" name="attendance" value="no" defaultChecked={rsvpChoice === "no"} /> Regretfully declines</label></div></Reveal>
          <Reveal className="fld"><label htmlFor="rNote">Message (optional)</label><textarea id="rNote" name="note" /></Reveal>
          {rsvpError && <p className="err" style={{ display: 'block' }}>{rsvpError}</p>}<button type="submit" className="btn solid" disabled={rsvpSubmitting}>{rsvpSubmitting ? "Sending..." : "Send RSVP"}</button>
        </form>}
        <Ornament className="corner tr" src="flower.webp" /><Ornament className="corner bl lean" src="sprig.webp" />
      </section>

      <section className="sec closing">
        <Reveal className="swag2"><img src={asset('images/garland-band.webp')} alt="" /></Reveal>
        <Reveal><p className="dua">بَارَكَ اللَّهُ لَكَ، وَبَارَكَ عَلَيْكَ، وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ</p><p className="line">We look forward to celebrating with you</p><p className="cn">{coupleNames}</p></Reveal>
        <Reveal className="mini"><img src={asset('images/divider.webp')} alt="" /></Reveal>
      </section>
    </main>

    <button type="button" className={`music ${playing ? 'playing' : ''}`} id="musicBtn" aria-label={playing ? 'Pause background music' : 'Play background music'} onClick={toggleMusic}><span aria-hidden="true">{playing ? '♫' : '♪'}</span></button>
    <audio ref={musicRef} id="music" src={asset('audio/music.mp3')} preload="none" loop onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    {musicNotice && <div className="qq-note" aria-live="polite">{musicNotice}</div>}
  </>;
}