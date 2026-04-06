import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, AlertTriangle, Clock, TrendingDown, Brain, 
  Calculator, FileSearch, Ghost, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClientRow, ActiveProfile, ClientMetadata, ListingHistory } from './types';

export interface BehavioralAnomaly {
  id: string;
  type: 'calculator_anxiety' | 'listing_churn' | 'ghost_drift' | 'budget_mismatch' | 'timeline_contradiction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  signal: string;
  interpretation: string;
  suggestion: string;
  detected_at: string;
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  critical: { border: '#8B3A3A', bg: 'rgba(139,58,58,0.08)', text: '#C75050', icon: '#C75050' },
  high: { border: '#A8956E', bg: 'rgba(168,149,110,0.06)', text: '#C8B89A', icon: '#C8B89A' },
  medium: { border: '#6E6A65', bg: 'rgba(110,106,101,0.04)', text: '#A8A49E', icon: '#A8A49E' },
  low: { border: '#2A2A27', bg: 'transparent', text: '#6E6A65', icon: '#6E6A65' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  calculator_anxiety: <Calculator className="w-3.5 h-3.5" />,
  listing_churn: <FileSearch className="w-3.5 h-3.5" />,
  ghost_drift: <Ghost className="w-3.5 h-3.5" />,
  budget_mismatch: <TrendingDown className="w-3.5 h-3.5" />,
  timeline_contradiction: <Clock className="w-3.5 h-3.5" />,
};

/**
 * Synthesize behavioral anomalies from existing profile + metadata signals.
 * This runs client-side using the data we already have.
 * In production, this would be backed by a proper event stream.
 */
export function synthesizeAnomalies(client: ClientRow, profile: ActiveProfile): BehavioralAnomaly[] {
  const anomalies: BehavioralAnomaly[] = [];
  const now = Date.now();
  const meta = client.metadata ?? {};

  // 1. Calculator Anxiety: fear_context mentions price/affordability + low readiness
  const fearCtx = (profile.fear_context || '').toLowerCase();
  const fear = (profile.fear || '').toLowerCase();
  if (
    (fear.includes('afford') || fear.includes('price') || fear.includes('overpay') || fearCtx.includes('payment') || fearCtx.includes('budget')) &&
    profile.readiness_score < 60
  ) {
    anomalies.push({
      id: 'calc-anxiety',
      type: 'calculator_anxiety',
      severity: profile.readiness_score < 40 ? 'critical' : 'high',
      signal: `Client stated budget as ${profile.kind === 'renter' ? `$${(profile as any).max_monthly_rent}/mo` : (profile as any).budget_tier}, but core fear is "${profile.fear}."`,
      interpretation: `Behavioral pattern indicates severe monthly payment anxiety. Budget context: "${profile.fear_context || 'not provided'}." The stated budget may not reflect their true comfort zone.`,
      suggestion: `Call today: offer to downsize the territory or adjust the budget tier to relieve financial pressure. Frame as "Let's find the right number, not the aspirational one."`,
      detected_at: new Date().toISOString(),
    });
  }

  // 2. Listing Churn: Lots of listings analyzed but none saved
  const history = meta.listing_history || [];
  if (history.length >= 3 && history.every(h => h.status !== 'saved')) {
    anomalies.push({
      id: 'listing-churn',
      type: 'listing_churn',
      severity: 'high',
      signal: `${history.length} listings analyzed, 0 saved. Client is feeding data but never committing.`,
      interpretation: `Analysis paralysis in action. Client is using the platform as a coping mechanism rather than a decision tool. They may be avoiding a conversation about what they actually want vs. what they think they should want.`,
      suggestion: `Schedule a 15-min "Reset Call." Ask: "If the perfect place existed, what ONE thing would it have?" Use that to narrow, not expand.`,
      detected_at: new Date().toISOString(),
    });
  }

  // 3. Ghost Drift: No touch in 7+ days with low readiness
  const lastTouch = meta.last_meaningful_touch;
  if (lastTouch?.date) {
    const daysSince = Math.ceil((now - new Date(lastTouch.date).getTime()) / 86400000);
    if (daysSince >= 10 && profile.readiness_score < 50) {
      anomalies.push({
        id: 'ghost-drift',
        type: 'ghost_drift',
        severity: daysSince >= 14 ? 'critical' : 'high',
        signal: `${daysSince} days since last meaningful touch. Readiness: ${profile.readiness_score}/100.`,
        interpretation: `Client is drifting into the "quiet quit" zone. They haven't disengaged formally, but behavioral momentum is near zero. Historically, 70% of clients who go 14+ days without contact never close.`,
        suggestion: `Send a "no pressure" market update via ${lastTouch.type === 'email' ? 'text' : 'email'} (change the channel). Include one specific listing that matches their stated criteria. Make it easy to re-engage.`,
        detected_at: new Date().toISOString(),
      });
    }
  }

  // 4. Budget Mismatch: budget_context hints at tension
  const budgetCtx = ((profile as any).budget_context || '').toLowerCase();
  if (
    budgetCtx.includes('stretch') || budgetCtx.includes('parents') || budgetCtx.includes('help') ||
    budgetCtx.includes('tight') || budgetCtx.includes('max') || budgetCtx.includes('limit')
  ) {
    anomalies.push({
      id: 'budget-mismatch',
      type: 'budget_mismatch',
      severity: 'medium',
      signal: `Budget context contains stress language: "${(profile as any).budget_context}"`,
      interpretation: `The client's stated budget may be aspirational rather than realistic. Their own words suggest financial strain or dependence on external funding (parents, partners, etc.).`,
      suggestion: `During your next call, gently ask: "Is this budget what you're comfortable with, or what you could theoretically max out at?" Reframe the search around the comfort number.`,
      detected_at: new Date().toISOString(),
    });
  }

  // 5. Timeline Contradiction: Says ASAP but profile is incomplete
  const timeline = (profile.timeline || '').toLowerCase();
  if ((timeline.includes('asap') || timeline.includes('immediately') || timeline.includes('this month')) && profile.is_partial) {
    anomalies.push({
      id: 'timeline-contradiction',
      type: 'timeline_contradiction',
      severity: 'high',
      signal: `Client stated timeline "${profile.timeline}" but profile is still incomplete (score: ${profile.readiness_score}).`,
      interpretation: `There's a disconnect between stated urgency and actual readiness. A client who truly needs to move "ASAP" would have completed their profile. This may indicate panic-browsing rather than genuine urgency.`,
      suggestion: `Validate urgency: "I see you need to move quickly. Let's make sure your docs are ready so we don't lose a great place to a faster applicant." This creates real urgency.`,
      detected_at: new Date().toISOString(),
    });
  }

  return anomalies.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

interface FrictionTelemetryProps {
  anomalies: BehavioralAnomaly[];
}

export function FrictionTelemetry({ anomalies }: FrictionTelemetryProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (anomalies.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-[#2A2A27] pb-2">
        <Eye className="w-4 h-4 text-[#8B3A3A]" />
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B3A3A]">
          Behavioral Anomalies Detected
        </h3>
        <span className="ml-auto text-[9px] text-[#6E6A65] uppercase tracking-widest">
          {anomalies.length} signal{anomalies.length !== 1 ? 's' : ''}
        </span>
      </div>

      {anomalies.map((anomaly) => {
        const styles = SEVERITY_STYLES[anomaly.severity];
        const isExpanded = expandedId === anomaly.id;

        return (
          <motion.div
            key={anomaly.id}
            layout
            className="border relative overflow-hidden"
            style={{ borderColor: styles.border, backgroundColor: styles.bg }}
          >
            {/* Severity bar */}
            <div 
              className="absolute top-0 left-0 w-1 h-full"
              style={{ backgroundColor: styles.border }}
            />

            <button
              onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
              className="w-full px-4 py-3 pl-5 flex items-start gap-3 text-left"
            >
              <div className="shrink-0 mt-0.5" style={{ color: styles.icon }}>
                {TYPE_ICONS[anomaly.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-relaxed" style={{ color: styles.text }}>
                  {anomaly.signal}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span 
                  className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border rounded-sm"
                  style={{ color: styles.text, borderColor: styles.border }}
                >
                  {anomaly.severity}
                </span>
                <ChevronDown 
                  className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")}
                  style={{ color: styles.icon }}
                />
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 space-y-3 border-t" style={{ borderColor: styles.border }}>
                    <div className="pt-3">
                      <div className="text-[9px] uppercase tracking-widest text-[#6E6A65] mb-1 font-bold">Interpretation</div>
                      <p className="text-xs text-[#A8A49E] leading-relaxed italic">
                        {anomaly.interpretation}
                      </p>
                    </div>
                    <div className="bg-[#0D0D0B] p-3 border border-[#2A2A27]">
                      <div className="text-[9px] uppercase tracking-widest text-[#C8B89A] mb-1 font-bold flex items-center gap-1">
                        <Brain className="w-3 h-3" /> Suggested Action
                      </div>
                      <p className="text-xs text-[#F0EDE8] leading-relaxed">
                        {anomaly.suggestion}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
