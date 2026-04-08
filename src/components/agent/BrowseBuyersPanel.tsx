'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, MapPin, Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailableBuyer {
  user_id: string;
  kind: 'buyer' | 'renter';
  readiness_score: number;
  is_partial: boolean;
  territory: string[];
  fear: string;
  timeline: string;
  budget_tier?: string;
  max_monthly_rent?: number;
  move_in_date?: string;
  friction_data?: { tension?: number };
  profile?: { full_name: string | null };
}

interface Props {
  agentId: string;
  onRequestSent: () => void;
}

export function BrowseBuyersPanel({ agentId, onRequestSent }: Props) {
  const [buyers, setBuyers] = useState<AvailableBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/agent-clients')
      .then(r => r.json())
      .then(({ buyers: b = [], renters: r = [] }) => {
        setBuyers([...b, ...r].sort((a, b) => (b.readiness_score ?? 0) - (a.readiness_score ?? 0)));
      })
      .catch(() => setBuyers([]))
      .finally(() => setLoading(false));
  }, []);

  const sendRequest = async (clientId: string) => {
    setRequesting(clientId);
    try {
      const res = await fetch('/api/agent-clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, clientId, action: 'request' }),
      });
      if (res.ok) {
        setSent(prev => new Set([...prev, clientId]));
        onRequestSent();
      }
    } finally {
      setRequesting(null);
    }
  };

  const scoreColor = (score: number) =>
    score >= 70 ? '#4A7C59' : score >= 40 ? '#A8956E' : '#6E6A65';

  const budgetLabel = (b: AvailableBuyer) =>
    b.kind === 'renter'
      ? b.max_monthly_rent ? `$${b.max_monthly_rent.toLocaleString()}/mo` : '—'
      : b.budget_tier || '—';

  const timelineLabel = (b: AvailableBuyer) =>
    b.kind === 'renter' && b.move_in_date
      ? `Move-in ${new Date(b.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : b.timeline || '—';

  const isUrgent = (b: AvailableBuyer) => {
    if (b.kind === 'renter' && b.move_in_date) {
      const days = Math.ceil((new Date(b.move_in_date).getTime() - Date.now()) / 86400000);
      return days <= 45;
    }
    return ['asap', 'immediately', 'this month'].some(k => (b.timeline ?? '').toLowerCase().includes(k));
  };

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 0.7, 0.5].map((op, i) => (
          <div key={i} className="h-28 bg-[#1A1A17] rounded-sm animate-pulse" style={{ opacity: op }} />
        ))}
      </div>
    );
  }

  if (buyers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-8">
        <p className="text-[#6E6A65] text-sm">No available buyers right now.</p>
        <p className="text-[#4A4A47] text-[11px] mt-1">Check back as more buyers complete onboarding.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold">
          {buyers.length} available {buyers.length === 1 ? 'buyer' : 'buyers'}
        </span>
        <span className="text-[10px] text-[#4A4A47] uppercase tracking-widest">Sorted by readiness</span>
      </div>

      <AnimatePresence>
        {buyers.map((buyer, i) => {
          const isSent = sent.has(buyer.user_id);
          const isPending = requesting === buyer.user_id;
          const urgent = isUrgent(buyer);

          return (
            <motion.div
              key={buyer.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'border rounded-sm p-4 transition-colors',
                isSent ? 'border-[#4A7C59]/40 bg-[#0A1A0F]' : 'border-[#2A2A27] bg-[#0D0D0B] hover:border-[#3A3A37]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
                      style={{ color: scoreColor(buyer.readiness_score), background: `${scoreColor(buyer.readiness_score)}18` }}
                    >
                      {buyer.readiness_score ?? 0} readiness
                    </span>
                    <span className="text-[9px] text-[#4A4A47] uppercase tracking-widest font-bold">
                      {buyer.kind}
                    </span>
                    {urgent && (
                      <span className="flex items-center gap-0.5 text-[9px] text-[#8B3A3A] font-bold uppercase tracking-widest">
                        <AlertTriangle className="w-2.5 h-2.5" /> urgent
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#A8A49E]">
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-[#6E6A65] shrink-0" />
                      {buyer.territory?.slice(0, 2).join(', ') || 'NYC'}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <DollarSign className="w-3 h-3 text-[#6E6A65] shrink-0" />
                      {budgetLabel(buyer)}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <Clock className="w-3 h-3 text-[#6E6A65] shrink-0" />
                      {timelineLabel(buyer)}
                    </span>
                    {buyer.fear && (
                      <span className="truncate text-[#6E6A65] italic col-span-2 mt-0.5">
                        &ldquo;{buyer.fear.split('/')[0].trim()}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => !isSent && !isPending && sendRequest(buyer.user_id)}
                  disabled={isSent || isPending}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest border transition-all rounded-sm',
                    isSent
                      ? 'border-[#4A7C59]/40 text-[#4A7C59] cursor-default'
                      : 'border-[#C8B89A]/40 text-[#C8B89A] hover:border-[#C8B89A] hover:bg-[#C8B89A]/5 cursor-pointer'
                  )}
                >
                  {isSent ? (
                    <><CheckCircle className="w-3 h-3" /> Sent</>
                  ) : isPending ? (
                    <span className="animate-pulse">Sending...</span>
                  ) : (
                    <><UserPlus className="w-3 h-3" /> Request</>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
