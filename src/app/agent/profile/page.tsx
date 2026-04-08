'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { TerritoryPicker } from '@/components/buyer/TerritoryPicker';
import { cn } from '@/lib/utils';

const EXP_OPTIONS: { label: string; value: number }[] = [
  { label: '< 2 yrs', value: 1 },
  { label: '2–5 yrs', value: 3 },
  { label: '5–10 yrs', value: 7 },
  { label: '10–20 yrs', value: 15 },
  { label: '20+ yrs', value: 25 },
];

type SaveState = 'idle' | 'saving' | 'saved';

export default function AgentProfilePage() {
  const router = useRouter();
  const { agentProfile, loading, saveStep, uploadHeadshot } = useAgentProfile();

  // Local form state
  const [phone, setPhone] = useState('');
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number | null>(null);
  const [marketFocus, setMarketFocus] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed form from loaded profile
  useEffect(() => {
    if (!agentProfile) return;
    setPhone(agentProfile.phone);
    setHeadshotUrl(agentProfile.headshotUrl);
    setLicenseNumber(agentProfile.licenseNumber);
    setBrokerageName(agentProfile.brokerageName);
    setYearsExperience(agentProfile.yearsExperience);
    setMarketFocus(agentProfile.marketFocus);
    setBio(agentProfile.bio);
  }, [agentProfile]);

  // Debounced auto-save
  const triggerSave = useCallback((data: Parameters<typeof saveStep>[0]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState('saving');
    debounceRef.current = setTimeout(async () => {
      try {
        await saveStep(data);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('idle');
      }
    }, 1000);
  }, [saveStep]);

  async function handleHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeadshotPreview(URL.createObjectURL(file));
    setUploadError(null);
    try {
      const url = await uploadHeadshot(file);
      setHeadshotUrl(url);
      setHeadshotPreview(null);
      triggerSave({ headshotUrl: url });
    } catch {
      setHeadshotPreview(null);
      setUploadError('Photo upload failed — please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0D0D0B] flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 0.2, 0.4].map(d => (
            <div key={d} className="w-2 h-2 bg-[#C8B89A] rounded-full animate-pulse" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0D0D0B]">

      {/* Nav */}
      <nav className="sticky top-0 bg-[#0D0D0B]/95 backdrop-blur-sm border-b border-[#2A2A27] flex items-center justify-between px-8 py-5 z-40">
        <button
          type="button"
          onClick={() => router.push('/agent')}
          className="flex items-center gap-2 text-[#6E6A65] text-[10px] font-bold uppercase tracking-[0.2em] hover:text-[#F0EDE8] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Dashboard
        </button>

        <span className="font-serif italic text-[20px] text-[#C8B89A] tracking-tight absolute left-1/2 -translate-x-1/2">
          homey.
        </span>

        <div className="flex items-center gap-2 min-w-[80px] justify-end">
          {saveState === 'saving' && (
            <span className="text-[10px] text-[#6E6A65] uppercase tracking-widest animate-pulse">Saving…</span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#4A7C59] uppercase tracking-widest">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
      </nav>

      {/* Page content */}
      <div className="max-w-[600px] mx-auto px-6 py-16 lg:py-24">

        <h1 className="font-serif italic text-[#F0EDE8] mb-16" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
          Your profile.
        </h1>

        {/* ── SECTION: Identity ── */}
        <section className="mb-16 pb-16 border-b border-[#2A2A27]">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-8">
            Identity
          </p>

          {/* Headshot */}
          <div className="mb-8">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">Photo</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 border border-[#2A2A27] hover:border-[#6E6A65] transition-colors overflow-hidden group"
            >
              {(headshotPreview || headshotUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headshotPreview ?? headshotUrl!}
                  alt="Your headshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#141412] group-hover:bg-[#1A1A17] transition-colors">
                  <Camera className="w-5 h-5 text-[#3A3A37] group-hover:text-[#6E6A65] transition-colors" />
                  <span className="text-[8px] text-[#3A3A37] group-hover:text-[#6E6A65] uppercase tracking-widest transition-colors">Add</span>
                </div>
              )}
              {(headshotPreview || headshotUrl) && (
                <div className="absolute inset-0 bg-[#0D0D0B]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-4 h-4 text-[#F0EDE8]" />
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeadshotChange} />
            {uploadError && <p className="mt-2 text-[11px] text-[#8B3A3A]">{uploadError}</p>}
          </div>

          {/* Phone */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">Phone</p>
            <input
              type="tel"
              placeholder="(212) 555-0100"
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
                triggerSave({ phone: e.target.value });
              }}
              autoComplete="tel"
              className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[22px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
            />
          </div>
        </section>

        {/* ── SECTION: Credentials ── */}
        <section className="mb-16 pb-16 border-b border-[#2A2A27]">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-8">
            Credentials
          </p>

          <div className="mb-8">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">License number</p>
            <input
              type="text"
              placeholder="NY-XXXXXXXX"
              value={licenseNumber}
              onChange={e => {
                setLicenseNumber(e.target.value);
                triggerSave({ licenseNumber: e.target.value });
              }}
              className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[22px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
            />
          </div>

          <div className="mb-10">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">Brokerage</p>
            <input
              type="text"
              placeholder="Compass, Corcoran, Independent…"
              value={brokerageName}
              onChange={e => {
                setBrokerageName(e.target.value);
                triggerSave({ brokerageName: e.target.value });
              }}
              className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[22px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
            />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">Years in the industry</p>
            <div className="flex flex-wrap gap-2">
              {EXP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setYearsExperience(opt.value);
                    triggerSave({ yearsExperience: opt.value });
                  }}
                  className={cn(
                    'px-4 py-3 text-[11px] font-bold uppercase tracking-[0.15em] border transition-all duration-200',
                    yearsExperience === opt.value
                      ? 'border-[#C8B89A] text-[#C8B89A] bg-[#C8B89A]/5'
                      : 'border-[#2A2A27] text-[#6E6A65] hover:border-[#6E6A65] hover:text-[#A8A49E]',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION: Market Focus ── */}
        <section className="mb-16 pb-16 border-b border-[#2A2A27]">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-2">
            Market focus
          </p>
          <p className="text-[#6E6A65] text-sm mb-8">The neighborhoods you cover.</p>

          <div className="[&_h2]:hidden [&>div>div:first-child>p]:hidden">
            <TerritoryPicker
              territory={marketFocus}
              onUpdate={next => {
                setMarketFocus(next);
                triggerSave({ marketFocus: next });
              }}
              onContinue={() => {/* handled by auto-save */}}
            />
          </div>
        </section>

        {/* ── SECTION: Bio ── */}
        <section className="mb-24">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-2">
            Bio
          </p>
          <p className="text-[#6E6A65] text-sm mb-8">Your pitch to buyers. 500 characters max.</p>

          <div className="relative">
            <textarea
              placeholder="How do you work with buyers? What sets you apart?"
              value={bio}
              onChange={e => {
                if (e.target.value.length > 500) return;
                setBio(e.target.value);
                triggerSave({ bio: e.target.value });
              }}
              rows={5}
              className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[18px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors resize-none leading-relaxed"
            />
            <span className={cn(
              'absolute bottom-4 right-0 text-[10px] tabular-nums transition-colors',
              bio.length >= 450 ? 'text-[#A8956E]' : 'text-[#3A3A37]',
            )}>
              {bio.length}/500
            </span>
          </div>
        </section>

      </div>
    </div>
  );
}
