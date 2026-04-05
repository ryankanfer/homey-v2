'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Option {
  label: string;
  subtext?: string;
  value: string;
  icon?: LucideIcon;
}

interface InterviewQuestionProps {
  question: string;
  options: Option[];
  selectedValue?: string | string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  sayMoreLabel?: string;
  sayMoreValue?: string;
  onSayMoreChange?: (value: string) => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
}

export function InterviewQuestion({
  question,
  options,
  selectedValue,
  onSelect,
  multiSelect = false,
  sayMoreLabel,
  sayMoreValue,
  onSayMoreChange,
  onContinue,
  continueDisabled,
}: InterviewQuestionProps) {
  const hasSelection = multiSelect
    ? Array.isArray(selectedValue) && selectedValue.length > 0
    : !!selectedValue;

  return (
    <div className="w-full flex flex-col">
      <h2 className="font-serif text-3xl md:text-4xl text-[#F0EDE8] italic mb-10 text-center leading-relaxed">
        "{question}"
      </h2>

      <div className="flex flex-col gap-3 w-full max-w-lg mx-auto">
        {options.map((opt, i) => {
          const isSelected = multiSelect
            ? Array.isArray(selectedValue) && selectedValue.includes(opt.value)
            : selectedValue === opt.value;
          const Icon = opt.icon;

          return (
            <button
              key={i}
              onClick={() => onSelect(opt.value)}
              className={cn(
                'p-5 text-left border transition-all flex items-center gap-4 group rounded-sm',
                isSelected
                  ? 'bg-[#C8B89A]/10 border-[#C8B89A] text-[#C8B89A]'
                  : 'bg-[#1A1A17]/30 border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E] hover:bg-[#1A1A17]'
              )}
            >
              {Icon && <Icon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />}
              <div className="flex-1">
                <div className="text-sm font-medium text-[#F0EDE8] group-hover:text-[#E8DCC8] transition-colors">
                  {opt.label}
                </div>
                {opt.subtext && (
                  <div className="text-[10px] uppercase tracking-widest mt-1 opacity-70">{opt.subtext}</div>
                )}
              </div>
              {!multiSelect && (
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              {multiSelect && isSelected && <CheckCircle2 className="w-4 h-4 text-[#C8B89A]" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {hasSelection && onContinue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-lg mx-auto mt-6 flex flex-col gap-4"
          >
            {sayMoreLabel && onSayMoreChange && (
              <div className="glass rounded-sm p-4">
                <input
                  type="text"
                  placeholder={sayMoreLabel}
                  value={sayMoreValue || ''}
                  onChange={e => onSayMoreChange(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#F0EDE8] outline-none placeholder:text-[#6E6A65] font-light"
                />
              </div>
            )}
            <button
              onClick={onContinue}
              disabled={continueDisabled}
              className="w-full py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
