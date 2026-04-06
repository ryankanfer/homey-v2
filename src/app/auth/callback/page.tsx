'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

/**
 * Auth callback handler — supports BOTH flows:
 *   1. PKCE flow  → ?code=xxx  (normal magic link via email)
 *   2. Implicit   → #access_token=xxx  (admin-generated links, older flow)
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
      // The Supabase client auto-detects #access_token on page load
      // and sets the session internally. We just need to wait for it.
      const hash = window.location.hash;
      if (!code && hash && hash.includes('access_token')) {
        // Give Supabase client a moment to parse the hash and set session
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // ── Resolve session & redirect ──
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth?error=no_session');
        return;
      }

      // ── Agent referral linkage ──
      const agentRef = sessionStorage.getItem('homey_agent_ref');
      if (agentRef) {
        try {
          await fetch('/api/agent-clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: agentRef, clientId: user.id }),
          });
        } catch {
          console.warn('Agent ref linkage failed silently');
        } finally {
          sessionStorage.removeItem('homey_agent_ref');
        }
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
