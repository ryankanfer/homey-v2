'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { UserRole } from '@/types/database';

export default function AuthPage() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await signInWithMagicLink(email.trim(), role);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <CheckCircle2 className="w-10 h-10 text-[#C8B89A] mx-auto mb-6" />
            <h2 className="font-serif text-3xl text-[#F0EDE8] italic mb-3">Check your inbox.</h2>
            <p className="text-[#A8A49E] font-light">
              We sent a magic link to <strong className="text-[#F0EDE8]">{email}</strong>.<br />
              Click it to sign in — no password needed.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-10">
              <span className="font-serif italic text-3xl text-[#C8B89A] tracking-tighter">homey.</span>
              <p className="text-[#6E6A65] text-xs font-bold uppercase tracking-widest mt-3">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector — only shown if accessed via agent link */}
              <div className="flex gap-2 mb-6">
                {(['buyer', 'agent'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                      role === r
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

              {error && (
                <p className="text-[#8B3A3A] text-xs">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending...' : <>Send magic link <ArrowRight className="w-3 h-3" /></>}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
