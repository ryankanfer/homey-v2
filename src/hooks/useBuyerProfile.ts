'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BuyerProfile } from '@/types/buyer';
import { DEFAULT_BUYER_PROFILE } from '@/types/buyer';
import { calculateReadiness } from '@/lib/readiness';

const STORAGE_KEY = 'homey_profile_v2';

function loadProfile(): BuyerProfile {
  if (typeof window === 'undefined') return DEFAULT_BUYER_PROFILE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_BUYER_PROFILE, ...JSON.parse(saved) } : DEFAULT_BUYER_PROFILE;
  } catch {
    return DEFAULT_BUYER_PROFILE;
  }
}

export function useBuyerProfile() {
  const [profile, setProfile] = useState<BuyerProfile>(DEFAULT_BUYER_PROFILE);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  }, [profile]);

  const updateProfile = useCallback((updates: Partial<BuyerProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_BUYER_PROFILE);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, []);

  const readinessScore = calculateReadiness(profile);

  return { profile, updateProfile, resetProfile, readinessScore };
}
