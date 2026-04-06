'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
  const { sendOtp, verifyOtp, isAuthenticated, role } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(role === 'agent' ? '/agent' : '/dashboard');
    }
  }, [isAuthenticated, role, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await sendOtp(email.trim(), selectedRole);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      setStep('code');
      setLoading(false);
      setTimeout(() => codeRefs.current[0]?.focus(), 50);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 5) codeRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '')) {
      handleVerify(next.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (token: string) => {
    setLoading(true);
    setError(null);
    const { error } = await verifyOtp(email.trim(), token);
    if (error) {
      setError('Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      setLoading(false);
      setTimeout(() => codeRefs.current[0]?.focus(), 50);
    }
    // On success, onAuthStateChange fires → useEffect above redirects
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      e.preventDefault();
      handleVerify(pasted);
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
                  {error.includes('wait') && (
                    <p className="text-[#6E6A65] text-[10px] mt-1">
                      Please wait a few minutes before requesting another code.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
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

              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-5 py-4 text-sm text-[#F0EDE8] placeholder:text-[#6E6A65] transition-colors"
              />

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending...' : <>Sign In <ArrowRight className="w-3 h-3" /></>}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md text-center"
          >
            <span className="font-serif italic text-3xl text-[#C8B89A] tracking-tighter">homey.</span>
            <h2 className="font-serif text-2xl text-[#F0EDE8] mt-6 mb-2">Check your email.</h2>
            <p className="text-[#A8A49E] font-light text-sm mb-8">
              We sent a 6-digit code to <strong className="text-[#F0EDE8]">{email}</strong>.
            </p>

            {error && (
              <div className="flex items-start gap-3 mb-6 p-4 border border-[#8B3A3A]/30 bg-[#8B3A3A]/10 rounded-sm text-left">
                <AlertCircle className="w-4 h-4 text-[#8B3A3A] shrink-0 mt-0.5" />
                <p className="text-[#8B3A3A] text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  disabled={loading}
                  className="w-12 h-14 bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none text-center text-xl font-serif text-[#F0EDE8] transition-colors disabled:opacity-50"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setStep('email'); setCode(['', '', '', '', '', '']); setError(null); }}
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
