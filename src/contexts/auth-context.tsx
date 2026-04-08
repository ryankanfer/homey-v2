'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signInWithMagicLink: (email: string, role?: UserRole, redirectPath?: string) => Promise<{ error: string | null }>;
  sendOtp: (email: string, role?: UserRole) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      }));
      if (session?.user) fetchRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      }));
      if (session?.user) fetchRole(session.user.id);
      else setState(prev => ({ ...prev, role: null }));
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data) setState(prev => ({ ...prev, role: (data as any).role as UserRole }));
  }, [supabase]);

  const signInWithMagicLink = useCallback(async (
    email: string,
    role: UserRole = 'buyer',
    redirectPath?: string,
  ) => {
    const base = `${window.location.origin}/auth/callback`;
    const emailRedirectTo = redirectPath
      ? `${base}?${new URLSearchParams({ next: redirectPath }).toString()}`
      : base;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, data: { role } },
    });
    return { error: error?.message ?? null };
  }, [supabase]);

  const sendOtp = useCallback(async (email: string, role: UserRole = 'buyer') => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { role } },
    });
    return { error: error?.message ?? null };
  }, [supabase]);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    return { error: error?.message ?? null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ ...state, signInWithMagicLink, sendOtp, verifyOtp, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
