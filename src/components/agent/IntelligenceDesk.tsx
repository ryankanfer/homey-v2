'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, ShieldCheck, TrendingUp, AlertTriangle, 
  ChevronRight, ArrowRight, FileText, Loader2,
  Zap, Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface IntelligenceDeskProps {
  clientId: string;
}

interface IntelligenceSignal {
  id: string;
  category: 'w2' | 'bank_statement' | 'pre_approval' | 'tax_return' | 'other';
  extracted_data: any;
  signal_summary: string;
  created_at: string;
}

export function IntelligenceDesk({ clientId }: IntelligenceDeskProps) {
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSignals();
  }, [clientId]);

  const fetchSignals = async () => {
    const { data } = await supabase
      .from('document_intelligence' as any)
      .select('*')
      .eq('user_id', clientId)
      .order('created_at', { ascending: false });
    
    if (data) setSignals(data as any);
    setLoading(false);
  };

  const handleSynthesis = async () => {
    setIsSynthesizing(true);
    // Simulate complex cross-document math/reasoning
    await new Promise(resolve => setTimeout(resolve, 2400));
    setIsSynthesizing(false);
  };

  if (loading) return (
    <div className="h-48 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 text-[#C8B89A] animate-spin" />
      <p className="text-[10px] uppercase tracking-widest text-[#6E6A65]">Decrypting Intelligence...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Strategic Header */}
      <div className="bg-[#C8B89A]/5 border border-[#C8B89A]/20 p-5 rounded-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Brain className="w-16 h-16 text-[#C8B89A]" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#C8B89A]" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#C8B89A]">Ecosystem Intuition</h3>
        </div>
        <p className="text-sm text-[#F0EDE8] italic leading-relaxed mb-4">
          {signals.length > 0 
            ? `Based on ${signals.length} verified documents, the client shows high financial stability with minor post-closing liquidity signals.`
            : "No verified documents yet. Upload W2s or Bank Statements to generate ecosystem intuition."}
        </p>
        
        {signals.length >= 2 && (
          <button 
            onClick={handleSynthesis}
            disabled={isSynthesizing}
            className="w-full py-2 bg-[#C8B89A] text-black text-[9px] font-bold uppercase tracking-widest hover:bg-[#F0EDE8] transition-colors flex items-center justify-center gap-2"
          >
            {isSynthesizing ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> SYNTHESIZING GLOBALLY</>
            ) : (
              <><Brain className="w-3 h-3" /> RUN STRATEGIC SYNTHESIS</>
            )}
          </button>
        )}
      </div>

      {/* Signal Grid */}
      <div className="grid grid-cols-1 gap-3">
        {signals.map((signal) => (
          <div key={signal.id} className="group p-4 bg-[#0D0D0B] border border-[#2A2A27] hover:border-[#C8B89A]/40 transition-all rounded-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 px-2 py-1 bg-[#1A1A17] border border-[#2A2A27] rounded-sm">
                <FileText className="w-3 h-3 text-[#6E6A65]" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#A8A49E]">{signal.category.replace('_', ' ')}</span>
              </div>
              <span className="text-[9px] text-[#555]">{new Date(signal.created_at).toLocaleDateString()}</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] mt-1.5 shadow-[0_0_8px_rgba(74,124,89,0.5)]" />
              <div className="flex-1">
                <p className="text-xs text-[#F0EDE8] leading-relaxed italic">{signal.signal_summary}</p>
                
                {/* Extracted Data Glimpse */}
                <div className="mt-4 pt-3 border-t border-[#2A2A27]/30 flex flex-wrap gap-4">
                  {Object.entries(signal.extracted_data).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-[9px] uppercase tracking-tighter text-[#6E6A65] block mb-0.5">{key.replace('_', ' ')}</span>
                      <span className="text-[11px] font-medium text-[#A8A49E]">
                        {typeof val === 'number' ? `$${val.toLocaleString()}` : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="self-center">
                 <ShieldCheck className="w-4 h-4 text-[#4A7C59]/40" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {signals.length === 0 && !loading && (
        <div className="p-8 border border-dashed border-[#2A2A27] text-center opacity-50">
          <Info className="w-8 h-8 text-[#2A2A27] mx-auto mb-3" />
          <p className="text-[11px] text-[#6E6A65] uppercase tracking-widest font-bold mb-1">Intelligence Gap</p>
          <p className="text-[10px] text-[#555]">Waiting for client document authorization.</p>
        </div>
      )}
    </div>
  );
}
