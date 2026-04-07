'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Sparkles, Zap, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface StrategyMirrorProps {
  clientId: string;
}

export function StrategyMirror({ clientId }: StrategyMirrorProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!clientId) return;

    const fetchChats = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('strategy_chats')
        .select('*')
        .eq('user_id', clientId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        setChats(data);
      }
      setLoading(false);
    };

    fetchChats();

    // Subscribe to live updates (Mirroring)
    const channel = supabase
      .channel(`strategy_mirror_${clientId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'strategy_chats', 
        filter: `user_id=eq.${clientId}` 
      }, (payload) => {
        setChats(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, supabase]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-[#1A1A17] border border-[#2A2A27] rounded-sm" />
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="bg-[#141412] border border-[#2A2A27] p-8 text-center rounded-sm">
        <MessageSquare className="w-8 h-8 text-[#2A2A27] mx-auto mb-3" />
        <p className="text-xs text-[#6E6A65] uppercase tracking-widest font-bold">No Strategy Interactions Yet</p>
        <p className="text-[10px] text-[#3A3A37] mt-2">The buyer hasn't summoned the strategist yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mirror Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C8B89A]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#F0EDE8]">AI Strategy Mirror</h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-[#4A7C59] font-bold uppercase tracking-widest bg-[#4A7C59]/10 px-2 py-0.5 border border-[#4A7C59]/30 rounded-full">
          <Zap className="w-2.5 h-2.5 animate-pulse" /> Live Stream
        </div>
      </div>

      <div className="space-y-4">
        {chats.map((msg, i) => (
          <motion.div
            key={msg.id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "p-4 border rounded-sm relative overflow-hidden",
              msg.role === 'assistant' 
                ? "bg-[#1A1A17] border-[#2A2A27] border-l-4 border-l-[#C8B89A]" 
                : "bg-[#0D0D0B] border-[#2A2A27] opacity-60"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#6E6A65]">
                {msg.role === 'assistant' ? 'Homey Strategist' : 'Buyer Input'}
              </div>
              <div className="text-[8px] text-[#3A3A37] font-mono">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            <div className="text-xs leading-relaxed text-[#A8A49E] prose-homey-mini">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>

            {msg.metadata?.isUrlAnalysis && (
              <div className="mt-3 pt-3 border-t border-[#2A2A27] flex items-center gap-2 text-[9px] text-[#C8B89A] uppercase tracking-widest font-bold">
                <Lock className="w-2.5 h-2.5" /> Building Intelligence Cross-Reference
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-[#C8B89A]/5 border border-[#C8B89A]/20 rounded-sm">
        <p className="text-[10px] text-[#A8956E] leading-relaxed">
          <strong className="uppercase mr-1">Agent Insight:</strong> 
          You are viewing a real-time mirror of the buyer's strategic guidance. Use this to ensure your manual pivots align with the AI's financial stress tests.
        </p>
      </div>
    </div>
  );
}
