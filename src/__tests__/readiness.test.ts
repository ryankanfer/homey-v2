import { describe, it, expect } from 'vitest';
import { calculateReadiness, VAULT_UNLOCK_THRESHOLD, AGENT_UNLOCK_THRESHOLD } from '@/lib/readiness';
import { DEFAULT_USER_PROFILE } from '@/types/profile';
import type { UserProfile } from '@/types/profile';

const base: UserProfile = { ...DEFAULT_USER_PROFILE };

describe('calculateReadiness', () => {
  it('returns 0 for empty profile', () => {
    expect(calculateReadiness(base)).toBe(0);
  });

  it('scores each basic field as 10 points', () => {
    expect(calculateReadiness({ ...base, budgetTier: '$500k–$750k' })).toBe(10);
    expect(calculateReadiness({ ...base, territory: ['Park Slope'] })).toBe(10);
    expect(calculateReadiness({ ...base, timeline: 'ASAP' })).toBe(10);
    expect(calculateReadiness({ ...base, fear: 'Overpaying' })).toBe(10);
  });

  it('scores accuracy rating correctly', () => {
    expect(calculateReadiness({ ...base, accuracyRating: 'Yes, this is me' })).toBe(20);
    expect(calculateReadiness({ ...base, accuracyRating: 'Mostly' })).toBe(10);
    expect(calculateReadiness({ ...base, accuracyRating: 'Not quite' })).toBe(0);
  });

  it('uses maxMonthlyRent as budget signal for renters', () => {
    expect(calculateReadiness({ ...base, maxMonthlyRent: 3500 })).toBe(10);
  });

  it('uses moveInDate as timeline signal', () => {
    expect(calculateReadiness({ ...base, moveInDate: '2026-06-01' })).toBe(10);
  });

  it('scores buyer vault docs correctly', () => {
    const profile: UserProfile = {
      ...base,
      mode: 'Buy',
      vault: { ...base.vault, w2: true, bank: true, rebny: true, preapproval: true, attorney: true },
    };
    // 5 vault docs × 10 = 50
    expect(calculateReadiness(profile)).toBe(50);
  });

  it('scores renter vault docs correctly', () => {
    const profile: UserProfile = {
      ...base,
      mode: 'Rent',
      vault: { ...base.vault, w2: true, bank: true, guarantor: true, landlord: true, id: true },
    };
    expect(calculateReadiness(profile)).toBe(50);
  });

  it('caps score at 100', () => {
    const profile: UserProfile = {
      ...base,
      mode: 'Buy',
      budgetTier: '$500k–$750k',
      territory: ['Park Slope'],
      timeline: 'ASAP',
      fear: 'Overpaying',
      accuracyRating: 'Yes, this is me',
      vault: { ...base.vault, w2: true, bank: true, rebny: true, preapproval: true, attorney: true },
    };
    // 10+10+10+10+20+50 = 110, capped at 100
    expect(calculateReadiness(profile)).toBe(100);
  });

  it('VAULT_UNLOCK_THRESHOLD is reachable without vault docs', () => {
    // budget + territory + timeline + fear = 40
    const profile: UserProfile = {
      ...base,
      budgetTier: '$500k',
      territory: ['Manhattan'],
      timeline: '6 months',
      fear: 'Board rejection',
    };
    expect(calculateReadiness(profile)).toBeGreaterThanOrEqual(VAULT_UNLOCK_THRESHOLD);
  });

  it('AGENT_UNLOCK_THRESHOLD requires accuracy rating and some vault docs', () => {
    const belowThreshold: UserProfile = {
      ...base,
      budgetTier: '$500k',
      territory: ['Manhattan'],
      timeline: '6 months',
      fear: 'Board rejection',
      // score = 40, below 75
    };
    expect(calculateReadiness(belowThreshold)).toBeLessThan(AGENT_UNLOCK_THRESHOLD);
  });
});
