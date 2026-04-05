import { cn } from '@/lib/utils';

interface MarketStatProps {
  label: string;
  value: string | number;
  delta: string;
  up?: boolean;
}

export function MarketStat({ label, value, delta, up }: MarketStatProps) {
  return (
    <div className="bg-[#1A1A17] p-6 border border-[#2A2A27] rounded-sm">
      <div className="font-serif text-3xl text-[#C8B89A] mb-1">{value}</div>
      <div className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest mb-4">{label}</div>
      <div className={cn('text-[10px] font-bold uppercase tracking-widest', up ? 'text-[#4A7C59]' : 'text-[#A8A49E]')}>
        {delta}
      </div>
    </div>
  );
}
