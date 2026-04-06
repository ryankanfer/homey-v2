import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreAlertProps {
  score: number;
  prevScore?: number;
  lastTouchDays: number;
}

export function ScoreAlert({ score, prevScore, lastTouchDays }: ScoreAlertProps) {
  // Logic: Alert if score dropped OR touch is 7+ days stale
  const isDropping = prevScore !== undefined && score < prevScore;
  const isStale = lastTouchDays >= 7;

  if (!isDropping && !isStale) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "absolute -right-1.5 -top-1.5 w-5 h-5 rounded-full border-2 border-[#141412] flex items-center justify-center z-10",
        isDropping ? "bg-[#8B3A3A] text-white shadow-[0_0_10px_rgba(139,58,58,0.4)]" : "bg-[#A8956E] text-white"
      )}
      title={isDropping ? `Score dropped from ${prevScore}` : `Stale touch: ${lastTouchDays} days`}
    >
      {isDropping ? <TrendingDown className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
    </motion.div>
  );
}
