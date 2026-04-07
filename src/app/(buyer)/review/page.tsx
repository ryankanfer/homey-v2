'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/buyer/Nav';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/auth-context';
import { CheckCircle2, ArrowRight, Mail, AlertCircle } from 'lucide-react';
import type { AccuracyRating } from '@/types/profile';

export default function ReviewPage() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const { signInWithMagicLink, isAuthenticated, user } = useAuth();
  const [step, setStep] = useState<'accuracy' | 'auth' | 'sent'>('accuracy');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // When user clicks magic link and comes back, auto-redirect to dashboard
  useEffect(() => {
    if (step === 'sent' && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [step, isAuthenticated, router]);

  const tryLinkAgent = async (clientId: string) => {
    const agentRef = typeof window !== 'undefined' ? sessionStorage.getItem('homey_agent_ref') : null;
    if (!agentRef) return;
    try {
      await fetch('/api/agent-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agentRef, clientId }),
      });
    } catch {
      // non-fatal
    } finally {
      sessionStorage.removeItem('homey_agent_ref');
    }
  };

  const handleAccuracy = async (rating: AccuracyRating) => {
    updateProfile({ accuracyRating: rating });
    if (isAuthenticated && user) {
      await tryLinkAgent(user.id);
      router.push('/dashboard');
    } else {
      setStep('auth');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setAuthError(null);

    const { error } = await signInWithMagicLink(email.trim(), profile.mode === 'Rent' ? 'renter' : 'buyer');

    if (!error) {
      setStep('sent');
    } else {
      setAuthError(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0B]">
      <Nav isAuthenticated={isAuthenticated} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[90vh] px-6 py-12"
      >
        <AnimatePresence mode="wait">
          {step === 'accuracy' && (
            <motion.div
              key="accuracy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-2xl glass p-8 md:p-12 rounded-sm border-t-4 border-t-[#C8B89A]"
            >
              <div className="text-center mb-10">
                <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.25em] uppercase mb-2">
                  Built from your answers
                </div>
                <h2 className="font-serif text-3xl text-[#F0EDE8]">
                  {profile.fullName?.trim() ? `${profile.fullName.split(' ')[0]}'s Profile` : 'Your Profile'}
                </h2>
              </div>

              <div className="space-y-6 mb-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#2A2A27]">
                  <div>
                    <span className="text-[9px] text-[#6E6A65] uppercase tracking-widest block mb-1">
                      {profile.mode === 'Rent' ? 'Max Monthly Rent' : 'Budget Ceiling'}
                    </span>
                    <span className="font-serif text-xl text-[#C8B89A]">
                      {profile.mode === 'Rent' ? `$${profile.maxMonthlyRent?.toLocaleString()}/mo` : profile.budgetTier || 'Undisclosed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6E6A65] uppercase tracking-widest block mb-1">Timeline</span>
                    <span className="font-serif text-xl text-[#C8B89A]">{profile.timeline || 'Flexible'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-[#6E6A65] uppercase tracking-widest block mb-3">Territory</span>
                  <div className="flex flex-wrap gap-2">
                    {(profile.territory && profile.territory.length > 0) ? profile.territory.map(t => (
                      <span key={t} className="text-[8px] bg-[#C8B89A]/10 text-[#C8B89A] border border-[#C8B89A]/30 px-2 py-1 uppercase tracking-widest font-bold">
                        {t}
                      </span>
                    )) : (
                      <span className="font-serif text-xl text-[#C8B89A]">NYC</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#C8B89A]/5 border border-[#A8956E]/20 p-6 rounded-sm text-sm text-[#E8DCC8] italic leading-relaxed">
                  &ldquo;{profile.summary || 'Building your strategic profile...'}&rdquo;
                </div>
              </div>

              <div className="bg-[#0D0D0B] p-6 rounded-sm border border-[#2A2A27]">
                <h3 className="text-center font-serif text-xl text-[#F0EDE8] mb-6">Does this feel accurate?</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleAccuracy('Yes, this is me')}
                    className="flex-1 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all"
                  >
                    Yes, this is me
                  </button>
                  <button
                    onClick={() => handleAccuracy('Mostly')}
                    className="flex-1 py-4 bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#C8B89A] font-bold text-[10px] uppercase tracking-widest hover:bg-[#C8B89A]/20 transition-all"
                  >
                    Mostly
                  </button>
                  <button
                    onClick={() => handleAccuracy('Not quite')}
                    className="flex-1 py-4 bg-[#0D0D0B] border border-[#2A2A27] text-[#6E6A65] font-bold text-[10px] uppercase tracking-widest hover:text-[#F0EDE8] transition-all"
                  >
                    Not quite
                  </button>
                </div>
                <div className="text-center mt-4">
                  <button
                    onClick={() => router.push('/interview')}
                    className="text-[9px] text-[#6E6A65] hover:text-[#A8A49E] font-bold uppercase tracking-widest transition-colors"
                  >
                    ← Redo the interview
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md glass p-8 md:p-12 rounded-sm border-t-4 border-t-[#C8B89A]"
            >
              <div className="text-center mb-10">
                <h2 className="font-serif text-3xl text-[#F0EDE8] italic mb-3">Where should we send your strategy?</h2>
                <p className="text-[#A8A49E] font-light text-sm">Save your profile and unlock your guidance dashboard.</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authError && (
                  <div className="flex items-start gap-3 p-4 border border-[#8B3A3A]/30 bg-[#8B3A3A]/10 rounded-sm">
                    <AlertCircle className="w-4 h-4 text-[#8B3A3A] shrink-0 mt-0.5" />
                    <p className="text-[#8B3A3A] text-xs">{authError}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold ml-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-5 py-4 text-sm text-[#F0EDE8] placeholder:text-[#6E6A65] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#DED2BC] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Sending...' : <>Send Magic Link <ArrowRight className="w-3 h-3 ml-1" /></>}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'sent' && (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md glass p-12 rounded-sm"
            >
              <CheckCircle2 className="w-12 h-12 text-[#C8B89A] mx-auto mb-6" />
              <h2 className="font-serif text-3xl text-[#F0EDE8] italic mb-3">Check your inbox.</h2>
              <p className="text-[#A8A49E] font-light mb-8">
                We sent a link to <strong className="text-[#F0EDE8]">{email}</strong>.<br />
                Click it to save your profile and open your dashboard.
              </p>
              <div className="flex items-center justify-center gap-2 text-[#6E6A65] text-[10px] font-bold uppercase tracking-widest">
                <Mail className="w-4 h-4" /> Click the link, then come back
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
