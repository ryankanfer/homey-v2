'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { 
  FileText, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, ShieldAlert,
  ChevronRight, Brain, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserDoc {
  id: string;
  file_name: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  agent_access_granted: boolean;
  created_at: string;
}

interface VaultIntelligenceProps {
  userId: string;
}

export function VaultIntelligence({ userId }: VaultIntelligenceProps) {
  const [docs, setDocs] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDocs();

    // Realtime subscription for status updates
    const channel = supabase
      .channel('vault-status')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_documents',
        filter: `user_id=eq.${userId}` 
      }, () => {
        fetchDocs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchDocs = async () => {
    const { data } = await supabase
      .from('user_documents' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setDocs(data as any);
    setLoading(false);
  };

  const toggleAccess = async (docId: string, current: boolean) => {
    await (supabase
      .from('user_documents' as any)
      .update({ agent_access_granted: !current } as any) as any)
      .eq('id', docId);
  };

  if (loading) return (
    <div className="h-32 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-[#C8B89A] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A65]">Active Documents</h3>
        <span className="text-[9px] text-[#A8A49E] italic">{docs.length} item{docs.length !== 1 ? 's' : ''}</span>
      </div>

      {docs.length === 0 ? (
        <div className="p-8 border border-dashed border-[#2A2A27] text-center bg-[#111]/50">
          <p className="text-[11px] text-[#555]">No documents in your vault yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div 
              key={doc.id}
              className="group p-4 bg-[#141412] border border-[#2A2A27] hover:border-[#C8B89A]/30 transition-all rounded-sm flex items-start gap-4"
            >
              <div className={cn(
                "w-10 h-10 rounded-sm flex items-center justify-center shrink-0",
                doc.status === 'processed' ? "bg-[#4A7C59]/10 text-[#4A7C59]" : 
                doc.status === 'error' ? "bg-red-900/10 text-red-500" : "bg-[#1A1A17] text-[#6E6A65]"
              )}>
                {doc.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-medium text-[#F0EDE8] truncate max-w-[180px]">{doc.file_name}</h4>
                  <div className="flex items-center gap-2">
                    {doc.status === 'processed' && <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C59]" />}
                    {doc.status === 'pending' && <Clock className="w-3.5 h-3.5 text-[#6E6A65]" />}
                    {doc.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1A1A17] border border-[#2A2A27] text-[9px] uppercase tracking-tighter text-[#A8A49E]">
                      {doc.status}
                   </div>
                   <div className="text-[10px] text-[#555]">{new Date(doc.created_at).toLocaleDateString()}</div>
                </div>

                {doc.status === 'processed' && (
                  <button 
                    onClick={() => toggleAccess(doc.id, doc.agent_access_granted)}
                    className={cn(
                      "mt-3 w-full p-2 border flex items-center justify-center gap-2 transition-all",
                      doc.agent_access_granted 
                        ? "bg-[#C8B89A]/10 border-[#C8B89A] text-[#C8B89A]" 
                        : "bg-[#0D0D0B] border-[#2A2A27] text-[#6E6A65] hover:border-[#4A4A47]"
                    )}
                  >
                    {doc.agent_access_granted ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                      {doc.agent_access_granted ? 'Agent Can Read Insights' : 'Private to me'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {docs.some(d => d.status === 'processed') && (
        <button 
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-[#C8B89A]/20 text-[#C8B89A] border border-[#C8B89A]/40 text-[9px] font-bold uppercase tracking-widest hover:bg-[#C8B89A]/30 transition-all rounded-sm"
        >
           <Brain className="w-3.5 h-3.5" /> Synthesize Complete Wallet
        </button>
      )}
    </div>
  );
}
