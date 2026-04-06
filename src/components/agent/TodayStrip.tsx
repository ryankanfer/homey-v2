import React from 'react';

interface TodayStripProps {
  stats: {
    touchesNeeded: number;
    leaseClocks: number;
    drifting: number;
  };
}

export function TodayStrip({ stats }: TodayStripProps) {
  if (stats.touchesNeeded === 0 && stats.leaseClocks === 0 && stats.drifting === 0) {
    return (
      <div className="px-6 py-2 bg-[#4A7C59]/5 border-t border-[#2A2A27] flex items-center gap-3 overflow-x-auto scrollbar-hide">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#4A7C59] shrink-0">TODAY</span>
        <span className="text-xs text-[#6E6A65] shrink-0">All clear — no urgent actions.</span>
      </div>
    );
  }

  return (
    <div className="px-6 py-2 bg-[#C8B89A]/5 border-t border-[#2A2A27] flex items-center gap-3 overflow-x-auto scrollbar-hide">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#C8B89A] shrink-0">TODAY</span>
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
    </div>
  );
}
