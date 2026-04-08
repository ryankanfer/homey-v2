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
  annualIncome?: number;
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
  annualIncome: undefined,
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
  'Chelsea': { median: 1450000, dom: 38, ratio: 0.98, insight: 'Strong demand for condo units with private outdoor space.' },
  'Financial District (FiDi)': { median: 1100000, dom: 52, ratio: 0.95, insight: 'Investment units seeing higher days on market lately.' },
  'Greenwich Village': { median: 1850000, dom: 28, ratio: 1.04, insight: 'Supply is critically low. All-cash offers dominate.' },
  'Harlem': { median: 850000, dom: 45, ratio: 0.97, insight: 'Townhouse inventory is steady, co-ops are high-value.' },
  'Lower East Side (LES)': { median: 975000, dom: 42, ratio: 0.98, insight: 'New developments are shifting the median upwards.' },
  'SoHo': { median: 2950000, dom: 60, ratio: 0.94, insight: 'Ultra-luxury lofts are trading at a slight discount.' },
  'Tribeca': { median: 3850000, dom: 55, ratio: 0.96, insight: 'Family-sized 3BR+ units remain the tightest sub-market.' },
  'Upper East Side (UES)': { median: 1350000, dom: 40, ratio: 0.97, insight: 'Classic co-ops are seeing more flexible board reviews.' },
  'Upper West Side (UWS)': { median: 1550000, dom: 35, ratio: 0.99, insight: 'Inventory near Central Park moves 20% faster than average.' },
  'Williamsburg': { median: 1250000, dom: 30, ratio: 1.02, insight: 'Waterfront condos are still seeing multiple offers.' },
  'Park Slope': { median: 1150000, dom: 32, ratio: 1.02, insight: 'Bidding wars are common for well-priced 2BRs.' },
  'Cobble Hill': { median: 1250000, dom: 28, ratio: 1.05, insight: 'Inventory is at a 5-year low. Move fast.' },
  'West Village': { median: 1450000, dom: 45, ratio: 0.96, insight: 'Co-op boards are tightening requirements. Cash is king.' },
  'Carroll Gardens': { median: 1350000, dom: 35, ratio: 1.01, insight: 'Brownstones are seeing record numbers.' },
  'Prospect Heights': { median: 950000, dom: 40, ratio: 0.98, insight: 'Great value compared to Park Slope.' },
  'DUMBO': { median: 1950000, dom: 34, ratio: 1.01, insight: 'Luxury loft conversions are the primary inventory.' },
  'Astoria': { median: 850000, dom: 48, ratio: 0.97, insight: 'Condo conversions are popular with first-time buyers.' },
  'Long Island City (LIC)': { median: 1150000, dom: 36, ratio: 1.00, insight: 'Inventory is high, but demand remains steady.' },
};

export const RENTER_NEIGHBORHOOD_STATS: Record<string, {
  medianRent: number;
  dom: number;
  concessions: string;
  insight: string;
}> = {
  'Chelsea': { medianRent: 5200, dom: 15, concessions: 'None', insight: 'High turnover in luxury doorman buildings.' },
  'Financial District (FiDi)': { medianRent: 4300, dom: 22, concessions: '1 Month Free', insight: 'Some flexibility on net-effective rents.' },
  'Greenwich Village': { medianRent: 4800, dom: 12, concessions: 'None', insight: 'Expect to offer over ask for renovated walk-ups.' },
  'Harlem': { medianRent: 2900, dom: 25, concessions: 'None', insight: 'Competitive pricing for multi-bedroom shares.' },
  'Lower East Side (LES)': { medianRent: 3800, dom: 20, concessions: 'Rare', insight: 'Units with in-unit laundry rent instantly.' },
  'SoHo': { medianRent: 7500, dom: 30, concessions: 'None', insight: 'Loft inventory is extremely scarce.' },
  'Tribeca': { medianRent: 8500, dom: 28, concessions: 'None', insight: 'Primarily high-end full-service buildings.' },
  'Upper East Side (UES)': { medianRent: 4100, dom: 18, concessions: 'Rare', insight: 'Studios/1BRs are moving faster than large units.' },
  'Upper West Side (UWS)': { medianRent: 4400, dom: 16, concessions: 'None', insight: 'Pre-war buildings are highly coveted.' },
  'Williamsburg': { medianRent: 4600, dom: 14, concessions: 'None', insight: 'Waterfront buildings maintain waitlists.' },
  'Park Slope': { medianRent: 4200, dom: 14, concessions: 'None', insight: 'Units lease within 48 hours of open house.' },
  'Cobble Hill': { medianRent: 4800, dom: 12, concessions: 'None', insight: 'Extremely scarce inventory. Prepare to offer over ask.' },
  'West Village': { medianRent: 5500, dom: 18, concessions: 'Rare', insight: 'Broker fees are standard 15%. Strict guarantor policies.' },
  'Carroll Gardens': { medianRent: 4500, dom: 15, concessions: 'None', insight: '1.5x security deposit sometimes requested for pets.' },
  'Prospect Heights': { medianRent: 3800, dom: 20, concessions: '1 month free (rare)', insight: 'Good value, but new developments are pulling up averages.' },
  'DUMBO': { medianRent: 5800, dom: 14, concessions: 'None', insight: 'Top-tier amenities drive premium pricing.' },
  'Astoria': { medianRent: 3200, dom: 24, concessions: 'None', insight: 'Inventory is stable, mostly in smaller buildings.' },
  'Long Island City (LIC)': { medianRent: 4400, dom: 18, concessions: '1 Month Free (new)', insight: 'Large new developments offering select perks.' },
};
