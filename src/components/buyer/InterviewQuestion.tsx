'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
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
  options?: Option[];
  selectedValue?: string | string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  sayMoreLabel?: string;
  sayMoreValue?: string;
  onSayMoreChange?: (value: string) => void;
  onContinue?: () => void;
  onBack?: () => void;
  continueDisabled?: boolean;
  hasSelectionOverride?: boolean;
  children?: React.ReactNode;
}

function useTypewriter(text: string, speed = 30) {
  const words = text.split(' ');
  const [visibleCount, setVisibleCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setVisibleCount(0);
    setDone(false);
    if (words.length === 0) { setDone(true); return; }
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= words.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return { displayText: words.slice(0, visibleCount).join(' '), done };
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
  onBack,
  continueDisabled,
  hasSelectionOverride,
  children,
}: InterviewQuestionProps) {
  const { displayText, done } = useTypewriter(question);

  const hasSelection = hasSelectionOverride !== undefined
    ? hasSelectionOverride
    : multiSelect
      ? Array.isArray(selectedValue) && selectedValue.length > 0
      : !!selectedValue;

  return (
    <div className="w-full flex flex-col">
      <h2 className="font-serif text-3xl md:text-4xl text-[#F0EDE8] italic mb-12 text-center leading-relaxed min-h-[4.5rem]">
        &ldquo;{displayText}
        {!done && (
          <span className="inline-block w-[2px] h-[0.9em] bg-[#C8B89A] ml-0.5 align-middle animate-pulse" />
        )}
        {done && '\u201d'}
      </h2>

      {children}

      {options && options.length > 0 && (
        <motion.div
          className="flex flex-col gap-4 w-full max-w-lg mx-auto"
          initial="hidden"
          animate={done ? 'visible' : 'hidden'}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
          }}
        >
          {options.map((opt, i) => {
            const isSelected = multiSelect
              ? Array.isArray(selectedValue) && selectedValue.includes(opt.value)
              : selectedValue === opt.value;
            const Icon = opt.icon;

            return (
              <motion.button
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
                }}
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
                    <div className="text-[11px] mt-1 opacity-60 font-light">{opt.subtext}</div>
                  )}
                </div>
                {!multiSelect && (
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                {multiSelect && isSelected && <CheckCircle2 className="w-4 h-4 text-[#C8B89A]" />}
              </motion.button>
            );
          })}
        </motion.div>
      )}

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

      {onBack && (
        <div className="w-full max-w-lg mx-auto mt-4">
          <button
            onClick={onBack}
            className="w-full py-3 text-[#6E6A65] hover:text-[#F0EDE8] font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
        </div>
      )}
    </div>
  );
}
