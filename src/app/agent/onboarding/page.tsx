'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Camera } from 'lucide-react';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useAuth } from '@/contexts/auth-context';
import { TerritoryPicker } from '@/components/buyer/TerritoryPicker';
import { cn } from '@/lib/utils';

// ─── ANIMATION ───────────────────────────────────────────────────────────────

const stepVariants = {
  enter:  { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit:   { opacity: 0, x: -60 },
};

// ─── EXPERIENCE OPTIONS ──────────────────────────────────────────────────────

const EXP_OPTIONS: { label: string; value: number }[] = [
  { label: '< 2 yrs', value: 1 },
  { label: '2–5 yrs', value: 3 },
  { label: '5–10 yrs', value: 7 },
  { label: '10–20 yrs', value: 15 },
  { label: '20+ yrs', value: 25 },
];

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

function ContinueBtn({
  disabled,
  onClick,
  label = 'Continue',
}: {
  disabled: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'mt-12 flex items-center gap-3 text-[#F0EDE8] group transition-all duration-300',
        'text-[11px] font-bold uppercase tracking-[0.2em]',
        'disabled:opacity-20 disabled:cursor-default',
      )}
    >
      <span className="border-b border-[#F0EDE8]/30 group-hover:border-[#F0EDE8] pb-1 transition-all">
        {label}
      </span>
      <ArrowRight className="w-3.5 h-3.5 translate-y-[-1px] group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

function SkipBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6E6A65] hover:text-[#A8A49E] transition-colors"
    >
      Skip for now
    </button>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 transition-all duration-300',
            i < current ? 'bg-[#C8B89A]' : 'bg-[#2A2A27]',
          )}
        />
      ))}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function AgentOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { agentProfile, loading, saveStep, uploadHeadshot } = useAgentProfile();

  // Step state
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [licenseNumber, setLicenseNumber] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number | null>(null);

  // Step 3 state
  const [marketFocus, setMarketFocus] = useState<string[]>([]);

  // Step 4 state
  const [bio, setBio] = useState('');

  // Redirect if already done, resume if partial
  useEffect(() => {
    if (loading || !agentProfile) return;
    if (agentProfile.onboardingCompleted) {
      router.replace('/agent');
      return;
    }
    // Pre-fill from partial save
    if (agentProfile.phone) setPhone(agentProfile.phone);
    if (agentProfile.licenseNumber) setLicenseNumber(agentProfile.licenseNumber);
    if (agentProfile.brokerageName) setBrokerageName(agentProfile.brokerageName);
    if (agentProfile.yearsExperience) setYearsExperience(agentProfile.yearsExperience);
    if (agentProfile.marketFocus.length) setMarketFocus(agentProfile.marketFocus);
    if (agentProfile.bio) setBio(agentProfile.bio);

    // Resume at correct step
    if (agentProfile.phone && !agentProfile.licenseNumber) setStep(2);
  }, [loading, agentProfile, router]);

  // Pre-fill name from profiles table if available
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    }
  }, [user]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeadshotFile(file);
    setHeadshotPreview(URL.createObjectURL(file));
  }

  async function handleStep1Continue() {
    setSaving(true);
    setError(null);
    try {
      let headshotUrl: string | undefined;
      if (headshotFile) {
        headshotUrl = await uploadHeadshot(headshotFile);
      }
      await saveStep({ phone, ...(headshotUrl ? { headshotUrl } : {}) });
      setStep(2);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStep2Continue() {
    setSaving(true);
    setError(null);
    try {
      await saveStep({
        licenseNumber,
        brokerageName,
        yearsExperience,
        onboardingCompleted: true,
      });
      setStep(3);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStep2Skip() {
    router.replace('/agent');
  }

  async function handleStep3Continue() {
    setSaving(true);
    try {
      await saveStep({ marketFocus });
    } catch { /* non-fatal */ }
    finally { setSaving(false); }
    setStep(4);
  }

  async function handleStep4Continue() {
    setSaving(true);
    try {
      await saveStep({ bio });
    } catch { /* non-fatal */ }
    finally { setSaving(false); }
    router.replace('/agent');
  }

  const step1Valid = name.trim().length >= 2 && phone.trim().length >= 7;
  const step2Valid = licenseNumber.trim().length >= 2 && brokerageName.trim().length >= 2 && yearsExperience !== null;

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
    <div className="min-h-dvh bg-[#0D0D0B] overflow-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 flex items-center justify-between px-10 py-8 z-40">
        <button
          type="button"
          onClick={() => step > 1 ? setStep(s => s - 1) : undefined}
          style={{ visibility: step > 1 ? 'visible' : 'hidden' }}
          className="flex items-center gap-2 text-[#6E6A65] text-[10px] font-bold uppercase tracking-[0.2em] hover:text-[#F0EDE8] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
        <span className="font-serif italic text-[24px] text-[#C8B89A] tracking-tight absolute left-1/2 -translate-x-1/2">
          homey.
        </span>
        <StepDots total={4} current={step} />
      </nav>

      {/* Content */}
      <main className="flex items-center justify-center min-h-dvh px-6 py-24 lg:px-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[480px] flex flex-col pt-20 pb-20"
          >

            {/* ── STEP 1: PERSONAL ── */}
            {step === 1 && (
              <>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-6">
                  Step 1 of 4
                </p>
                <h1
                  className="font-serif italic text-[#F0EDE8] leading-snug mb-12"
                  style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}
                >
                  Let's build your professional identity.
                </h1>

                {/* Headshot */}
                <div className="mb-10">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">
                    Photo <span className="text-[#3A3A37]">— optional</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 border border-[#2A2A27] hover:border-[#6E6A65] transition-colors overflow-hidden group"
                  >
                    {headshotPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={headshotPreview} alt="Headshot preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#141412] group-hover:bg-[#1A1A17] transition-colors">
                        <Camera className="w-5 h-5 text-[#3A3A37] group-hover:text-[#6E6A65] transition-colors" />
                      </div>
                    )}
                    {headshotPreview && (
                      <div className="absolute inset-0 bg-[#0D0D0B]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-4 h-4 text-[#F0EDE8]" />
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Name */}
                <div className="mb-8">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">
                    Full name
                  </p>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                    className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[26px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
                  />
                </div>

                {/* Phone */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">
                    Phone
                  </p>
                  <input
                    type="tel"
                    placeholder="(212) 555-0100"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && step1Valid && !saving && handleStep1Continue()}
                    autoComplete="tel"
                    className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[26px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
                  />
                </div>

                {error && (
                  <p className="mt-4 text-[11px] text-[#8B3A3A] tracking-wide">{error}</p>
                )}

                <ContinueBtn
                  disabled={!step1Valid || saving}
                  onClick={handleStep1Continue}
                  label={saving ? 'Saving…' : 'Continue'}
                />
              </>
            )}

            {/* ── STEP 2: CREDENTIALS ── */}
            {step === 2 && (
              <>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-6">
                  Step 2 of 4
                </p>
                <h2
                  className="font-serif italic text-[#F0EDE8] leading-snug mb-12"
                  style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}
                >
                  Your credentials.
                </h2>

                {/* License */}
                <div className="mb-8">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">
                    License number
                  </p>
                  <input
                    type="text"
                    autoFocus
                    placeholder="NY-XXXXXXXX"
                    value={licenseNumber}
                    onChange={e => setLicenseNumber(e.target.value)}
                    className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[26px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
                  />
                </div>

                {/* Brokerage */}
                <div className="mb-10">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">
                    Brokerage
                  </p>
                  <input
                    type="text"
                    placeholder="Compass, Corcoran, Independent…"
                    value={brokerageName}
                    onChange={e => setBrokerageName(e.target.value)}
                    className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[26px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
                  />
                </div>

                {/* Years of experience */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6E6A65] mb-4">
                    Years in the industry
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXP_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setYearsExperience(opt.value)}
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

                {error && (
                  <p className="mt-4 text-[11px] text-[#8B3A3A] tracking-wide">{error}</p>
                )}

                <ContinueBtn
                  disabled={!step2Valid || saving}
                  onClick={handleStep2Continue}
                  label={saving ? 'Saving…' : 'Continue'}
                />

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleStep2Skip}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6E6A65] hover:text-[#A8A49E] transition-colors"
                  >
                    Skip optional steps — go to dashboard
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: MARKET FOCUS ── */}
            {step === 3 && (
              <>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-6">
                  Step 3 of 4 — optional
                </p>
                <h2
                  className="font-serif italic text-[#F0EDE8] leading-snug mb-4"
                  style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}
                >
                  Where do you work?
                </h2>
                <p className="text-[#6E6A65] text-sm mb-10">
                  The neighborhoods you cover. Buyers will see this when reviewing your profile.
                </p>

                {/* Reuse TerritoryPicker but hide its own header */}
                <div className="[&_h2]:hidden [&>div>div:first-child>p]:hidden">
                  <TerritoryPicker
                    territory={marketFocus}
                    onUpdate={setMarketFocus}
                    onContinue={handleStep3Continue}
                    onBack={() => setStep(2)}
                  />
                </div>

                <ContinueBtn
                  disabled={saving}
                  onClick={handleStep3Continue}
                  label={saving ? 'Saving…' : marketFocus.length > 0 ? 'Continue' : 'Continue'}
                />
                <SkipBtn onClick={() => setStep(4)} />
              </>
            )}

            {/* ── STEP 4: BIO ── */}
            {step === 4 && (
              <>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8956E] mb-6">
                  Step 4 of 4 — optional
                </p>
                <h2
                  className="font-serif italic text-[#F0EDE8] leading-snug mb-4"
                  style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}
                >
                  Your pitch.
                </h2>
                <p className="text-[#6E6A65] text-sm mb-10">
                  Shown to buyers when they review your profile. Keep it sharp.
                </p>

                <div className="relative">
                  <textarea
                    autoFocus
                    placeholder="How do you work with buyers? What sets you apart?"
                    value={bio}
                    onChange={e => {
                      if (e.target.value.length <= 500) setBio(e.target.value);
                    }}
                    rows={5}
                    className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[18px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors resize-none leading-relaxed"
                  />
                  <span className="absolute bottom-4 right-0 text-[10px] text-[#3A3A37] tabular-nums">
                    {bio.length}/500
                  </span>
                </div>

                <ContinueBtn
                  disabled={saving}
                  onClick={handleStep4Continue}
                  label={saving ? 'Finishing…' : bio.trim().length > 0 ? 'Finish setup' : 'Finish setup'}
                />
                <SkipBtn onClick={() => router.replace('/agent')} />
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
