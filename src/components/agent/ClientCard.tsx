import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Clock, AlertTriangle, ShieldAlert, 
  Flame, Snowflake, Sun, ChevronDown, TrendingDown, AlertCircle, Eye
} from 'lucide-react';
import { ScoreAlert } from './ScoreAlert';
import { synthesizeAnomalies } from './FrictionTelemetry';
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

  const currentFriction = client.metadata?.friction_tag;

  const anomalyCount = useMemo(
    () => synthesizeAnomalies(client, activeProfile).filter(a => a.severity === 'critical' || a.severity === 'high').length,
    [client, activeProfile]
  );

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative block p-4 bg-[#141412] border cursor-pointer hover:border-[#C8B89A]/50 transition-all rounded-sm",
        isSelected ? "border-[#C8B89A] shadow-[0_0_15px_rgba(200,184,154,0.1)]" : "border-[#2A2A27]"
      )}
    >
      <ScoreAlert score={activeProfile.readiness_score} lastTouchDays={lastTouchDays} />
      {/* Row 1: Name + Vibe */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-serif text-[17px] leading-none mb-1 group-hover:text-[#C8B89A] transition-colors">
            {client.profile?.full_name || client.profile?.email?.split('@')[0] || 'Anonymous'}
          </h3>
          <span className="text-[9px] text-[#A8A49E]">{vibe}</span>
        </div>
        <div className="flex gap-1.5 opacity-60">
          {anomalyCount > 0 && (
            <div title={`${anomalyCount} behavioral anomal${anomalyCount === 1 ? 'y' : 'ies'} detected`} className="text-[#8B3A3A] animate-pulse">
              <Eye className="w-3 h-3" />
            </div>
          )}
          {riskIcons.map(r => (
            <div key={r.id} title={r.label} className="text-[#6E6A65]">{r.icon}</div>
          ))}
        </div>
      </div>

      {/* Row 2: Urgent Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {urgency && (
          <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border rounded-sm"
            style={{ color: urgency.color, borderColor: urgency.color, backgroundColor: urgency.color + '10' }}>
            {urgency.label}
          </span>
        )}
        {currentFriction && (
          <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border rounded-sm"
            style={{ color: FRICTION_COLORS[currentFriction], borderColor: FRICTION_COLORS[currentFriction] }}>
            {FRICTION_LABELS[currentFriction]}
          </span>
        )}
      </div>

      {/* Row 3: Score */}
      <div className="flex items-center gap-2 mb-3 border-b border-[#2A2A27]/50 pb-3">
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-[#1A1A18]" style={{ color: scoreData.color }}>
          {scoreData.icon} {activeProfile.readiness_score} — {scoreData.label}
        </span>
        <span className="text-[10px] text-[#A8A49E] truncate">{scoreData.copy}</span>
      </div>

      {/* Row 4: Territory + Budget */}
      <div className="flex items-center justify-between text-[10px] text-[#6E6A65] mt-1">
         <span>{activeProfile.territory?.slice(0,2).join(', ') || 'Anywhere'}</span>
         <span>{activeProfile.kind === 'renter' ? `$${activeProfile.max_monthly_rent||'—'}/mo` : (activeProfile.budget_tier||'—')}</span>
      </div>

      {/* Custom Friction Dropdown */}
      <div className="mt-4 relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#6E6A65] hover:text-[#C8B89A] transition-colors"
        >
          {currentFriction ? FRICTION_LABELS[currentFriction].toUpperCase() : '+ ADD FRICTION'}
          <ChevronDown className={cn("w-3 h-3 transition-transform", isDropdownOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 bottom-full mb-2 w-48 bg-[#141412] border border-[#2A2A27] py-1 z-20 shadow-xl rounded-sm"
              >
                <div 
                  className="px-3 py-2 text-[9px] text-[#6E6A65] hover:bg-[#C8B89A]/10 hover:text-[#C8B89A] cursor-pointer"
                  onClick={() => { onUpdateMetadata(client.client_id, { friction_tag: undefined }); setIsDropdownOpen(false); }}
                >
                  NONE
                </div>
                {(Object.entries(FRICTION_LABELS) as [FrictionTag, string][]).map(([k, v]) => (
                  <div 
                    key={k}
                    className="px-3 py-2 text-[9px] text-[#A8A49E] hover:bg-[#C8B89A]/10 hover:text-[#C8B89A] cursor-pointer"
                    onClick={() => { onUpdateMetadata(client.client_id, { friction_tag: k }); setIsDropdownOpen(false); }}
                  >
                    {v.toUpperCase()}
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
