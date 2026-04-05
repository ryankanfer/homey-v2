'use client';

import { CheckCircle2 } from 'lucide-react';
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
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-[#2A2A27] z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-[#C8B89A] z-0 transition-all duration-700"
          style={{ width: `${((safeStage - 1) / (STAGES.length - 1)) * 100}%` }}
        />
        {STAGES.map(stage => (
          <button
            key={stage.num}
            onClick={() => onSetStage(stage.num)}
            className={cn(
              'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300',
              safeStage === stage.num
                ? 'bg-[#C8B89A] text-[#0D0D0B] scale-125'
                : safeStage > stage.num
                  ? 'bg-[#C8B89A] text-[#0D0D0B] opacity-50 hover:opacity-100'
                  : 'bg-[#0D0D0B] border border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E]'
            )}
          >
            {safeStage > stage.num ? <CheckCircle2 className="w-4 h-4" /> : stage.num}
          </button>
        ))}
      </div>

      {/* Active stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#1A1A17]/30 p-6 border border-[#2A2A27] rounded-sm relative overflow-hidden">
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
            Guidance OS Directive
          </div>
          <p className="text-sm text-[#F0EDE8] font-medium italic">{active.directive}</p>
        </div>
      </div>
    </div>
  );
}
