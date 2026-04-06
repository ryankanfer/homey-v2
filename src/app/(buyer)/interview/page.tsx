'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Lock, TrendingUp, Building, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { Nav } from '@/components/buyer/Nav';
import { InterviewQuestion } from '@/components/buyer/InterviewQuestion';
import { TerritoryPicker } from '@/components/buyer/TerritoryPicker';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

function RefCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && typeof window !== 'undefined') {
      sessionStorage.setItem('homey_agent_ref', ref);
    }
  }, [searchParams]);
  return null;
}

export default function InterviewPage() {
    const router = useRouter();
    const { profile, updateProfile } = useProfile();
    const [step, setStep] = useState(1);
    const [isSynthesizing, setIsSynthesizing] = useState(false);

    const handleSynthesize = async () => {
        setIsSynthesizing(true);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const res = await fetch('/api/profile-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
                signal: controller.signal,
            });
            const { summary } = await res.json();
            updateProfile({ summary, isPartial: false });
        } catch {
            updateProfile({ summary: 'Your parameters are set. We will navigate your timeline and budget constraints together.', isPartial: false });
        } finally {
            clearTimeout(timeout);
        }
        setIsSynthesizing(false);
        router.push('/review');
    };

    if (['Sell', 'Own'].includes(profile.mode)) {
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
            <Suspense fallback={null}>
                <RefCapture />
            </Suspense>
            <Nav isAuthenticated={false} warnBeforeLeave={step > 1 && !isSynthesizing} />
            <div className="flex flex-col w-full max-w-3xl mx-auto min-h-[90vh] px-6 py-12 md:py-24 relative">
                {/* Progress bar */}
                {step <= 6 && !isSynthesizing && (profile.mode === 'Buy' || profile.mode === 'Rent') && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#2A2A27] overflow-hidden">
                        <div
                            className="h-full bg-[#C8B89A] transition-all duration-500 ease-out"
                            style={{ width: `${(step / 6) * 100}%` }}
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
                                className="w-full flex-1 flex flex-col"
                            >
                                {step === 1 && (
                                    <InterviewQuestion
                                        question="What are we looking for?"
                                        options={[
                                            { label: 'I want to buy', subtext: 'First time or pro, let\'s map it', icon: Home, value: 'Buy' },
                                            { label: 'I need to rent', subtext: 'Find the right place without the usual chaos', icon: Lock, value: 'Rent' },
                                            { label: 'I\'m selling', subtext: 'Price it right, time it right', icon: TrendingUp, value: 'Sell' },
                                            { label: 'I own property', subtext: 'Portfolio, tenants, income', icon: Building, value: 'Own' },
                                        ]}
                                        onSelect={val => {
                                            updateProfile({ mode: val as any });
                                            if (val === 'Buy' || val === 'Rent') setStep(2);
                                        }}
                                    />
                                )}

                                {step === 2 && (
                                    <InterviewQuestion
                                        question={profile.mode === 'Rent' ? "when do you need to move in?" : "How soon does this need to happen?"}
                                        options={profile.mode === 'Rent' ? [
                                            { label: 'ASAP', subtext: 'Ready to sign today', value: 'ASAP' },
                                            { label: '15–30 days', value: '15-30 days' },
                                            { label: '30–60 days', subtext: 'standard lease break', value: '30-60 days' },
                                            { label: 'Flexible', value: 'Flexible' }
                                        ] : [
                                            { label: 'I needed to start yesterday', value: 'Immediate' },
                                            { label: '3–6 months', subtext: 'real but not panicked', value: '3-6 months' },
                                            { label: '6–12 months', subtext: 'being strategic', value: '6-12 months' },
                                            { label: 'Whenever the right place appears', value: 'Flexible' },
                                        ]}
                                        selectedValue={profile.timeline}
                                        onSelect={val => updateProfile({ timeline: val })}
                                        sayMoreLabel={profile.mode === 'Rent' ? 'Are you constrained by a current lease?' : "What's driving the timing?"}
                                        sayMoreValue={profile.timelineContext}
                                        onSayMoreChange={val => updateProfile({ timelineContext: val })}
                                        onContinue={() => setStep(3)}
                                        hasSelectionOverride={profile.mode === 'Rent' ? !!(profile.timeline || profile.moveInDate) : !!profile.timeline}
                                    >
                                        {profile.mode === 'Rent' && (
                                            <div className="w-full max-w-lg mx-auto mb-6 flex flex-col items-center">
                                                <label className="text-[10px] text-[#A8956E] uppercase tracking-widest font-bold mb-2 w-full text-left">
                                                    Exact Move-in Date (Optional)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={profile.moveInDate || ''}
                                                    onChange={(e) => updateProfile({ moveInDate: e.target.value })}
                                                    className="w-full bg-[#1A1A17]/30 border border-[#2A2A27] text-[#F0EDE8] p-4 rounded-sm outline-none focus:border-[#C8B89A] transition-colors appearance-none [&::-webkit-calendar-picker-indicator]:invert-[.8]"
                                                />
                                                <div className="text-xs text-[#6E6A65] mt-4 uppercase tracking-widest font-bold">— or choose a flexible window —</div>
                                            </div>
                                        )}
                                    </InterviewQuestion>
                                )}

                                {step === 3 && profile.mode === 'Rent' && (
                                    <InterviewQuestion
                                        question="what's your absolute maximum monthly rent?"
                                        onSelect={() => { }}
                                        hasSelectionOverride={!!profile.maxMonthlyRent && profile.maxMonthlyRent >= 1000}
                                        onContinue={() => setStep(3.1)}
                                        sayMoreLabel="Guarantors or DTI constraints?"
                                        sayMoreValue={profile.budgetContext}
                                        onSayMoreChange={val => updateProfile({ budgetContext: val })}
                                    >
                                        <div className="w-full max-w-lg mx-auto flex flex-col mb-8 gap-4">
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8956E] text-xl font-serif">$</span>
                                                <input
                                                    type="number"
                                                    placeholder="4500"
                                                    value={profile.maxMonthlyRent || ''}
                                                    onChange={(e) => updateProfile({ maxMonthlyRent: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="w-full bg-[#1A1A17]/30 border border-[#2A2A27] text-[#F0EDE8] p-4 pl-8 rounded-sm outline-none focus:border-[#C8B89A] transition-colors text-xl font-serif"
                                                />
                                            </div>
                                        </div>
                                    </InterviewQuestion>
                                )}

                                {step === 3 && profile.mode !== 'Rent' && (
                                    <InterviewQuestion
                                        question="what's your ceiling — the number where you stop looking?"
                                        onSelect={() => { }}
                                        hasSelectionOverride={!!profile.budgetTier}
                                        onContinue={() => setStep(3.5)}
                                        sayMoreLabel="Pre-approved, or still figuring it out?"
                                        sayMoreValue={profile.budgetContext}
                                        onSayMoreChange={val => updateProfile({ budgetContext: val })}
                                    >
                                        <div className="w-full max-w-lg mx-auto flex flex-col mb-12 gap-8">
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8956E] text-2xl font-serif">$</span>
                                                <input
                                                    type="text"
                                                    placeholder="Your high ceiling (e.g. 1,500,000)"
                                                    value={profile.budgetTier || ''}
                                                    onChange={(e) => {
                                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                                      if (val) {
                                                        const num = parseInt(val);
                                                        updateProfile({ budgetTier: `$${num.toLocaleString()}` });
                                                      } else {
                                                        updateProfile({ budgetTier: '' });
                                                      }
                                                    }}
                                                    className="w-full bg-[#1A1A17]/30 border border-[#2A2A27] text-[#F0EDE8] p-6 pl-10 rounded-sm outline-none focus:border-[#C8B89A] transition-colors text-2xl font-serif"
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                               {['$750K', '$1.2M', '$2M', '$3.5M'].map(t => (
                                                 <button 
                                                    key={t}
                                                    onClick={() => updateProfile({ budgetTier: t })}
                                                    className={cn(
                                                      "py-3 border text-[10px] font-bold uppercase tracking-widest transition-all",
                                                      profile.budgetTier === t ? "bg-[#C8B89A] border-[#C8B89A] text-[#0D0D0B]" : "bg-transparent border-[#2A2A27] text-[#6E6A65] hover:border-[#C8B89A]/40"
                                                    )}
                                                 >
                                                   {t}
                                                 </button>
                                               ))}
                                            </div>
                                        </div>
                                    </InterviewQuestion>
                                )}

                                {step === 3.1 && profile.mode === 'Rent' && (
                                    <InterviewQuestion
                                        question={`Does your household income meet $${((profile.maxMonthlyRent || 0) * 40).toLocaleString()} per year?`}
                                        onSelect={(val) => {
                                            updateProfile({ meetsIncomeRequirement: val === 'Yes' });
                                            if (val === 'Yes') {
                                                setStep(3.5);
                                            } else {
                                                setStep(3.2);
                                            }
                                        }}
                                        options={[
                                            { label: 'Yes, we meet this', subtext: 'Ready for standard landlord verification', value: 'Yes' },
                                            { label: 'No, we don\'t', subtext: 'Will need alternative guarantee', value: 'No' },
                                        ]}
                                        selectedValue={profile.meetsIncomeRequirement === true ? 'Yes' : profile.meetsIncomeRequirement === false ? 'No' : undefined}
                                        hasSelectionOverride={profile.meetsIncomeRequirement !== undefined}
                                    >
                                        <div className="w-full max-w-lg mx-auto mb-8 bg-[#1A1A17]/50 border border-[#2A2A27] p-4 text-center rounded-sm">
                                            <p className="text-[#A8A49E] text-sm">
                                                In NYC, landlords strictly enforce the <span className="text-[#C8B89A]">40x Rule</span>. To qualify for ${profile.maxMonthlyRent?.toLocaleString()}/mo, your combined annual gross income must be roughly 40 times the rent.
                                            </p>
                                        </div>
                                    </InterviewQuestion>
                                )}

                                {step === 3.2 && profile.mode === 'Rent' && (
                                    <InterviewQuestion
                                        question={`Will you be using a guarantor who earns over $${((profile.maxMonthlyRent || 0) * 80).toLocaleString()} per year?`}
                                        onSelect={(val) => {
                                            updateProfile({ usingGuarantor: val === 'Yes' });
                                            setStep(3.5);
                                        }}
                                        options={[
                                            { label: 'Yes, I have a guarantor', value: 'Yes' },
                                            { label: 'No, looking for alternatives', subtext: 'Third-party guarantors (e.g., Insurent)', value: 'No' },
                                        ]}
                                        selectedValue={profile.usingGuarantor === true ? 'Yes' : profile.usingGuarantor === false ? 'No' : undefined}
                                        hasSelectionOverride={profile.usingGuarantor !== undefined}
                                    >
                                        <div className="w-full max-w-lg mx-auto mb-8 bg-[#1A1A17]/50 border border-[#2A2A27] p-4 text-center rounded-sm">
                                            <p className="text-[#A8A49E] text-sm">
                                                When renters fall short of the 40x rule, landlords require a guarantor who earns <span className="text-[#C8B89A]">80x the monthly rent</span>.
                                            </p>
                                        </div>
                                    </InterviewQuestion>
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
                                    <TerritoryPicker
                                        territory={profile.territory || []}
                                        onUpdate={(t) => updateProfile({ territory: t })}
                                        onContinue={() => setStep(5)}
                                    />
                                )}

                                {step === 5 && (
                                  <TensionSlider
                                    onBack={() => setStep(4)}
                                    onComplete={(deducedFear, context) => {
                                      updateProfile({
                                        fear: deducedFear,
                                        frictionData: { ...profile.frictionData, tension: context.value }
                                      });
                                      setStep(5.1);
                                    }}
                                  />
                                )}

                                {step === 5.1 && (
                                  <ScenarioReaction
                                    mode={profile.mode as any}
                                    onBack={() => setStep(5)}
                                    onComplete={(coreFear, scenarios) => {
                                      updateProfile({
                                        frictionData: { ...profile.frictionData, scenarios }
                                      });
                                      setStep(5.2);
                                    }}
                                  />
                                )}

                                {step === 5.2 && (
                                  <AnxietyConstellation
                                    mode={profile.mode as any}
                                    onBack={() => setStep(5.1)}
                                    onComplete={(fearMapping, triggers) => {
                                      updateProfile({
                                        fear: `${profile.fear} / ${fearMapping}`,
                                        frictionData: { ...profile.frictionData, triggers }
                                      });
                                      setStep(6);
                                    }}
                                  />
                                )}

                                {step === 6 && (
                                    <InterviewQuestion
                                        question="one last thing — who are we building this for?"
                                        onSelect={() => { }}
                                        hasSelectionOverride={!!profile.fullName && profile.fullName.trim().length > 2}
                                        onContinue={handleSynthesize}
                                    >
                                        <div className="w-full max-w-lg mx-auto flex flex-col mb-8 gap-4">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Your full name"
                                                    autoFocus
                                                    value={profile.fullName || ''}
                                                    onChange={(e) => updateProfile({ fullName: e.target.value })}
                                                    className="w-full bg-[#1A1A17]/30 border border-[#2A2A27] text-[#F0EDE8] p-4 rounded-sm outline-none focus:border-[#C8B89A] transition-colors text-xl font-serif text-center"
                                                />
                                            </div>
                                        </div>
                                    </InterviewQuestion>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

// Concept 1: The Tension Slider
function TensionSlider({ onComplete, onBack }: { onComplete: (fear: string, data: { value: number }) => void; onBack: () => void }) {
  const [tension, setTension] = useState(50);

  const handleContinue = () => {
    let deducedFear = '';
    if (tension < 35) deducedFear = 'missing_out';
    else if (tension > 65) deducedFear = 'overpaying';
    else deducedFear = 'decision_paralysis';
    onComplete(deducedFear, { value: tension });
  };

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <h2 className="font-serif text-3xl md:text-4xl text-[#F0EDE8] italic mb-10 md:mb-12">"What scares you more?"</h2>
      <div className="relative pt-8 pb-10 md:pb-12">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#6E6A65] font-bold mb-6">
          <span className={cn("text-left transition-colors max-w-[45%]", tension < 50 ? 'text-[#C8B89A]' : '')}>Losing the perfect place<br/>by moving too slow</span>
          <span className={cn("text-right transition-colors max-w-[45%]", tension > 50 ? 'text-[#C8B89A]' : '')}>Winning the bid but<br/>realizing I overpaid</span>
        </div>
        <input
          type="range" min="0" max="100" value={tension}
          onChange={(e) => setTension(Number(e.target.value))}
          className="w-full h-1 bg-[#2A2A27] appearance-none cursor-pointer accent-[#C8B89A]"
        />
        <div className="flex justify-between text-[8px] uppercase tracking-widest text-[#6E6A65] mt-4 font-bold">
          <span>FOMO</span>
          <span>FOOP</span>
        </div>
      </div>
      <button onClick={handleContinue} className="w-full py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex items-center justify-center gap-2 mb-4">
        Lock it in <ArrowRight className="w-3 h-3" />
      </button>
      <button onClick={onBack} className="w-full py-3 text-[#6E6A65] hover:text-[#F0EDE8] font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
        <ArrowLeft className="w-3 h-3" /> Back
      </button>
    </div>
  );
}

// Concept 2: The NYC Rorschach Test
function ScenarioReaction({ mode, onComplete, onBack }: { mode: 'Buy' | 'Rent', onComplete: (fear: string, scenarios: any[]) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [reactions, setReactions] = useState<any[]>([]);

  const scenarios = mode === 'Rent' ? [
    { text: "It's the perfect layout, but there's a strict 15% broker fee.", tag: 'fee_aversion' },
    { text: "The landlord requires a guarantor who makes 80x the rent.", tag: 'guarantor_fear' },
    { text: "Management has terrible reviews on openigloo.", tag: 'management_distrust' }
  ] : [
    { text: "The Co-op board requires 24 months of post-closing liquidity in cash.", tag: 'liquidity_fear' },
    { text: "You have to waive your mortgage contingency to beat an all-cash buyer.", tag: 'risk_aversion' },
    { text: "The inspection reveals the building needs a new roof next year.", tag: 'assessment_fear' }
  ];

  const handleReaction = (reaction: string) => {
    const newReactions = [...reactions, { scenario: scenarios[step].tag, reaction }];
    setReactions(newReactions);
    if (step < 2) setStep(step + 1);
    else {
      const dealbreakers = newReactions.filter(r => r.reaction === 'dealbreaker').map(r => r.scenario);
      const coreFear = dealbreakers.length > 0 ? dealbreakers[0] : 'general_risk_tolerance';
      onComplete(coreFear, newReactions);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-[0.25em] mb-6 text-center">Gut Check {step + 1} of 3</div>
      <h2 className="font-serif text-2xl md:text-5xl text-[#F0EDE8] italic mb-10 md:mb-12 text-center leading-tight">"{scenarios[step].text}"</h2>
      <div className="flex gap-4 mb-4">
        <button onClick={() => handleReaction('dealbreaker')} className="flex-1 py-5 border border-[#8B3A3A] text-[#8B3A3A] hover:bg-[#8B3A3A]/10 font-bold text-[10px] uppercase tracking-widest transition-all">Dealbreaker</button>
        <button onClick={() => handleReaction('figure_it_out')} className="flex-1 py-5 border border-[#C8B89A] text-[#C8B89A] hover:bg-[#C8B89A]/10 font-bold text-[10px] uppercase tracking-widest transition-all">I'd figure it out</button>
      </div>
      {step === 0 && (
        <button onClick={onBack} className="w-full py-3 text-[#6E6A65] hover:text-[#F0EDE8] font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
      )}
    </div>
  );
}

// Concept 3: The Anxiety Constellation
function AnxietyConstellation({ mode, onComplete, onBack }: { mode: 'Buy' | 'Rent', onComplete: (fear: string, triggers: string[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const triggers = mode === 'Rent' ? [
    { label: "15% Broker Fees", category: "financial" },
    { label: "Ghosting Brokers", category: "process" },
    { label: "Bidding Wars for Rentals", category: "competition" },
    { label: "Shady Management", category: "trust" },
    { label: "Guarantor Rejection", category: "approval" },
    { label: "Hidden Pest Issues", category: "trust" }
  ] : [
    { label: "All-Cash Buyers", category: "competition" },
    { label: "Co-op Board Interviews", category: "approval" },
    { label: "Hidden Assessments", category: "financial" },
    { label: "Waiving Contingencies", category: "risk" },
    { label: "Overpaying at the Peak", category: "financial" },
    { label: "Losing My Deposit", category: "risk" }
  ];

  const toggleTrigger = (label: string) => {
    setSelected(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const handleContinue = () => {
    const selectedCats = triggers.filter(t => selected.includes(t.label)).map(t => t.category);
    const dominantCategory = selectedCats.sort((a,b) =>
      selectedCats.filter(v => v===a).length - selectedCats.filter(v => v===b).length
    ).pop() || 'general';
    const fearMapping: Record<string, string> = {
      financial: 'Financial Exposure', competition: 'Market Competition',
      approval: 'Approval Friction', trust: 'Integrity concerns',
      risk: 'Outcome Risk', general: 'General Caution'
    };
    onComplete(fearMapping[dominantCategory], selected);
  };

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <h2 className="font-serif text-3xl md:text-4xl text-[#F0EDE8] italic mb-4">"What makes your stomach drop?"</h2>
      <p className="text-[#6E6A65] text-xs font-bold uppercase tracking-widest mb-10">Select all that apply.</p>
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {triggers.map(t => (
          <button
            key={t.label} onClick={() => toggleTrigger(t.label)}
            className={cn("px-5 py-3 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all border",
              selected.includes(t.label) ? "bg-[#C8B89A] border-[#C8B89A] text-[#0D0D0B] scale-105 shadow-xl" : "bg-transparent border-[#2A2A27] text-[#6E6A65] hover:border-[#C8B89A]/40"
            )}
          >{t.label}</button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-4">
        {selected.length > 0 && (
          <button onClick={handleContinue} className="px-12 py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex items-center justify-center gap-2">
            EXTRACT INTELLIGENCE <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <button onClick={onBack} className="py-3 text-[#6E6A65] hover:text-[#F0EDE8] font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
      </div>
    </div>
  );
}
