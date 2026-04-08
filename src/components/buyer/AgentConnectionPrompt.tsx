'use client';

/**
 * AgentConnectionPrompt
 *
 * Post-onboarding dashboard prompt: "Do you have an agent?"
 * Supports all three connection avenues:
 *   - Found:     POST /api/agent-clients (buyer_search source)
 *   - Not found: POST /api/agent-invitations (acquisition email)
 *
 * Shows once. Persisted as dismissed in localStorage so it doesn't
 * reappear on every dashboard visit.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, CheckCircle2, UserSearch } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/auth-context';
import { performAgentLinkage } from '@/lib/agent-linkage';

const DISMISSED_KEY = 'homey_agent_prompt_dismissed';

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(DISMISSED_KEY) === '1';
}

function dismiss() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISSED_KEY, '1');
  }
}

type PromptState = 'idle' | 'searching' | 'found' | 'not_found' | 'invited' | 'linked';

export function AgentConnectionPrompt() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [visible, setVisible] = useState(!isDismissed());
  const [agentEmail, setAgentEmail] = useState('');
  const [agentName, setAgentName] = useState('');
  const [state, setState] = useState<PromptState>('idle');
  const [foundAgent, setFoundAgent] = useState<{ agentId: string; displayName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentEmail.trim()) return;
    setError(null);
    setState('searching');

    try {
      const res = await fetch(
        `/api/agents/search?email=${encodeURIComponent(agentEmail.trim())}`,
      );
      const data = await res.json();

      if (data.found) {
        setFoundAgent({ agentId: data.agentId, displayName: data.displayName });
        setState('found');
      } else {
        setState('not_found');
      }
    } catch {
      setError('Something went wrong. Try again.');
      setState('idle');
    }
  };

  const handleConnect = async () => {
    if (!foundAgent || !user) return;
    await performAgentLinkage(foundAgent.agentId, user.id, 'buyer_search');
    dismiss();
    setState('linked');
  };

  const handleInvite = async () => {
    if (!user || !agentEmail.trim()) return;
    setError(null);

    try {
      const res = await fetch('/api/agent-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentEmail: agentEmail.trim(),
          agentName: agentName.trim() || undefined,
          buyerProfile: {
            territory: profile.territory,
            budgetTier: profile.budgetTier,
            timeline: profile.timeline,
            mode: profile.mode,
          },
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      dismiss();
      setState('invited');
    } catch {
      setError('Failed to send invitation. Try again.');
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="border border-[#2A2A27] bg-[#141412] p-6 relative"
        >
          {/* Dismiss */}
          {state !== 'linked' && state !== 'invited' && (
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-[#6E6A65] hover:text-[#A8A49E] transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <AnimatePresence mode="wait">

            {/* ── Idle / searching ── */}
            {(state === 'idle' || state === 'searching') && (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 mb-4">
                  <UserSearch className="w-4 h-4 text-[#C8B89A]" />
                  <span className="text-[9px] text-[#A8956E] uppercase tracking-widest font-bold">
                    Connect Your Agent
                  </span>
                </div>
                <p className="text-sm text-[#A8A49E] font-light mb-5 leading-relaxed">
                  Already working with an agent? Link them so they can see your full profile and reach out.
                </p>
                <form onSubmit={handleSearch} className="space-y-3">
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={e => setAgentEmail(e.target.value)}
                    placeholder="Agent's email address"
                    required
                    className="w-full bg-[#0D0D0B] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-4 py-3 text-sm text-[#F0EDE8] placeholder:text-[#6E6A65] transition-colors"
                  />
                  {error && (
                    <p className="text-[10px] text-[#8B3A3A]">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={state === 'searching' || !agentEmail.trim()}
                    className="w-full py-3 bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#C8B89A] font-bold text-[9px] uppercase tracking-widest hover:bg-[#C8B89A]/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {state === 'searching' ? 'Searching…' : <>Find Agent <ArrowRight className="w-3 h-3" /></>}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full text-[9px] text-[#6E6A65] hover:text-[#A8A49E] transition-colors py-1 uppercase tracking-widest"
                  >
                    I don't have an agent yet
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Agent found ── */}
            {state === 'found' && foundAgent && (
              <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-5">
                  <div className="text-[9px] text-[#4A7C59] uppercase tracking-widest font-bold mb-2">Found on homey.</div>
                  <p className="font-serif text-xl text-[#F0EDE8] italic">{foundAgent.displayName}</p>
                  <p className="text-[10px] text-[#6E6A65] mt-1">{agentEmail}</p>
                </div>
                <button
                  onClick={handleConnect}
                  className="w-full py-3 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[9px] uppercase tracking-widest hover:bg-[#DED2BC] transition-colors"
                >
                  Connect with {foundAgent.displayName.split(' ')[0]} →
                </button>
                <button
                  onClick={() => setState('idle')}
                  className="w-full mt-2 text-[9px] text-[#6E6A65] hover:text-[#A8A49E] transition-colors py-1 uppercase tracking-widest"
                >
                  ← Try a different email
                </button>
              </motion.div>
            )}

            {/* ── Agent not found — invite flow ── */}
            {state === 'not_found' && (
              <motion.div key="notfound" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-5">
                  <div className="text-[9px] text-[#A8956E] uppercase tracking-widest font-bold mb-2">Not on homey. yet</div>
                  <p className="text-sm text-[#A8A49E] font-light leading-relaxed">
                    We'll send them a warm note — your profile preview, why it matters, and how to join. No cold pitch. Just context.
                  </p>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    placeholder="Their name (optional)"
                    className="w-full bg-[#0D0D0B] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-4 py-3 text-sm text-[#F0EDE8] placeholder:text-[#6E6A65] transition-colors"
                  />
                  {error && (
                    <p className="text-[10px] text-[#8B3A3A]">{error}</p>
                  )}
                  <button
                    onClick={handleInvite}
                    className="w-full py-3 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[9px] uppercase tracking-widest hover:bg-[#DED2BC] transition-colors"
                  >
                    Send Profile Preview to {agentEmail.split('@')[0]} →
                  </button>
                  <button
                    onClick={() => { setState('idle'); setError(null); }}
                    className="w-full text-[9px] text-[#6E6A65] hover:text-[#A8A49E] transition-colors py-1 uppercase tracking-widest"
                  >
                    ← Try a different email
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Success: connected ── */}
            {state === 'linked' && (
              <motion.div key="linked" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-[#4A7C59] mx-auto mb-3" />
                <p className="font-serif text-lg text-[#F0EDE8] italic mb-1">Connected.</p>
                <p className="text-[10px] text-[#6E6A65] uppercase tracking-widest">
                  {foundAgent?.displayName} can now see your full profile.
                </p>
              </motion.div>
            )}

            {/* ── Success: invited ── */}
            {state === 'invited' && (
              <motion.div key="invited" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-[#C8B89A] mx-auto mb-3" />
                <p className="font-serif text-lg text-[#F0EDE8] italic mb-1">Preview sent.</p>
                <p className="text-[10px] text-[#6E6A65] uppercase tracking-widest">
                  We'll connect you automatically when they sign up.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
