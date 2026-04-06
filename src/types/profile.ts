export type UserMode = 'Buy' | 'Rent' | 'Sell' | 'Own';
export type AccuracyRating = 'Yes, this is me' | 'Mostly' | 'Not quite';

export interface VaultState {
  w2: boolean;
  bank: boolean;
  rebny: boolean;
  preapproval: boolean;
  attorney: boolean;
  // Renter specific
  guarantor: boolean;
  landlord: boolean;
  id: boolean;
}

export interface UserProfile {
  fullName: string;
  mode: UserMode | '';
  timeline: string;
  timelineContext: string;
  moveInDate?: string;
  budgetTier: string;
  maxMonthlyRent?: number;
  meetsIncomeRequirement?: boolean;
  usingGuarantor?: boolean;
  budgetContext: string;
  territory: string[];
  fear: string;
  fearContext: string;
  frictionData?: {
    tension?: number;
    scenarios?: { scenario: string; reaction: string }[];
    triggers?: string[];
  };
  summary: string;
  journeyStage: number;
  accuracyRating: AccuracyRating | null;
  isPartial: boolean;
  vault: VaultState;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  fullName: '',
  mode: '',
  timeline: '',
  timelineContext: '',
  moveInDate: '',
  budgetTier: '',
  maxMonthlyRent: undefined,
  meetsIncomeRequirement: undefined,
  usingGuarantor: undefined,
  budgetContext: '',
  territory: [],
  fear: '',
  fearContext: '',
  summary: '',
  journeyStage: 1,
  accuracyRating: null,
  isPartial: false,
  vault: { w2: false, bank: false, rebny: false, preapproval: false, attorney: false, guarantor: false, landlord: false, id: false },
};

export const NEIGHBORHOOD_STATS: Record<string, {
  median: number;
  dom: number;
  ratio: number;
  insight: string;
}> = {
  'Park Slope': { median: 1150000, dom: 32, ratio: 1.02, insight: 'Bidding wars are common for well-priced 2BRs.' },
  'Cobble Hill': { median: 1250000, dom: 28, ratio: 1.05, insight: 'Inventory is at a 5-year low. Move fast.' },
  'West Village': { median: 1450000, dom: 45, ratio: 0.96, insight: 'Co-op boards are tightening requirements. Cash is king.' },
  'Carroll Gardens': { median: 1350000, dom: 35, ratio: 1.01, insight: 'Brownstones are seeing record numbers.' },
  'Prospect Heights': { median: 950000, dom: 40, ratio: 0.98, insight: 'Great value compared to Park Slope.' },
};

export const RENTER_NEIGHBORHOOD_STATS: Record<string, {
  medianRent: number;
  dom: number;
  concessions: string;
  insight: string;
}> = {
  'Park Slope': { medianRent: 4200, dom: 14, concessions: 'None', insight: 'Units lease within 48 hours of open house.' },
  'Cobble Hill': { medianRent: 4800, dom: 12, concessions: 'None', insight: 'Extremely scarce inventory. Prepare to offer over ask.' },
  'West Village': { medianRent: 5500, dom: 18, concessions: 'Rare', insight: 'Broker fees are standard 15%. Strict guarantor policies.' },
  'Carroll Gardens': { medianRent: 4500, dom: 15, concessions: 'None', insight: '1.5x security deposit sometimes requested for pets.' },
  'Prospect Heights': { medianRent: 3800, dom: 20, concessions: '1 month free (rare)', insight: 'Good value, but new developments are pulling up averages.' },
};
