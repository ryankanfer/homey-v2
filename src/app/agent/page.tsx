'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Brain, Copy, ShieldAlert, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/realtime-js';

// Global types/components from our new modular structure
import { 
  ClientRow, StoryMode, ClientMetadata, ClientAIIntelligence, 
  FrictionTag, LastMeaningfulTouch, ActiveProfile 
} from '@/components/agent/types';
import { TodayStrip } from '@/components/agent/TodayStrip';
import { ClientList } from '@/components/agent/ClientList';
import { ClientSpotlight } from '@/components/agent/ClientSpotlight';

// Re-use some logic helpers from the original that are too specific to put in generic components
import { 
  Flame, Snowflake, Sun, Phone, MessageSquare, Eye, Calendar, Clock, Users, AlertTriangle 
} from 'lucide-react';

function getActiveProfile(client: ClientRow): ActiveProfile | null {
  if (client.buyer_profile) return { ...client.buyer_profile, kind: 'buyer' };
  if (client.renter_profile) return { ...client.renter_profile, kind: 'renter' };
  return null;
}

function getUrgencySignal(profile: ActiveProfile): { label: string; color: string } | null {
  if (profile.kind === 'renter' && profile.move_in_date) {
    const days = Math.ceil((new Date(profile.move_in_date).getTime() - Date.now()) / 86400000);
    const color = days <= 30 ? '#8B3A3A' : days <= 60 ? '#A8956E' : '#6E6A65';
    const label = days <= 60 ? `MOVE-IN IN ${days}D` : `MOVE-IN ${new Date(profile.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    return { label, color };
  }
  if (profile.timeline) {
    const urgent = ['immediately', 'asap', 'this month', 'next month'].some(k => profile.timeline!.toLowerCase().includes(k));
    return { label: profile.timeline.toUpperCase(), color: urgent ? '#8B3A3A' : '#6E6A65' };
  }
  return null;
}

function getAttentionGroup(client: ClientRow): 'critical' | 'watch' | 'fyi' {
  const ap = getActiveProfile(client);
  if (!ap) return 'fyi';
  const meta = client.metadata ?? {};
  if (meta.friction_tag === 'ghost_risk') return 'critical';
  if (ap.readiness_score >= 75 && !ap.is_partial && client.status === 'pending') return 'critical';
  if (ap.kind === 'renter' && ap.move_in_date) {
    const days = Math.ceil((new Date(ap.move_in_date).getTime() - Date.now()) / 86400000);
    if (days <= 30) return 'critical';
  }
  if (ap.readiness_score >= 40 || ap.timeline?.toLowerCase().includes('asap') || ap.timeline?.toLowerCase().includes('immediately')) return 'watch';
  return 'fyi';
}

function getVibeLabel(client: ClientRow, profile: ActiveProfile): string {
  if (profile.is_partial) return 'Just Browsing';
  const fear = (profile.fear || '').toLowerCase();
  if (fear.includes('overpaying') || fear.includes('price')) return 'Budget Explorer';
  if (fear.includes('missing out') || fear.includes('fast')) return 'Anxious Sprinter';
  if (fear.includes('management') || fear.includes('super')) return 'Quality Stickler';
  if (fear.includes('guarantor') || fear.includes('income')) return 'Approval Anxious';
  if (fear.includes('partner') || fear.includes('align')) return 'Consensus Seeker';
  if (profile.timeline?.toLowerCase().includes('asap')) return 'Urgent Mover';
  if (profile.readiness_score > 80) return 'Ready to Strike';
  return 'Cautious Planner';
}

function getScoreState(profile: ActiveProfile) {
  const score = profile.readiness_score || 0;
  if (score >= 70) return { label: 'Hot', icon: <Flame className="w-3 h-3" />, color: '#8B3A3A', copy: 'Ready for action right now. Prioritize.' };
  if (score >= 45) return { label: 'Warming', icon: <Sun className="w-3 h-3" />, color: '#A8956E', copy: 'Needs a bit more nurturing.' };
  return { label: 'Cold', icon: <Snowflake className="w-3 h-3" />, color: '#6E6A65', copy: 'Early stage. Mostly browsing.' };
}

function getRiskIcons(profile: ActiveProfile) {
  const risks: { id: string; icon: React.ReactNode; label: string }[] = [];
  if (profile.kind === 'renter' && profile.using_guarantor) risks.push({ id: 'guarantor', icon: <ShieldAlert className="w-3 h-3" />, label: 'Guarantor Needed' });
  if (profile.territory?.length < 2) risks.push({ id: 'inventory', icon: <AlertTriangle className="w-3 h-3" />, label: 'Narrow Search Area' });
  if (profile.timeline?.toLowerCase().includes('asap')) risks.push({ id: 'timing', icon: <Clock className="w-3 h-3" />, label: 'Urgent Timing' });
  if (profile.fear?.toLowerCase().includes('partner')) risks.push({ id: 'partner', icon: <Users className="w-3 h-3" />, label: 'Partner Alignment' });
  return risks;
}

function getSuggestedTouch(friction?: FrictionTag, lastTouch?: LastMeaningfulTouch) {
  if (friction === 'decision_paralysis') return { text: "Text in 2d · Send strong backup option to unblock", type: "text" as const, channel: "Text" };
  if (friction === 'timing_uncertainty') return { text: "Call tomorrow · Confirm hard deadline for move", type: "call" as const, channel: "Call" };
  if (friction === 'ghost_risk') return { text: "Email today · Soft check-in with market report", type: "email" as const, channel: "Email" };
  if (friction === 'inventory_frustration') return { text: "Text today · Send off-market tease", type: "text" as const, channel: "Text" };
  return { text: "Text in 3d · Standard check-in", type: "text" as const, channel: "Text" };
}

export default function AgentDashboard() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

  // Filters & State
  const [search, setSearch] = useState('');
  const [storyMode, setStoryMode] = useState<StoryMode>('today');
  
  // Slide Over & Side Panel states
  const [listingUrl, setListingUrl] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingAnalysis, setStreamingAnalysis] = useState('');
  const [analyses, setAnalyses] = useState<any[]>([]);

  // Matchmaking state
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);

  const [intelligenceData, setIntelligenceData] = useState<ClientAIIntelligence | null>(null);
  const [isGeneratingIntelligence, setIsGeneratingIntelligence] = useState(false);

  const [toasts, setToasts] = useState<{id: string, message: string}[]>([]);
  const addToast = (message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const buyerChannelRef = useRef<RealtimeChannel | null>(null);
  const renterChannelRef = useRef<RealtimeChannel | null>(null);

  const shareLink = user ? `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/interview?ref=${user.id}` : '';

  // Auth guard
  useEffect(() => {
    if (!isLoading && (!user || role !== 'agent')) {
      router.replace('/auth');
    }
  }, [user, role, isLoading, router]);

  // Load clients
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: links } = await supabase.from('agent_clients').select(`client_id, status, metadata, profile:profiles!client_id(full_name, email)`).eq('agent_id', user.id).order('created_at', { ascending: false });
      if (!links || links.length === 0) {
        setClients([]);
        setLoadingClients(false);
        return;
      }
      const clientIds = links.map((l: any) => l.client_id);
      const [buyerRes, renterRes] = await Promise.all([
        supabase.from('buyer_profiles').select('*').in('user_id', clientIds),
        supabase.from('renter_profiles').select('*').in('user_id', clientIds),
      ]);
      const buyerMap = new Map((buyerRes.data || []).map((b: any) => [b.user_id, b]));
      const renterMap = new Map((renterRes.data || []).map((r: any) => [r.user_id, r]));

      const rows: ClientRow[] = links.map((link: any) => ({
        client_id: link.client_id,
        status: link.status,
        metadata: link.metadata ?? {},
        profile: link.profile ?? { full_name: null, email: null },
        buyer_profile: buyerMap.get(link.client_id) ?? null,
        renter_profile: renterMap.get(link.client_id) ?? null,
      }));
      setClients(rows);
      setLoadingClients(false);

      buyerChannelRef.current = supabase
        .channel('buyer_profile_changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'buyer_profiles', filter: `user_id=in.(${clientIds.join(',')})` }, () => load())
        .subscribe();
      
      renterChannelRef.current = supabase
        .channel('renter_profile_changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'renter_profiles', filter: `user_id=in.(${clientIds.join(',')})` }, () => load())
        .subscribe();
    };
    load();
    const agentChannel = supabase.channel('agent_clients_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_clients', filter: `agent_id=eq.${user.id}` }, load).subscribe();
    return () => {
      supabase.removeChannel(agentChannel);
      if (buyerChannelRef.current) supabase.removeChannel(buyerChannelRef.current);
      if (renterChannelRef.current) supabase.removeChannel(renterChannelRef.current);
    };
  }, [user, supabase]);

  // Read Intelligence on select
  useEffect(() => {
    setIntelligenceData(null);
    setStreamingAnalysis('');
    if (selectedClientId) {
      const client = clients.find(c => c.client_id === selectedClientId);
      const cached = client?.metadata?.ai_intelligence;
      if (cached?.generated_at) {
        if (Date.now() - new Date(cached.generated_at).getTime() < 24 * 60 * 60 * 1000) {
          setIntelligenceData(cached);
        }
      }
      // fetch listing history
      const loadAns = async () => {
        const { data } = await supabase.from('listing_analyses').select('*').eq('agent_id', user!.id).eq('client_id', selectedClientId).order('created_at', { ascending: false });
        setAnalyses(data || []);
      };
      if (user) loadAns();
    }
  }, [selectedClientId, clients, user, supabase]);

  const updateMetadata = async (clientId: string, patch: Partial<ClientMetadata>) => {
    const client = clients.find(c => c.client_id === clientId);
    const newMeta = { ...(client?.metadata ?? {}), ...patch };
    await (supabase.from('agent_clients') as any).update({ metadata: newMeta } as any).eq('agent_id', user!.id).eq('client_id', clientId);
    setClients(prev => prev.map(c => c.client_id === clientId ? { ...c, metadata: newMeta } : c));
  };

  const logTouchDate = async (clientId: string, type: string) => {
    const touch: LastMeaningfulTouch = { type: type as any, date: new Date().toISOString() };
    await updateMetadata(clientId, { last_meaningful_touch: touch });
    addToast('Touch logged successfully.');
  };

  const generateIntelligence = async () => {
    const c = clients.find(x => x.client_id === selectedClientId);
    if (!c) return;
    const ap = getActiveProfile(c);
    if (!ap) return;
    setIsGeneratingIntelligence(true);
    try {
      const res = await fetch('/api/client-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: c.profile?.full_name || 'Client', profile: ap, metadata: c.metadata }),
      });
      const { intelligence } = await res.json();
      if (intelligence) {
        setIntelligenceData(intelligence);
        await updateMetadata(c.client_id, { ai_intelligence: intelligence });
        addToast('Intelligence Brief updated.');
      }
    } catch (err) {}
    setIsGeneratingIntelligence(false);
  };

  const submitListing = async () => {
    const c = clients.find(x => x.client_id === selectedClientId);
    if (!listingUrl.trim() || !c) return;
    const url = listingUrl.trim();
    setListingUrl('');
    setIsStreaming(true);
    setStreamingAnalysis('');
    const history = c.metadata.listing_history || [];
    const newHistory = [{ url, status: 'analyzed' as const, date: new Date().toISOString() }, ...history].slice(0, 3);
    await updateMetadata(c.client_id, { listing_history: newHistory });

    try {
      const res = await fetch('/api/listing-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, clientId: c.client_id, clientProfile: getActiveProfile(c) }),
      });
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreamingAnalysis(acc);
        }
      }
      const { data } = await supabase.from('listing_analyses').select('*').eq('agent_id', user!.id).eq('client_id', c.client_id).order('created_at', { ascending: false });
      setAnalyses(data || []);
      setStreamingAnalysis('');
    } catch (err) {
      setStreamingAnalysis('Analysis failed.');
    }
    setIsStreaming(false);
  };

  const todayStats = useMemo(() => {
    let touchesNeeded = 0;
    let leaseClocks = 0;
    let drifting = 0;
    for (const c of clients) {
      const ap = getActiveProfile(c);
      if (!ap) continue;
      const touchDays = c.metadata?.last_meaningful_touch?.date ? Math.ceil((Date.now() - new Date(c.metadata.last_meaningful_touch.date).getTime()) / 86400000) : 999;
      if (touchDays >= 5 && c.status !== 'closed') touchesNeeded++;
      if (ap.kind === 'renter' && ap.move_in_date) {
        const d = Math.ceil((new Date(ap.move_in_date).getTime() - Date.now()) / 86400000);
        if (d > 0 && d <= 45) leaseClocks++;
      }
      if (touchDays >= 7 && ap.readiness_score < 60) drifting++;
    }
    return { touchesNeeded, leaseClocks, drifting };
  }, [clients]);

  const filteredClients = useMemo(() => {
    let list = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const ap = getActiveProfile(c);
        return (
          c.profile?.full_name?.toLowerCase().includes(q) ||
          c.profile?.email?.toLowerCase().includes(q) ||
          (c.metadata?.friction_tag ?? '').replace('_', ' ').includes(q) ||
          (ap?.territory ?? []).join(' ').toLowerCase().includes(q) ||
          (ap?.summary ?? '').toLowerCase().includes(q)
        );
      });
    }
    list = list.filter(c => {
      if (storyMode === 'all') return true;
      const ap = getActiveProfile(c);
      if (!ap) return false;
      if (storyMode === 'today') {
        const isTimingFriction = ['timing_uncertainty', 'inventory_frustration', 'ghost_risk'].includes(c.metadata?.friction_tag || '');
        let urgentMove = false;
        if (ap.kind === 'renter' && ap.move_in_date) {
            const days = Math.ceil((new Date(ap.move_in_date).getTime() - Date.now()) / 86400000);
            if (days <= 30) urgentMove = true;
        }
        let staleTouch = false;
        if (c.metadata?.last_meaningful_touch?.date) {
            const touchDays = Math.ceil((Date.now() - new Date(c.metadata.last_meaningful_touch.date).getTime()) / 86400000);
            if (touchDays >= 5) staleTouch = true;
        }
        return isTimingFriction || urgentMove || staleTouch;
      }
      if (storyMode === 'bombs') {
        let urgentMove = false;
        if (ap.kind === 'renter' && ap.move_in_date) {
            const days = Math.ceil((new Date(ap.move_in_date).getTime() - Date.now()) / 86400000);
            if (days <= 30) urgentMove = true;
        }
        const urgentTimeline = ap.timeline?.toLowerCase().includes('asap') || ap.timeline?.toLowerCase().includes('immediately');
        return urgentMove || urgentTimeline;
      }
      if (storyMode === 'quiet') {
        let staleTouch = false;
        if (c.metadata?.last_meaningful_touch?.date) {
            const touchDays = Math.ceil((Date.now() - new Date(c.metadata.last_meaningful_touch.date).getTime()) / 86400000);
            if (touchDays >= 7) staleTouch = true;
        }
        return staleTouch && ap.readiness_score < 50;
      }
      if (storyMode === 'ltv') {
        if (ap.kind === 'renter') return (ap.max_monthly_rent || 0) >= 5000;
        const tier = ap.budget_tier || '';
        return tier.includes('2M') || tier.includes('3M') || tier.includes('4M') || tier.includes('5M');
      }
      return true;
    });
    list.sort((a, b) => (getActiveProfile(b)?.readiness_score ?? 0) - (getActiveProfile(a)?.readiness_score ?? 0));
    return list;
  }, [clients, search, storyMode]);

  const groupedClients = useMemo(() => {
    const critical: ClientRow[] = [];
    const watch: ClientRow[] = [];
    const fyi: ClientRow[] = [];
    for (const c of filteredClients) {
      const g = getAttentionGroup(c);
      if (g === 'critical') critical.push(c);
      else if (g === 'watch') watch.push(c);
      else fyi.push(c);
    }
    return { critical, watch, fyi };
  }, [filteredClients]);

  // Mock matchmaking results
  const matchmakingMatches = useMemo(() => {
     if (!selectedClientId) return [];
     const current = clients.find(c => c.client_id === selectedClientId);
     if (!current) return [];
     const ap = getActiveProfile(current);
     if (!ap) return [];
     
     // Match logic: Same territory + within 20% budget
     return clients
       .filter(c => c.client_id !== selectedClientId)
       .map(c => {
          const cap = getActiveProfile(c);
          if (!cap) return null;
          const commonTerritory = ap.territory.filter(t => cap.territory.includes(t));
          if (commonTerritory.length === 0) return null;
          
          let score = 50 + (commonTerritory.length * 10);
          let reason = `Also searching in ${commonTerritory.join(', ')}.`;
          
          if (ap.kind === 'renter' && cap.kind === 'renter') {
            const budgetDiff = Math.abs((ap.max_monthly_rent||0) - (cap.max_monthly_rent||0));
            if (budgetDiff < 500) {
              score += 20;
              reason += ` Budgets are highly aligned (within $500).`;
            }
          }
          if (score < 60) return null;
          return { client: c, reason, score: Math.min(score, 98) };
       })
       .filter((x): x is { client: ClientRow, reason: string, score: number } => x !== null)
       .sort((a, b) => b.score - a.score);
  }, [selectedClientId, clients]);

  const selectedClient = clients.find(c => c.client_id === selectedClientId) ?? null;
  const activeProfile = selectedClient ? getActiveProfile(selectedClient) : null;

  if (isLoading) return (
    <div className="min-h-screen bg-[#0D0D0B] flex flex-col">
      <div className="border-b border-[#2A2A27] px-6 py-4">
        <div className="h-6 w-36 bg-[#1A1A17] rounded animate-pulse" />
      </div>
      <div className="flex-1 flex">
        <div className="w-full lg:max-w-[420px] p-4 space-y-3 border-r border-[#2A2A27]">
          {[1, 0.8, 0.6, 0.4, 0.3].map((opacity, i) => (
            <div key={i} className="h-24 bg-[#1A1A17] rounded animate-pulse" style={{ opacity }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0D0B] text-[#F0EDE8] flex flex-col font-sans">
      <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} className="bg-[#141412] border border-[#C8B89A] px-4 py-2 text-[10px] uppercase tracking-widest text-[#C8B89A] shadow-xl pointer-events-auto">
              {t.message}
            </div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col border-b border-[#2A2A27] bg-[#0D0D0B]/80 backdrop-blur-lg sticky top-0 z-40">
        <nav className="flex items-center justify-between px-6 py-4">
          <span className="font-serif italic text-2xl text-[#C8B89A] tracking-tighter">homey. advsr</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { navigator.clipboard.writeText(shareLink); addToast('Client Link Copied!'); }}
              className="flex items-center gap-2 px-3 py-1.5 border border-[#2A2A27] hover:border-[#C8B89A] transition-colors rounded-sm group text-[10px] uppercase tracking-widest text-[#6E6A65] hover:text-[#C8B89A]"
            >
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">Copy Client Link</span>
            </button>
            <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse shadow-[0_0_8px_#4A7C59]" />
          </div>
        </nav>
        <TodayStrip stats={todayStats} />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Client list: full-width on mobile when no client selected, fixed-width sidebar on desktop */}
        <div className={selectedClientId ? 'hidden lg:flex lg:w-auto' : 'flex w-full lg:w-auto'}>
          <ClientList
            groupedClients={groupedClients}
            search={search}
            setSearch={setSearch}
            storyMode={storyMode}
            setStoryMode={setStoryMode}
            selectedClientId={selectedClientId}
            setSelectedClientId={setSelectedClientId}
            onUpdateMetadata={updateMetadata}
            getVibeLabel={getVibeLabel}
            getUrgencySignal={getUrgencySignal}
            getRiskIcons={getRiskIcons}
            getScoreState={getScoreState}
          />
        </div>

        {/* Right panel: full-width on mobile when client selected, flex-1 on desktop */}
        <div className={`${selectedClientId ? 'flex w-full' : 'hidden lg:flex'} flex-1 overflow-hidden relative bg-[#0D0D0B] justify-center`}>
          <AnimatePresence mode="wait">
            {selectedClient && activeProfile && (
              <ClientSpotlight
                key={selectedClient.client_id}
                selectedClient={selectedClient}
                activeProfile={activeProfile}
                onClose={() => setSelectedClientId(null)}
                vibe={getVibeLabel(selectedClient, activeProfile)}
                suggestedTouch={getSuggestedTouch(selectedClient.metadata?.friction_tag, selectedClient.metadata?.last_meaningful_touch)}
                logTouchDate={logTouchDate}
                intelligenceData={intelligenceData}
                isGeneratingIntelligence={isGeneratingIntelligence}
                generateIntelligence={generateIntelligence}
                listingUrl={listingUrl}
                setListingUrl={setListingUrl}
                submitListing={submitListing}
                isStreaming={isStreaming}
                streamingAnalysis={streamingAnalysis}
                analyses={analyses}
                matchmakingMatches={matchmakingMatches}
                isMatchmakingOpen={isMatchmakingOpen}
                setIsMatchmakingOpen={setIsMatchmakingOpen}
              />
            )}
            {!selectedClient && (
              <div className="hidden lg:flex items-center justify-center flex-col opacity-30 pointer-events-none">
                <ShieldAlert className="w-24 h-24 mb-6 stroke-1 text-[#6E6A65]" />
                <p className="text-[#F0EDE8] uppercase tracking-widest text-xs font-bold">Awaiting Selection</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
