'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Home, Lock, TrendingUp, Building, ArrowRight } from 'lucide-react';
import { Nav } from '@/components/buyer/Nav';
import { InterviewQuestion } from '@/components/buyer/InterviewQuestion';
import { useBuyerProfile } from '@/hooks/useBuyerProfile';

export default function InterviewPage() {
  const router = useRouter();
  const { profile, updateProfile } = useBuyerProfile();
  const [step, setStep] = useState(1);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/profile-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const { summary } = await res.json();
      updateProfile({ summary, isPartial: false });
    } catch {
      updateProfile({ summary: 'Your parameters are set. We will navigate your timeline and budget constraints together.', isPartial: false });
    }
    setIsSynthesizing(false);
    router.push('/review');
  };

  if (['Rent', 'Sell', 'Own'].includes(profile.mode)) {
    return (
      <div className="min-h-screen bg-[#0D0D0B]">
        <Nav isAuthenticated={false} />
        <div className="text-center py-24 max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl mb-4 text-[#F0EDE8] italic leading-relaxed">
            Renter/Seller guidance — arriving Q3.
          </h2>
          <p className="text-[#A8A49E] font-light mb-8">
            We are currently focused exclusively on optimizing the NYC buying experience.
          </p>
          <button
            onClick={() => updateProfile({ mode: '' })}
            className="text-[#6E6A65] text-[10px] font-bold uppercase tracking-widest hover:text-[#F0EDE8] transition-colors"
          >
            ← Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0B]">
      <Nav isAuthenticated={false} />
      <div className="flex flex-col w-full max-w-3xl mx-auto min-h-[90vh] px-6 py-12 md:py-24 relative">
        {/* Progress bar */}
        {step <= 5 && !isSynthesizing && profile.mode === 'Buy' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-[#2A2A27] overflow-hidden">
            <div
              className="h-full bg-[#C8B89A] transition-all duration-500 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}

        {isSynthesizing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center flex-1 text-center"
          >
            <div className="flex gap-2 mb-8">
              {[0, 0.2, 0.4].map(delay => (
                <div
                  key={delay}
                  className="w-3 h-3 bg-[#C8B89A] rounded-full animate-pulse"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
            <h3 className="font-serif text-3xl text-[#F0EDE8] italic">
              We found some things worth discussing.
            </h3>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col justify-center w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && (
                  <InterviewQuestion
                    question="what are we doing today?"
                    options={[
                      { label: 'I want to buy', subtext: 'First time or returning, let\'s map it', icon: Home, value: 'Buy' },
                      { label: 'I need to rent', subtext: 'Find the right place without the usual chaos', icon: Lock, value: 'Rent' },
                      { label: 'I\'m selling', subtext: 'Price it right, time it right', icon: TrendingUp, value: 'Sell' },
                      { label: 'I own property', subtext: 'Portfolio, tenants, income', icon: Building, value: 'Own' },
                    ]}
                    onSelect={val => {
                      updateProfile({ mode: val as any });
                      if (val === 'Buy') setStep(2);
                    }}
                  />
                )}

                {step === 2 && (
                  <InterviewQuestion
                    question="how soon does this need to happen?"
                    options={[
                      { label: 'I needed to start yesterday', value: 'Immediate' },
                      { label: '3–6 months', subtext: 'real but not panicked', value: '3-6 months' },
                      { label: '6–12 months', subtext: 'being strategic', value: '6-12 months' },
                      { label: 'Whenever the right place appears', value: 'Flexible' },
                    ]}
                    selectedValue={profile.timeline}
                    onSelect={val => updateProfile({ timeline: val })}
                    sayMoreLabel="What's driving the timing?"
                    sayMoreValue={profile.timelineContext}
                    onSayMoreChange={val => updateProfile({ timelineContext: val })}
                    onContinue={() => setStep(3)}
                  />
                )}

                {step === 3 && (
                  <InterviewQuestion
                    question="what's your ceiling — the number where you stop looking?"
                    options={[
                      { label: 'Under $750K', value: 'Under $750K' },
                      { label: '$750K – $1.2M', value: '$750K – $1.2M' },
                      { label: '$1.2M – $2M', value: '$1.2M – $2M' },
                      { label: '$2M – $3.5M', value: '$2M – $3.5M' },
                      { label: '$3.5M+', value: '$3.5M+' },
                    ]}
                    selectedValue={profile.budgetTier}
                    onSelect={val => updateProfile({ budgetTier: val })}
                    sayMoreLabel="Pre-approved, or still figuring it out?"
                    sayMoreValue={profile.budgetContext}
                    onSayMoreChange={val => updateProfile({ budgetContext: val })}
                    onContinue={() => setStep(3.5)}
                  />
                )}

                {step === 3.5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center py-12"
                  >
                    <h3 className="text-[#A8956E] text-[10px] tracking-[0.25em] uppercase font-bold mb-6">
                      you're halfway there.
                    </h3>
                    <p className="text-xl text-[#F0EDE8] font-light leading-relaxed mb-12 max-w-md italic font-serif">
                      We have enough to start building your profile. Want to keep going or save this and come back?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                      <button
                        onClick={() => setStep(4)}
                        className="flex-1 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => { updateProfile({ isPartial: true }); router.push('/dashboard'); }}
                        className="flex-1 py-4 bg-transparent border border-[#2A2A27] text-[#A8A49E] font-bold text-[10px] uppercase tracking-widest hover:border-[#A8956E] hover:text-[#F0EDE8] transition-all"
                      >
                        Save & Come Back Later
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <InterviewQuestion
                    question="where are you searching?"
                    multiSelect
                    options={[
                      { label: 'Park Slope', value: 'Park Slope' },
                      { label: 'Carroll Gardens / Cobble Hill', value: 'Carroll Gardens / Cobble Hill' },
                      { label: 'West Village / Greenwich', value: 'West Village / Greenwich' },
                      { label: 'Upper West / Upper East', value: 'Upper West / Upper East' },
                      { label: 'Williamsburg / Greenpoint', value: 'Williamsburg / Greenpoint' },
                      { label: 'Prospect Heights / Crown Heights', value: 'Prospect Heights / Crown Heights' },
                      { label: 'Astoria / LIC', value: 'Astoria / LIC' },
                      { label: "I'm open — help me figure it out", value: 'Open' },
                    ]}
                    selectedValue={profile.territory}
                    onSelect={val => {
                      const current = profile.territory || [];
                      if (val === 'Open') updateProfile({ territory: ['Open'] });
                      else {
                        const next = current.includes(val)
                          ? current.filter(x => x !== val)
                          : [...current.filter(x => x !== 'Open'), val];
                        updateProfile({ territory: next });
                      }
                    }}
                    onContinue={() => setStep(5)}
                    continueDisabled={!profile.territory || profile.territory.length === 0}
                  />
                )}

                {step === 5 && (
                  <InterviewQuestion
                    question="what's keeping you up about this?"
                    options={[
                      { label: 'Moving too slow and missing the right place', value: 'Missing out' },
                      { label: 'Overpaying in a market I don\'t understand', value: 'Overpaying' },
                      { label: 'Co-op board rejection', value: 'Board rejection' },
                      { label: "Realizing I can't afford what I actually want", value: 'Affordability reality check' },
                      { label: "I don't know enough to know what I'm afraid of", value: 'General uncertainty' },
                    ]}
                    selectedValue={profile.fear}
                    onSelect={val => updateProfile({ fear: val })}
                    sayMoreLabel="Anything else on your mind?"
                    sayMoreValue={profile.fearContext}
                    onSayMoreChange={val => updateProfile({ fearContext: val })}
                    onContinue={handleSynthesize}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
