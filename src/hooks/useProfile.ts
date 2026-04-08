'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile } from '@/types/profile';
import { DEFAULT_USER_PROFILE } from '@/types/profile';
import { calculateReadiness } from '@/lib/readiness';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase';

const STORAGE_KEY = 'homey_profile_v2';

function loadLocalProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_USER_PROFILE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_USER_PROFILE, ...JSON.parse(saved) } : DEFAULT_USER_PROFILE;
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function useProfile() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial load from LocalStorage
  useEffect(() => {
    setProfile(loadLocalProfile());
    setIsLoaded(true);
  }, []);

  // 2. Sync DOWN: Pull from Supabase on Login
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setIsSyncing(true);
      try {
        // Fetch fullName from profiles table
        const profileRes = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

        // Check both buyer/renter tables
        const [buyerRes, renterRes] = await Promise.all([
          supabase.from('buyer_profiles').select('*').eq('user_id', user.id).single(),
          supabase.from('renter_profiles').select('*').eq('user_id', user.id).single()
        ]);

        const dbProfile = (buyerRes.data || renterRes.data) as any;
        const hadFetchError = !!(buyerRes.error && renterRes.error);

        if (dbProfile) {
          // Mapping DB schema to Frontend State
          const mapped: Partial<UserProfile> = {
            fullName: (profileRes.data as any)?.full_name || '',
            mode: dbProfile.mode as any,
            timeline: dbProfile.timeline || '',
            timelineContext: dbProfile.timeline_context || '',
            moveInDate: dbProfile.move_in_date || '',
            budgetTier: dbProfile.budget_tier || dbProfile.budget_monthly || '',
            maxMonthlyRent: dbProfile.max_monthly_rent || undefined,
            meetsIncomeRequirement: dbProfile.meets_income_req ?? undefined,
            usingGuarantor: dbProfile.using_guarantor ?? undefined,
            budgetContext: dbProfile.budget_context || '',
            territory: dbProfile.territory || [],
            fear: dbProfile.fear || '',
            fearContext: dbProfile.fear_context || '',
            summary: dbProfile.summary || '',
            journeyStage: dbProfile.journey_stage || 1,
            accuracyRating: dbProfile.accuracy_rating as any,
            isPartial: dbProfile.is_partial ?? false,
            vault: dbProfile.vault || DEFAULT_USER_PROFILE.vault,
            frictionData: dbProfile.friction_data && Object.keys(dbProfile.friction_data).length > 0
              ? dbProfile.friction_data
              : undefined,
          };
          setProfile(prev => ({ ...prev, ...mapped }));
        } else if (!hadFetchError) {
          // No DB profile exists yet — push current local state to DB
          await syncToDb(profile, user.id);
        }
        // If both fetches errored, do nothing — don't risk overwriting a real profile
      } catch (err) {
        console.error('Error syncing down profile:', err);
      }
      setIsSyncing(false);
    };

    fetchProfile();
  }, [user, supabase]);

  // 3. Sync UP helper
  const syncToDb = async (p: UserProfile, userId: string) => {
    if (!p.mode) return;
    const table = p.mode === 'Rent' ? 'renter_profiles' : 'buyer_profiles';
    
    // Mapping Frontend State to DB Schema
    const payload: any = {
      user_id: userId,
      mode: p.mode,
      timeline: p.timeline,
      timeline_context: p.timelineContext,
      territory: p.territory,
      fear: p.fear,
      fear_context: p.fearContext,
      summary: p.summary,
      accuracy_rating: p.accuracyRating,
      is_partial: p.isPartial,
      vault: p.vault,
      journey_stage: p.journeyStage,
      readiness_score: calculateReadiness(p),
      friction_data: p.frictionData ?? {},
    };

    if (p.mode === 'Rent') {
      payload.max_monthly_rent = p.maxMonthlyRent;
      payload.move_in_date = p.moveInDate || null;
      payload.meets_income_req = p.meetsIncomeRequirement;
      payload.using_guarantor = p.usingGuarantor;
    } else {
      payload.budget_tier = p.budgetTier;
      payload.budget_context = p.budgetContext;
    }

    await supabase.from(table).upsert(payload, { onConflict: 'user_id' });
    // Also persist fullName to the profiles table
    if (p.fullName) {
      await (supabase.from('profiles') as any).update({ full_name: p.fullName }).eq('id', userId);
    }
  };

  // 4. Persistence Effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
    if (user && profile.mode) {
      // Debounced or simple sync
      const t = setTimeout(() => syncToDb(profile, user.id), 1000);
      return () => clearTimeout(t);
    }
  }, [profile, user]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_USER_PROFILE);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, []);

  const readinessScore = calculateReadiness(profile);

  return { profile, updateProfile, resetProfile, readinessScore, isSyncing, isLoaded };
}

