'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

function SetupPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentRef = searchParams.get('ref');
  const { user, isAuthenticated } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !success && !isAuthenticated) {
      // If somehow they get here without a session, send to login
      // router.replace('/auth');
    }
  }, [isAuthenticated, loading, success]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    
    // 1. Update the user password
    // 2. Also set a metadata flag so we don't prompt them again
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
      data: { password_set: true }
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-10 text-center"
      >
        <div className="w-16 h-16 bg-[#C8B89A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-[#C8B89A]" />
        </div>
        <h2 className="font-serif text-3xl text-[#F0EDE8] italic mb-4">Security enabled.</h2>
        <p className="text-[#A8A49E] font-light mb-8">
          Your password is set. You're being redirected to your dashboard.
        </p>
        <div className="flex gap-1 justify-center">
          {[0, 0.1, 0.2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-[#C8B89A] rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full glass p-8 md:p-12 border-t-4 border-t-[#C8B89A]"
    >
      <div className="text-center mb-10">
        <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.25em] uppercase mb-3">Secure Your Account</div>
        <h2 className="font-serif text-3xl text-[#F0EDE8] italic mb-3">Create a password.</h2>
        <p className="text-[#A8A49E] font-light text-sm">
          Set a password now so you can sign in directly next time without a magic link.
        </p>
      </div>

      <form onSubmit={handleSetup} className="space-y-5">
        {error && (
          <div className="flex items-start gap-3 p-4 border border-[#8B3A3A]/30 bg-[#8B3A3A]/10 rounded-sm">
            <AlertCircle className="w-4 h-4 text-[#8B3A3A] shrink-0 mt-0.5" />
            <p className="text-[#8B3A3A] text-xs">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold ml-1">Password</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-5 py-4 text-sm text-[#F0EDE8] placeholder:text-[#3A3C39] transition-colors"
            />
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2A2A27]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold ml-1">Confirm Password</label>
          <div className="relative">
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-5 py-4 text-sm text-[#F0EDE8] placeholder:text-[#3A3C39] transition-colors"
            />
            <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2A2A27]" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full mt-6 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#DED2BC] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group"
        >
          {loading ? 'Saving...' : <>Save Password <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></>}
        </button>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-[9px] text-[#6E6A65] hover:text-[#A8A49E] font-bold uppercase tracking-widest transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function SetupPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0B] flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <SetupPasswordContent />
      </Suspense>
    </div>
  );
}
