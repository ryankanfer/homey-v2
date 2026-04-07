import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Users, Clock, AlertTriangle, ShieldAlert,
  Flame, Snowflake, Sun, ChevronDown, TrendingDown, AlertCircle, Eye
} from 'lucide-react';
import { ScoreAlert } from './ScoreAlert';
import { synthesizeAnomalies } from './FrictionTelemetry';
import { ScoreArc, JourneyMinimap, deriveJourneyStage } from './agentUtils';
import { cn } from '@/lib/utils';
import { ClientRow, ActiveProfile, FrictionTag } from './types';

// Constants (copied from original)
const FRICTION_LABELS: Record<FrictionTag, string> = {
  price_sensitivity: 'Price Sensitive',
  decision_paralysis: 'Decision Paralysis',
  partner_misalignment: 'Partner Misaligned',
  timing_uncertainty: 'Timing Uncertain',
  inventory_frustration: 'Inventory Frustrated',
  ghost_risk: 'Ghost Risk',
};

const FRICTION_COLORS: Record<FrictionTag, string> = {
  price_sensitivity: '#A8956E',
  decision_paralysis: '#8B7355',
  partner_misalignment: '#A8956E',
  timing_uncertainty: '#8B956E',
  inventory_frustration: '#8B7355',
  ghost_risk: '#8B3A3A',
};

interface ClientCardProps {
  client: ClientRow;
  activeProfile: ActiveProfile;
  isSelected: boolean;
  onClick: () => void;
  onUpdateMetadata: (clientId: string, patch: any) => void;
  vibe: string;
  urgency: { label: string; color: string } | null;
  riskIcons: { id: string; icon: React.ReactNode; label: string }[];
  scoreData: { label: string; icon: React.ReactNode; color: string; copy: string };
  lastTouchDays: number;
}

export function ClientCard({ 
  client, activeProfile, isSelected, onClick, onUpdateMetadata, 
  vibe, urgency, riskIcons, scoreData, lastTouchDays 
}: ClientCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const currentFriction = client.metadata?.friction_tag;

  const anomalyCount = useMemo(
    () => synthesizeAnomalies(client, activeProfile).filter(a => a.severity === 'critical' || a.severity === 'high').length,
    [client, activeProfile]
  );

  const urgencyStripColor = lastTouchDays <= 3
    ? '#4A7C59'
    : lastTouchDays <= 7
      ? '#A8956E'
      : '#8B3A3A';

  const journeyStage = deriveJourneyStage(activeProfile, client);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-pressed={isSelected}
      className={cn(
        "relative block bg-[#141412] border cursor-pointer transition-all duration-200 overflow-hidden group outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#C8B89A]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0B]",
        isSelected
          ? "border-[#C8B89A]/60 shadow-[0_0_24px_rgba(200,184,154,0.08),inset_0_0_0_1px_rgba(200,184,154,0.06)]"
          : "border-[#2A2A27] hover:border-[#C8B89A]/30 hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      )}
    >
      <ScoreAlert score={activeProfile.readiness_score} lastTouchDays={lastTouchDays} />

      {/* Main card body */}
      <div className="p-4 pb-3">
        {/* Row 1: Score arc + Name/Vibe + Risk icons */}
        <div className="flex items-start gap-3 mb-3.5">
          <ScoreArc score={activeProfile.readiness_score} size={48} />
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-serif text-[15px] leading-tight text-[#F0EDE8] truncate">
                {client.profile?.full_name || client.profile?.email?.split('@')[0] || 'Anonymous'}
              </h3>
              <div className="flex gap-1.5 shrink-0">
                {anomalyCount > 0 && (
                  <div title={`${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'}`}
                    className="p-0.5 rounded-sm bg-[#8B3A3A]/15 text-[#8B3A3A]">
                    <Eye className="w-2.5 h-2.5" />
                  </div>
                )}
                {riskIcons.map(r => (
                  <div key={r.id} title={r.label} className="p-0.5 rounded-sm bg-[#2A2A27]/60 text-[#6E6A65]">
                    {r.icon}
                  </div>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-[#7A7570] tracking-wide leading-none">{vibe}</span>
          </div>
        </div>

        {/* Row 2: Signal chips */}
        {(urgency || currentFriction) && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {urgency && (
              <span
                className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: urgency.color, backgroundColor: urgency.color + '18', border: `1px solid ${urgency.color}30` }}
              >
                {urgency.label}
              </span>
            )}
            {currentFriction && (
              <span
                className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  color: FRICTION_COLORS[currentFriction],
                  backgroundColor: FRICTION_COLORS[currentFriction] + '14',
                  border: `1px solid ${FRICTION_COLORS[currentFriction]}28`,
                }}
              >
                {FRICTION_LABELS[currentFriction]}
              </span>
            )}
          </div>
        )}

        {/* Row 3: Journey minimap + score label */}
        <div className="flex items-center justify-between py-2.5 border-y border-[#222220]">
          <JourneyMinimap stage={journeyStage} />
          <span
            className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
            style={{ color: scoreData.color }}
          >
            {scoreData.icon}
            <span className="opacity-90">{scoreData.label}</span>
          </span>
        </div>

        {/* Row 4: Territory + Budget */}
        <div className="flex items-center justify-between pt-2.5 text-[10px]">
          <span className="text-[#585550] truncate pr-2">
            {activeProfile.territory?.slice(0, 2).join(', ') || 'Anywhere'}
          </span>
          <span className="text-[#8A8580] font-medium shrink-0">
            {activeProfile.kind === 'renter'
              ? `$${activeProfile.max_monthly_rent || '—'}/mo`
              : activeProfile.budget_tier || '—'}
          </span>
        </div>
      </div>

      {/* Friction tagger footer */}
      <div
        className="px-4 py-2 border-t border-[#1E1E1C] bg-[#111110] relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-haspopup="listbox"
          aria-expanded={isDropdownOpen}
          aria-label={currentFriction ? `Friction: ${FRICTION_LABELS[currentFriction]}` : 'Tag friction'}
          className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[#525250] hover:text-[#C8B89A] transition-colors w-full min-h-[44px] py-3 cursor-pointer focus-visible:outline-none focus-visible:text-[#C8B89A]"
        >
          <span className={cn("flex-1 text-left", currentFriction && "text-[#A8956E]")}>
            {currentFriction ? FRICTION_LABELS[currentFriction].toUpperCase() : '+ Tag Friction'}
          </span>
          <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <motion.div
                role="listbox"
                aria-label="Friction tag options"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 bottom-full mb-1 w-52 bg-[#161614] border border-[#2E2E2B] py-1 z-20 shadow-2xl"
              >
                <div
                  role="option"
                  aria-selected={!currentFriction}
                  tabIndex={0}
                  className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-[#4A4A47] hover:bg-[#C8B89A]/8 hover:text-[#C8B89A] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[#C8B89A]/8"
                  onClick={() => { onUpdateMetadata(client.client_id, { friction_tag: undefined }); setIsDropdownOpen(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') { onUpdateMetadata(client.client_id, { friction_tag: undefined }); setIsDropdownOpen(false); } }}
                >
                  None
                </div>
                <div className="border-t border-[#2A2A27] my-1" />
                {(Object.entries(FRICTION_LABELS) as [FrictionTag, string][]).map(([k, v]) => (
                  <div
                    key={k}
                    role="option"
                    aria-selected={k === currentFriction}
                    tabIndex={0}
                    className={cn(
                      "px-3 py-2.5 text-[9px] uppercase tracking-widest cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[#C8B89A]/8",
                      k === currentFriction
                        ? "text-[#C8B89A] bg-[#C8B89A]/8"
                        : "text-[#7A7570] hover:bg-[#C8B89A]/8 hover:text-[#C8B89A]"
                    )}
                    onClick={() => { onUpdateMetadata(client.client_id, { friction_tag: k }); setIsDropdownOpen(false); }}
                    onKeyDown={e => { if (e.key === 'Enter') { onUpdateMetadata(client.client_id, { friction_tag: k }); setIsDropdownOpen(false); } }}
                  >
                    {v}
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Urgency signal strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] transition-colors duration-500"
        style={{
          background: `linear-gradient(90deg, ${urgencyStripColor}cc, ${urgencyStripColor}40)`,
        }}
      />
    </div>
  );
}
