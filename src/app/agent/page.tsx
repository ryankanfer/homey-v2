'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Link as LinkIcon, Send, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ClientRow {
  client_id: string;
  status: string;
  profile: {
    full_name: string | null;
    email: string | null;
  };
  buyer_profile: {
    budget_tier: string | null;
    territory: string[];
    fear: string | null;
    readiness_score: number;
    is_partial: boolean;
  } | null;
}

export default function AgentDashboard() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [listingUrl, setListingUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

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
      const { data } = await supabase
        .from('agent_clients')
        .select(`
          client_id,
          status,
          profile:profiles!client_id(full_name, email),
          buyer_profile:buyer_profiles!user_id(budget_tier, territory, fear, readiness_score, is_partial)
        `)
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      setClients((data as any) || []);
      setLoadingClients(false);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel('agent_clients_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_clients', filter: `agent_id=eq.${user.id}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, supabase]);

  // Load analyses for selected client
  useEffect(() => {
    if (!selectedClientId || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from('listing_analyses')
        .select('*')
        .eq('agent_id', user.id)
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });
      setAnalyses(data || []);
    };
    load();
  }, [selectedClientId, user, supabase]);

  const submitListing = async () => {
    if (!listingUrl.trim() || !selectedClientId) return;
    setIsAnalyzing(true);
    try {
      const selectedClient = clients.find(c => c.client_id === selectedClientId);
      await fetch('/api/listing-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: listingUrl.trim(),
          clientId: selectedClientId,
          clientProfile: selectedClient?.buyer_profile,
        }),
      });
      setListingUrl('');
      // Reload analyses
      const { data } = await supabase
        .from('listing_analyses')
        .select('*')
        .eq('agent_id', user!.id)
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });
      setAnalyses(data || []);
    } catch (err) {
      console.error(err);
    }
    setIsAnalyzing(false);
  };

  const selectedClient = clients.find(c => c.client_id === selectedClientId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0B] flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 0.2, 0.4].map(d => (
            <div key={d} className="w-2 h-2 bg-[#C8B89A] rounded-full animate-pulse" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0B] text-[#F0EDE8]">
      {/* Header */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[#2A2A27] bg-[#0D0D0B]/80 backdrop-blur-md sticky top-0 z-50">
        <span className="font-serif italic text-2xl text-[#C8B89A] tracking-tighter">homey. advsr</span>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[#6E6A65] uppercase tracking-widest">{user?.email}</span>
          <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Client list */}
        <aside>
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-4 h-4 text-[#C8B89A]" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A65]">
              Clients ({clients.length})
            </h2>
          </div>

          {loadingClients ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-[#141412] border border-[#2A2A27] rounded-sm animate-pulse" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-[#6E6A65]">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-xs">No clients yet.</p>
              <p className="text-[10px] mt-1 opacity-60">Share your homey. link to connect buyers.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(client => {
                const score = client.buyer_profile?.readiness_score ?? 0;
                return (
                  <button
                    key={client.client_id}
                    onClick={() => setSelectedClientId(client.client_id)}
                    className={cn(
                      'w-full p-4 text-left border rounded-sm transition-all',
                      selectedClientId === client.client_id
                        ? 'bg-[#C8B89A]/10 border-[#C8B89A]'
                        : 'bg-[#141412] border-[#2A2A27] hover:border-[#A8956E]'
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-[#F0EDE8]">
                        {client.profile?.full_name || client.profile?.email || 'Anonymous Buyer'}
                      </span>
                      <span className={cn(
                        'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5',
                        client.status === 'active' ? 'text-[#4A7C59] bg-[#4A7C59]/10' : 'text-[#6E6A65] bg-[#2A2A27]'
                      )}>
                        {client.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-[#2A2A27]">
                        <div className="h-full bg-[#C8B89A] transition-all" style={{ width: `${score}%` }} />
                      </div>
                      <span className="text-[10px] text-[#A8956E] font-mono">{score}</span>
                    </div>
                    {client.buyer_profile?.budget_tier && (
                      <div className="mt-2 text-[10px] text-[#6E6A65]">
                        {client.buyer_profile.budget_tier} · {client.buyer_profile.territory?.slice(0, 2).join(', ') || 'NYC'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Client detail */}
        <main>
          {!selectedClient ? (
            <div className="flex items-center justify-center h-full min-h-[400px] text-[#6E6A65]">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Select a client to view their profile and submit listings.</p>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Client profile summary */}
              <div className="glass p-8 rounded-sm border-l-4 border-[#C8B89A]">
                <div className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold mb-4">Client Profile</div>
                <h2 className="font-serif text-3xl text-[#F0EDE8] mb-6">
                  {selectedClient.profile?.full_name || selectedClient.profile?.email || 'Anonymous Buyer'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Budget', value: selectedClient.buyer_profile?.budget_tier || '—' },
                    { label: 'Territory', value: selectedClient.buyer_profile?.territory?.slice(0, 2).join(', ') || '—' },
                    { label: 'Anxiety', value: selectedClient.buyer_profile?.fear || '—' },
                    { label: 'Readiness', value: `${selectedClient.buyer_profile?.readiness_score ?? 0}/100` },
                  ].map(item => (
                    <div key={item.label}>
                      <span className="text-[9px] text-[#6E6A65] uppercase tracking-widest block mb-1">{item.label}</span>
                      <span className="font-serif text-[#C8B89A]">{item.value}</span>
                    </div>
                  ))}
                </div>
                {selectedClient.buyer_profile?.is_partial && (
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-[#A8956E]">
                    <AlertCircle className="w-3 h-3" /> Profile incomplete — buyer hasn't finished onboarding.
                  </div>
                )}
              </div>

              {/* Submit listing URL */}
              <div className="glass p-8 rounded-sm">
                <div className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" /> Submit Listing for Analysis
                </div>
                <p className="text-xs text-[#A8A49E] mb-6">
                  Paste a StreetEasy or listing URL. The AI will analyze it against this client's profile and send it to their Strategy Room.
                </p>
                <div className="flex gap-3">
                  <input
                    type="url"
                    placeholder="https://streeteasy.com/listing/..."
                    value={listingUrl}
                    onChange={e => setListingUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitListing()}
                    className="flex-1 bg-[#0D0D0B] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-4 py-3 text-sm text-[#F0EDE8] placeholder:text-[#6E6A65] transition-colors"
                  />
                  <button
                    onClick={submitListing}
                    disabled={isAnalyzing || !listingUrl.trim()}
                    className="px-6 py-3 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <div className="flex gap-1">
                        {[0, 0.15, 0.3].map(d => <div key={d} className="w-1 h-1 bg-[#0D0D0B] rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                      </div>
                    ) : (
                      <><Send className="w-3 h-3" /> Analyze</>
                    )}
                  </button>
                </div>
              </div>

              {/* Past analyses */}
              {analyses.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Sent Analyses ({analyses.length})
                  </h3>
                  {analyses.map(a => (
                    <div key={a.id} className="glass p-6 rounded-sm">
                      <div className="flex justify-between items-start mb-4">
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[#C8B89A] text-xs hover:underline truncate max-w-[70%]">
                          {a.url}
                        </a>
                        <span className="text-[9px] text-[#6E6A65]">
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {a.analysis && (
                        <div className="text-xs text-[#A8A49E] leading-relaxed whitespace-pre-wrap border-t border-[#2A2A27] pt-4">
                          {a.analysis}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
