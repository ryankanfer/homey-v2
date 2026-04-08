'use client';

import { useState, useEffect, useMemo } from 'react';
import type { AgentProfile } from '@/types/agent-profile';
import { DEFAULT_AGENT_PROFILE } from '@/types/agent-profile';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase';

export function useAgentProfile() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('agent_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (data) {
        setAgentProfile({
          phone: data.phone ?? '',
          headshotUrl: data.headshot_url ?? null,
          licenseNumber: data.license_number ?? '',
          brokerageName: data.brokerage_name ?? '',
          yearsExperience: data.years_experience ?? null,
          marketFocus: data.market_focus ?? [],
          bio: data.bio ?? '',
          onboardingCompleted: data.onboarding_completed,
        });
      } else {
        setAgentProfile(DEFAULT_AGENT_PROFILE);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user, supabase]);

  async function saveStep(data: Partial<AgentProfile>) {
    if (!user) throw new Error('Not authenticated');

    const dbData: Record<string, unknown> = { user_id: user.id };
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.headshotUrl !== undefined) dbData.headshot_url = data.headshotUrl;
    if (data.licenseNumber !== undefined) dbData.license_number = data.licenseNumber;
    if (data.brokerageName !== undefined) dbData.brokerage_name = data.brokerageName;
    if (data.yearsExperience !== undefined) dbData.years_experience = data.yearsExperience;
    if (data.marketFocus !== undefined) dbData.market_focus = data.marketFocus;
    if (data.bio !== undefined) dbData.bio = data.bio;
    if (data.onboardingCompleted !== undefined) dbData.onboarding_completed = data.onboardingCompleted;

    const { error } = await (supabase as any)
      .from('agent_profiles')
      .upsert(dbData, { onConflict: 'user_id' });

    if (error) throw error;

    setAgentProfile(prev => ({
      ...(prev ?? DEFAULT_AGENT_PROFILE),
      ...data,
    }));
  }

  async function uploadHeadshot(file: File): Promise<string> {
    if (!user) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('agent-headshots')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from('agent-headshots')
      .getPublicUrl(path);

    return data.publicUrl;
  }

  return { agentProfile, loading, saveStep, uploadHeadshot };
}
