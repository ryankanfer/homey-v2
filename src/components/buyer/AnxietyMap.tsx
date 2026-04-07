'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { num: 1, title: 'The Dream', feeling: 'Aspiration & Optimism', reality: 'Browsing Zillow. Budget feels limitless because reality hasn\'t hit.', directive: 'Enjoy the dreaming, but let\'s establish your hard financial ceiling today.' },
  { num: 2, title: 'The Reality Check', feeling: 'Shock & Recalibration', reality: 'DTI ratios, hidden maintenance fees, and the realization of what $1M actually buys.', directive: 'Do not panic. Everyone recalibrates. We will adjust the neighborhood or the format.' },
  { num: 3, title: 'The Grind', feeling: 'Fatigue & Doubt', reality: 'Endless Sunday open houses. The "Holy Grail" compromises begin.', directive: 'Take a weekend off. Trust the system. Do not settle out of sheer exhaustion.' },
  { num: 4, title: 'The Arena', feeling: 'Anxiety & Adrenaline', reality: 'Submitting offers. Bidding wars. Fearing you are overpaying or losing out.', directive: 'Stick to the strategy. Do not let emotions dictate your top offer.' },
  { num: 5, title: 'The Purgatory', feeling: 'Powerlessness', reality: 'The Co-op board package black hole. Total silence while your finances are judged.', directive: 'Silence is normal. Our package was flawless. We wait.' },
  { num: 6, title: 'The Exhale', feeling: 'Relief & Exhaustion', reality: 'Cleared to close. The keys are yours. The chaos ends.', directive: 'You survived the NYC market. Congratulations.' },
];

interface AnxietyMapProps {
  currentStage: number;
  onSetStage: (stage: number) => void;
}

export function AnxietyMap({ currentStage, onSetStage }: AnxietyMapProps) {
  const safeStage = Math.max(1, Math.min(currentStage, STAGES.length));
  const active = STAGES[safeStage - 1];

  return (
    <div className="space-y-8">
      {/* Timeline */}
      <div className="relative flex justify-between items-center px-4">
        {/* Base track */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-[#2A2A27] z-0" />
        {/* Progress fill */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-[#C8B89A] z-0 transition-all duration-700"
          style={{ width: `${((safeStage - 1) / (STAGES.length - 1)) * 100}%` }}
        />

        {STAGES.map(stage => {
          const isPast = safeStage > stage.num;
          const isCurrent = safeStage === stage.num;
          const isFuture = safeStage < stage.num;

          return (
            <div key={stage.num} className="relative z-10 group">
              <button
                onClick={() => !isFuture && onSetStage(stage.num)}
                aria-label={isFuture ? `Phase ${stage.num}: ${stage.title} — locked` : `Go to phase ${stage.num}: ${stage.title}`}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300',
                  isCurrent && 'bg-[#C8B89A] text-[#0D0D0B] scale-125 shadow-[0_0_12px_rgba(200,184,154,0.3)]',
                  isPast && 'bg-[#C8B89A] text-[#0D0D0B] opacity-60 hover:opacity-100 cursor-pointer',
                  isFuture && 'bg-[#0D0D0B] border border-[#2A2A27] text-[#3A3A37] cursor-default opacity-50'
                )}
              >
                {isPast
                  ? <CheckCircle2 className="w-4 h-4" />
                  : isFuture
                    ? <Lock className="w-3 h-3" />
                    : stage.num}
              </button>

              {/* Prophetic tooltip on future stages */}
              {isFuture && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-36 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                  <div className="bg-[#1A1A17] border border-[#2A2A27] px-3 py-2 rounded-sm text-center">
                    <div className="text-[9px] text-[#A8956E] font-bold uppercase tracking-widest mb-0.5">{stage.title}</div>
                    <div className="text-[10px] text-[#6E6A65] italic">You&rsquo;ll reach this.</div>
                  </div>
                  <div className="w-2 h-2 bg-[#1A1A17] border-r border-b border-[#2A2A27] rotate-45 mx-auto -mt-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={safeStage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#1A1A17]/30 p-6 border border-[#2A2A27] rounded-sm relative overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C8B89A]" />
          <div>
            <div className="text-[10px] text-[#A8956E] font-bold uppercase tracking-widest mb-2">
              Phase {safeStage}: What you are feeling
            </div>
            <h4 className="font-serif text-2xl text-[#F0EDE8] mb-2">{active.feeling}</h4>
            <p className="text-sm text-[#A8A49E] font-light leading-relaxed">{active.reality}</p>
          </div>
          <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-[#2A2A27] pt-6 md:pt-0 md:pl-8">
            <div className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest mb-3">
              What to do about it
            </div>
            <p className="text-sm text-[#F0EDE8] font-medium italic">{active.directive}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
