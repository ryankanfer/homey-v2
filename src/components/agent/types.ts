import { ReactNode } from 'react';

export type FrictionTag =
  | 'price_sensitivity' | 'decision_paralysis' | 'partner_misalignment'
  | 'timing_uncertainty' | 'inventory_frustration' | 'ghost_risk';

export type AgentConfidence = 'very_confident' | 'moderately_confident' | 'low_confidence' | 'unsure';

export interface LastMeaningfulTouch {
  type: 'call' | 'text' | 'email' | 'showing' | 'meeting' | 'other';
  date: string;
  summary?: string;
}

export interface ListingHistory {
  url: string;
  status: 'analyzed' | 'rejected' | 'saved';
  note?: string;
  date: string;
}

export interface ClientAIIntelligence {
  narrative: string;
  next_action: { action: string; urgency: 'now' | 'this_week' | 'soon'; rationale: string };
  risk_signals: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    reason: string;
  }[];
  coaching_note?: string;
  momentum: 'rising' | 'steady' | 'falling' | 'stalled' | null;
  generated_at: string;
}

export interface ClientMetadata {
  friction_tag?: FrictionTag;
  agent_confidence?: AgentConfidence;
  last_meaningful_touch?: LastMeaningfulTouch;
  ai_intelligence?: ClientAIIntelligence;
  listing_history?: ListingHistory[];
}

export type VaultDoc = {
  w2?: boolean; bank?: boolean; rebny?: boolean; preapproval?: boolean; attorney?: boolean;
  guarantor?: boolean; landlord?: boolean; id?: boolean;
};

export interface BuyerProfileRow {
  mode: string | null; budget_tier: string | null; budget_context: string | null;
  territory: string[]; fear: string | null; fear_context: string | null;
  timeline: string | null; timeline_context: string | null; summary: string | null;
  readiness_score: number; vault: VaultDoc; is_partial: boolean; accuracy_rating: string | null;
}

export interface RenterProfileRow {
  mode: 'Rent'; budget_monthly: string | null; max_monthly_rent: number | null;
  move_in_date: string | null; meets_income_req: boolean | null; using_guarantor: boolean | null;
  budget_context: string | null; territory: string[]; fear: string | null; fear_context: string | null;
  timeline: string | null; timeline_context: string | null; summary: string | null;
  readiness_score: number; vault: VaultDoc; is_partial: boolean; accuracy_rating: string | null;
}

export interface ClientRow {
  client_id: string; status: 'pending' | 'active' | 'closed';
  metadata: ClientMetadata;
  profile: { full_name: string | null; email: string | null };
  buyer_profile: BuyerProfileRow | null;
  renter_profile: RenterProfileRow | null;
}

export type ActiveProfile = (BuyerProfileRow & { kind: 'buyer' }) | (RenterProfileRow & { kind: 'renter' });

export type StoryMode = 'today' | 'bombs' | 'quiet' | 'ltv' | 'all';
