import type { BuyerProfile } from '@/types/buyer';

export function calculateReadiness(profile: BuyerProfile): number {
  let score = 0;

  if (profile.budgetTier) score += 10;
  if (profile.territory?.length > 0) score += 10;
  if (profile.fear) score += 10;
  if (profile.accuracyRating === 'Yes, this is me') score += 20;
  else if (profile.accuracyRating === 'Mostly') score += 10;

  if (profile.vault?.w2) score += 10;
  if (profile.vault?.bank) score += 10;
  if (profile.vault?.rebny) score += 10;
  if (profile.vault?.preapproval) score += 10;
  if (profile.vault?.attorney) score += 10;

  return Math.min(score, 100);
}

export const VAULT_UNLOCK_THRESHOLD = 40;
export const REALITY_CHECK_UNLOCK_THRESHOLD = 60;
export const AGENT_UNLOCK_THRESHOLD = 75;
