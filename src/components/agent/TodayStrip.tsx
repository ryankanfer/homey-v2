import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UrgentClient {
  name: string;
  reason: string;
  color: string;
}

interface LeaseClock {
  name: string;
  moveInDate: string;
  daysRemaining: number;
}

interface TodayStripProps {
  stats: {
    touchesNeeded: number;
    leaseClocks: number;
    drifting: number;
  };
  urgentClients?: UrgentClient[];
  leaseClockClients?: LeaseClock[];
  yesterdayTouches?: number;
  yesterdayIntelligenceRuns?: number;
}

export function TodayStrip({
  stats,
  urgentClients = [],
  leaseClockClients = [],
  yesterdayTouches = 0,
  yesterdayIntelligenceRuns = 0,
}: TodayStripProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isEmpty = stats.touchesNeeded === 0 && stats.leaseClocks === 0 && stats.drifting === 0;

  return (
    <div className="border-t border-[#2A2A27]">
      {/* Strip row */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse daily brief' : 'Expand daily brief'}
        className={cn(
          'w-full px-6 py-2 flex items-center gap-3 overflow-x-auto scrollbar-hide transition-colors cursor-pointer',
          isEmpty ? 'bg-[#4A7C59]/5 hover:bg-[#4A7C59]/10' : 'bg-[#C8B89A]/5 hover:bg-[#C8B89A]/8'
        )}
      >
        <span className={cn(
          'text-[9px] font-bold uppercase tracking-widest shrink-0',
          isEmpty ? 'text-[#4A7C59]' : 'text-[#C8B89A]'
        )}>TODAY</span>

        {isEmpty ? (
          <span className="text-xs text-[#6E6A65] shrink-0">All clear — no urgent actions.</span>
        ) : (
          <div className="flex items-center gap-4 text-xs text-[#A8A49E] shrink-0">
            {stats.touchesNeeded > 0 && (
              <span><strong className="text-[#F0EDE8]">{stats.touchesNeeded}</strong> need touch</span>
            )}
            {stats.leaseClocks > 0 && (
              <span><strong className="text-[#8B3A3A]">{stats.leaseClocks}</strong> lease clock{stats.leaseClocks > 1 ? 's' : ''}</span>
            )}
            {stats.drifting > 0 && (
              <span><strong className="text-[#A8956E]">{stats.drifting}</strong> drifting</span>
            )}
          </div>
        )}

        <ChevronDown className={cn(
          'w-3 h-3 ml-auto shrink-0 transition-transform text-[#6E6A65]',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded Daily Brief */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#0D0D0B] border-t border-[#2A2A27] grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Top clients to contact */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#C8B89A] mb-3">Priority Touches</div>
                {urgentClients.length === 0 ? (
                  <p className="text-[11px] text-[#6E6A65]">No urgent touches.</p>
                ) : (
                  <div className="space-y-2">
                    {urgentClients.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: c.color }} />
                        <div>
                          <div className="text-[11px] font-medium text-[#F0EDE8]">{c.name}</div>
                          <div className="text-[10px] text-[#6E6A65]">{c.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lease clocks */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#8B3A3A] mb-3">Lease Clocks</div>
                {leaseClockClients.length === 0 ? (
                  <p className="text-[11px] text-[#6E6A65]">No active lease clocks.</p>
                ) : (
                  <div className="space-y-2">
                    {leaseClockClients.map((c, i) => (
                      <div key={i} className="flex items-start justify-between">
                        <div className="text-[11px] font-medium text-[#F0EDE8]">{c.name}</div>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: c.daysRemaining <= 14 ? '#8B3A3A' : '#A8956E' }}
                        >
                          {c.daysRemaining}d
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yesterday's summary */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#6E6A65] mb-3">Yesterday</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A8A49E]">Touches logged</span>
                    <strong className="text-[#F0EDE8]">{yesterdayTouches}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A8A49E]">Intelligence runs</span>
                    <strong className="text-[#F0EDE8]">{yesterdayIntelligenceRuns}</strong>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
