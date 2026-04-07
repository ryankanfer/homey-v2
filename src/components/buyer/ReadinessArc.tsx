'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface ReadinessArcProps {
  score: number;
  label: string;
  size?: number;
}

export function ReadinessArc({ score, label, size = 96 }: ReadinessArcProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  // Arc geometry
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Arc spans 270 degrees (from 135° to 405°) — open at bottom
  const arcDegrees = 270;
  const arcLength = (arcDegrees / 360) * circumference;
  const gap = circumference - arcLength;

  // Animated fill
  const animatedScore = useMotionValue(0);
  const fillLength = useTransform(animatedScore, v => (v / 100) * arcLength);
  const dashOffset = useTransform(fillLength, f => arcLength - f);

  const prevScore = useRef(0);
  useEffect(() => {
    const controls = animate(animatedScore, clampedScore, {
      duration: 0.9,
      ease: 'easeOut',
      from: prevScore.current,
    });
    prevScore.current = clampedScore;
    return controls.stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedScore]);

  const color = clampedScore >= 75 ? '#4A7C59' : clampedScore >= 40 ? '#C8B89A' : '#8B3A3A';

  // Rotate so the arc starts at bottom-left (135°)
  const rotation = 135;

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#2A2A27"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${gap}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cx} ${cy})`}
          />
          {/* Fill */}
          <motion.circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${gap}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-2xl leading-none" style={{ color }}>
            {clampedScore}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-[#6E6A65] mt-0.5">
            ready
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
