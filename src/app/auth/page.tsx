'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { UserRole } from '@/types/database';

const ERROR_MESSAGES: Record<string, string> = {
  callback_failed: 'Sign-in failed. Please try again.',
  no_code: 'The magic link was invalid. Please request a new one.',
  no_session: 'Could not establish a session. Try again.',
  'email rate limit exceeded': 'Too many emails sent. Please wait a few minutes and try again.',
};

function UrlErrorReader({ onError }: { onError: (msg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      onError(ERROR_MESSAGES[urlError] || decodeURIComponent(urlError));
    }
  }, [searchParams, onError]);
  return null;
}

export default function AuthPage() {
  const { signInWithMagicLink, signInWithPassword, isAuthenticated, role } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(role === 'agent' ? '/agent' : '/dashboard');
    }
  }, [isAuthenticated, role, router]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    
    if (password.trim()) {
      // ── Password Sign In ──
      const { error } = await signInWithPassword(email.trim(), password.trim());
      if (error) {
        // If password fails, don't automatically send magic link (might be typo)
        // Provide clear feedback.
        setError(error === 'Invalid login credentials' ? 'Incorrect password. Leave blank to sign in with a magic link.' : error);
        setLoading(false);
      }
      // On success, redirect is handled by useEffect
    } else {
      // ── Magic Link Sign In ──
      const { error } = await signInWithMagicLink(email.trim(), selectedRole);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        setStep('sent');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <UrlErrorReader onError={setError} />
      </Suspense>
      <AnimatePresence mode="wait">
        {step === 'email' ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-10">
              <span className="font-serif italic text-3xl text-[#C8B89A] tracking-tighter">homey.</span>
              <p className="text-[#6E6A65] text-xs font-bold uppercase tracking-widest mt-3">Sign in to continue</p>
            </div>

            {error && (
              <div className="flex items-start gap-3 mb-6 p-4 border border-[#8B3A3A]/30 bg-[#8B3A3A]/10 rounded-sm">
                <AlertCircle className="w-4 h-4 text-[#8B3A3A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#8B3A3A] text-xs">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="flex gap-2 mb-6">
                {(['buyer', 'agent'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                      selectedRole === r
                        ? 'bg-[#C8B89A]/10 border-[#C8B89A] text-[#C8B89A]'
                        : 'border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-5 py-4 text-sm text-[#F0EDE8] placeholder:text-[#6E6A65] transition-colors"
                />

                <div className="relative group">
                  <input
                    type="password"
                    placeholder="password (leave blank for magic link)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-5 py-4 text-sm text-[#F0EDE8] placeholder:text-[#3A3C39] transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                    <span className="text-[8px] font-bold uppercase tracking-tighter text-[#6E6A65]">Optional</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full mt-2 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {loading ? 'Processing...' : (
                  <>
                    {password ? 'Sign In' : 'Send Magic Link'}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md text-center"
          >
            <span className="font-serif italic text-3xl text-[#C8B89A] tracking-tighter">homey.</span>
            <div className="mt-12 mb-8">
               <div className="w-16 h-16 bg-[#C8B89A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <motion.div
                   animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 >
                   <motion.svg className="w-6 h-6 text-[#C8B89A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                   </motion.svg>
                 </motion.div>
               </div>
               <h2 className="font-serif text-2xl text-[#F0EDE8] mb-2">Check your email.</h2>
               <p className="text-[#A8A49E] font-light text-sm">
                 We've sent a magic link to <strong className="text-[#F0EDE8]">{email}</strong>.
               </p>
            </div>
            
            <button
              type="button"
              onClick={() => { setStep('email'); setError(null); }}
              className="text-[#6E6A65] text-[10px] font-bold uppercase tracking-widest hover:text-[#F0EDE8] transition-colors"
            >
              ← Use a different email
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
