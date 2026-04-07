import React from 'react';
import { Search, AlertCircle, Eye, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClientRow, StoryMode } from './types';
import { ClientCard } from './ClientCard';

// Shared Helpers (copied from original)
function getActiveProfile(client: ClientRow) {
  if (client.buyer_profile) return { ...client.buyer_profile, kind: 'buyer' as const };
  if (client.renter_profile) return { ...client.renter_profile, kind: 'renter' as const };
  return null;
}

interface ClientListProps {
  groupedClients: Record<'critical' | 'watch' | 'fyi', ClientRow[]>;
  search: string;
  setSearch: (s: string) => void;
  storyMode: StoryMode;
  setStoryMode: (m: StoryMode) => void;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  onUpdateMetadata: (clientId: string, patch: any) => void;
  getVibeLabel: (client: ClientRow, profile: any) => string;
  getUrgencySignal: (profile: any) => { label: string; color: string } | null;
  getRiskIcons: (profile: any) => any[];
  getScoreState: (profile: any) => any;
}

const STICKY_STYLES: Record<string, string> = {
  critical: 'bg-[#8B3A3A]/10 border-[#8B3A3A]/20 text-[#8B3A3A] sticky top-0 z-10 backdrop-blur-md',
  watch: 'bg-[#A8956E]/10 border-[#A8956E]/20 text-[#A8956E] sticky top-0 z-10 backdrop-blur-md',
  fyi: 'bg-[#2A2A27]/50 border-[#2A2A27]/50 text-[#6E6A65] sticky top-0 z-10 backdrop-blur-md',
};

export function ClientList({ 
  groupedClients, search, setSearch, storyMode, setStoryMode, 
  selectedClientId, setSelectedClientId, onUpdateMetadata,
  getVibeLabel, getUrgencySignal, getRiskIcons, getScoreState
}: ClientListProps) {
  return (
    <div className="w-full max-w-[420px] flex flex-col border-r border-[#2A2A27] bg-[#0D0D0B]">
      {/* Story Modes + Filter */}
      <div className="p-4 space-y-4 shrink-0">
         <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6A65]" />
          <input type="text" placeholder="Search name, friction, notes..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none pl-9 pr-3 py-2.5 text-xs text-[#F0EDE8] placeholder:text-[#6E6A65] transition-colors rounded-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5 hide-scrollbar overflow-x-auto">
          {(['today', 'bombs', 'quiet', 'ltv', 'all'] as const).map(mode => {
             const labels = { today: 'Today', bombs: 'Needs Attention', quiet: 'Going Silent', ltv: 'High Value', all: 'All Clients' };
             const active = storyMode === mode;
             return (
               <button key={mode} onClick={() => setStoryMode(mode)}
                 className={cn("px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest border rounded-full whitespace-nowrap transition-colors",
                  active ? "bg-[#6B8CAE]/10 border-[#6B8CAE] text-[#6B8CAE]" : "border-[#2A2A27] text-[#6E6A65] hover:border-[#6B8CAE]/50")}>
                 {labels[mode]}
               </button>
             )
          })}
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-4 custom-scrollbar">
         {Object.values(groupedClients).every(g => g.length === 0) && (
           <div className="py-16 text-center">
             <p className="text-[#6E6A65] text-[10px] font-bold uppercase tracking-widest">No clients match</p>
             <p className="text-[#4A4A47] text-xs mt-2">Try a different filter or search term</p>
           </div>
         )}
         {(['critical', 'watch', 'fyi'] as const).map(group => {
            const groupClients = groupedClients[group];
            if (groupClients.length === 0) return null;
            const groupMeta = {
              critical: { label: 'Critical', icon: <AlertCircle className="w-3 h-3" /> },
              watch:    { label: 'Watch',    icon: <Eye className="w-3 h-3" /> },
              fyi:      { label: 'FYI',      icon: <Info className="w-3 h-3" /> },
            };

            return (
              <div key={group} className="space-y-2">
                <div className={cn("px-2 py-1.5 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest rounded-sm border-y", STICKY_STYLES[group])}>
                  <span className="flex items-center gap-1.5">{groupMeta[group].icon} {groupMeta[group].label}</span>
                  <span className="opacity-75">{groupClients.length}</span>
                </div>

                <div className="space-y-4 pt-1">
                  {groupClients.map(client => {
                    const profile = getActiveProfile(client);
                    if (!profile) return null;
                    const lastTouchDays = client.metadata?.last_meaningful_touch?.date 
                      ? Math.ceil((Date.now() - new Date(client.metadata.last_meaningful_touch.date).getTime()) / 86400000)
                      : 999;
                    return (
                      <ClientCard 
                        key={client.client_id}
                        client={client}
                        activeProfile={profile}
                        isSelected={selectedClientId === client.client_id}
                        onClick={() => setSelectedClientId(client.client_id)}
                        onUpdateMetadata={onUpdateMetadata}
                        vibe={getVibeLabel(client, profile)}
                        urgency={getUrgencySignal(profile)}
                        riskIcons={getRiskIcons(profile)}
                        scoreData={getScoreState(profile)}
                        lastTouchDays={lastTouchDays}
                      />
                    );
                  })}
                </div>
              </div>
            );
         })}
      </div>
    </div>
  );
}
