export type BuyerMode = 'Buy' | 'Rent' | 'Sell' | 'Own';
export type AccuracyRating = 'Yes, this is me' | 'Mostly' | 'Not quite';

export interface VaultState {
  w2: boolean;
  bank: boolean;
  rebny: boolean;
  preapproval: boolean;
  attorney: boolean;
}

export interface BuyerProfile {
  mode: BuyerMode | '';
  timeline: string;
  timelineContext: string;
  budgetTier: string;
  budgetContext: string;
  territory: string[];
  fear: string;
  fearContext: string;
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

export const DEFAULT_BUYER_PROFILE: BuyerProfile = {
  mode: '',
  timeline: '',
  timelineContext: '',
  budgetTier: '',
  budgetContext: '',
  territory: [],
  fear: '',
  fearContext: '',
  summary: '',
  journeyStage: 1,
  accuracyRating: null,
  isPartial: false,
  vault: { w2: false, bank: false, rebny: false, preapproval: false, attorney: false },
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
