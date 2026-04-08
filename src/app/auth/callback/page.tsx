'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { performAgentLinkage } from '@/lib/agent-linkage';

/**
 * Auth callback handler — supports BOTH flows:
 *   1. PKCE flow  → ?code=xxx  (normal magic link via email)
 *   2. Implicit   → #access_token=xxx  (admin-generated links, older flow)
 *
 * Agent ref passthrough:
 *   The ?ref= param is carried through the entire URL chain:
 *   /onboarding?ref= → /review?ref= → emailRedirectTo includes ref
 *   → this page reads ?ref= and calls performAgentLinkage.
 *   No sessionStorage — survives iOS Safari ITP + browser switches.
 *
 * Agent invitation reconciliation (fallback):
 *   For newly-registered agents, checks agent_invitations for any pending
 *   invitations that match their email and auto-creates agent_clients rows.
 *   This is a fallback for cases where the Supabase trigger may have missed
 *   the signup (e.g. email typo correction, manual account creation).
 *
 * Hash fragments are invisible to server route handlers,
 * so this MUST be a client-side page component.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createClient();

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      // Agent ref passed through the magic link redirect URL
      const agentRef = params.get('ref');

      // ── Flow 1: PKCE (code in query string) ──
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('PKCE exchange failed:', error.message);
          router.replace(`/auth?error=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      // ── Flow 2: Implicit (tokens in hash fragment) ──
      const hash = window.location.hash;
      if (!code && hash && hash.includes('access_token')) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // ── Resolve session & redirect ──
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth?error=no_session');
        return;
      }

      // ── Agent referral linkage (Avenue 3) ──
      if (agentRef) {
        await performAgentLinkage(agentRef, user.id, 'invite_link');
      }

      // Determine role: try metadata first, then DB
      let role = user.user_metadata?.role;
      if (!role) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        role = (profile as any)?.role;
      }

      // ── Agent invitation reconciliation fallback ──
      // If this is a new agent, check for any pending invitations from buyers.
      // The Supabase trigger handles the common case; this is a safety net.
      if (role === 'agent') {
        try {
          await fetch('/api/agent-invitations/reconcile', { method: 'POST' });
        } catch {
          // non-fatal fallback
        }
      }

      const destination = role === 'agent' ? '/agent' : '/dashboard';
      router.replace(destination);
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0D0D0B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {[0, 0.2, 0.4].map(d => (
            <div
              key={d}
              className="w-2 h-2 bg-[#C8B89A] rounded-full animate-pulse"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-[#6E6A65] uppercase tracking-widest">
          Signing you in...
        </span>
      </div>
    </div>
  );
}
