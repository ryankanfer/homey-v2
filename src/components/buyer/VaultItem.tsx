'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VaultItemProps {
  title: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}

export function VaultItem({ title, desc, checked, onToggle }: VaultItemProps) {
  const [justSaved, setJustSaved] = useState(false);

  const handleToggle = () => {
    onToggle();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  return (
    <div
      onClick={handleToggle}
      className={cn(
        'p-4 border rounded-sm flex items-start gap-4 cursor-pointer transition-colors relative',
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
      <div className="flex-1">
        <h4 className={cn('text-sm font-medium mb-1', checked ? 'text-[#F0EDE8]' : '')}>{title}</h4>
        <p className="text-[11px] text-[#6E6A65] leading-relaxed">{desc}</p>
      </div>
      <AnimatePresence>
        {justSaved && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-[#4A7C59]"
          >
            Saved ✓
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
