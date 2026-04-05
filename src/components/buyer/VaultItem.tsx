'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VaultItemProps {
  title: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}

export function VaultItem({ title, desc, checked, onToggle }: VaultItemProps) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'p-4 border rounded-sm flex items-start gap-4 cursor-pointer transition-colors',
        checked
          ? 'bg-[#C8B89A]/10 border-[#C8B89A] text-[#F0EDE8]'
          : 'bg-[#1A1A17]/30 border-[#2A2A27] text-[#A8A49E] hover:border-[#A8956E] hover:bg-[#1A1A17]'
      )}
    >
      <div
        className={cn(
          'mt-1 w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
          checked ? 'bg-[#C8B89A] border-[#C8B89A] text-[#0D0D0B]' : 'border-[#2A2A27] text-transparent'
        )}
      >
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-1">{title}</h4>
        <p className="text-[10px] text-[#6E6A65] uppercase tracking-widest leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
