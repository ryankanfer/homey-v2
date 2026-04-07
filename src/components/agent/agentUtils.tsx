import React from 'react';
import { ActiveProfile, ClientRow, VaultDoc } from './types';

// ─── Journey Stage ─────────────────────────────────────────────────────────────
// Derived from score + vault + status since journey_stage lives client-side.

export const JOURNEY_STAGES = [
  { num: 1, title: 'The Dream',          feeling: 'Aspiration & Optimism' },
  { num: 2, title: 'The Reality Check',  feeling: 'Shock & Recalibration' },
  { num: 3, title: 'The Grind',          feeling: 'Fatigue & Doubt' },
  { num: 4, title: 'The Arena',          feeling: 'Anxiety & Adrenaline' },
  { num: 5, title: 'The Purgatory',      feeling: 'Powerlessness' },
  { num: 6, title: 'The Exhale',         feeling: 'Relief & Exhaustion' },
];

export function deriveJourneyStage(profile: ActiveProfile, client: ClientRow): number {
  if (client.status === 'closed') return 6;
  const score = profile.readiness_score ?? 0;
  const vault = profile.vault ?? {};
  const vaultKeys: (keyof VaultDoc)[] = ['w2', 'bank', 'preapproval', 'rebny', 'attorney'];
  const vaultDone = vaultKeys.filter(k => vault[k]).length;
  if (profile.is_partial) return 1;
  if (score < 25) return 1;
  if (score < 45) return 2;
  if (score < 60) return 3;
  if (score < 75) return vaultDone >= 3 ? 4 : 3;
  if (score < 90) return vaultDone >= 4 ? 5 : 4;
  return 5;
}

// ─── ScoreArc ─────────────────────────────────────────────────────────────────

interface ScoreArcProps {
  score: number;
  size?: number;
}

export function ScoreArc({ score, size = 52 }: ScoreArcProps) {
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arcLen = (270 / 360) * circ;
  const gap = circ - arcLen;
  const filled = Math.max(0, Math.min(score / 100, 1)) * arcLen;
  const color = score >= 70 ? '#4A7C59' : score >= 45 ? '#A8956E' : '#6E6A65';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="#2A2A27" strokeWidth="3.5"
        strokeDasharray={`${arcLen} ${gap}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="3.5"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 4px ${color}50)` }}
      />
      <text
        x={cx} y={cy + 4}
        textAnchor="middle"
        fontSize={size <= 52 ? "11" : "14"}
        fontWeight="700"
        fill={color}
        fontFamily="serif"
      >
        {score}
      </text>
    </svg>
  );
}

// ─── JourneyMinimap ───────────────────────────────────────────────────────────

interface JourneyMinimapProps {
  stage: number;
  size?: 'sm' | 'md';
}

export function JourneyMinimap({ stage, size = 'sm' }: JourneyMinimapProps) {
  const dotSize = size === 'sm' ? 6 : 8;
  const activeDot = size === 'sm' ? 9 : 11;

  return (
    <div className="flex items-center gap-1.5">
      {JOURNEY_STAGES.map(s => {
        const isPast = stage > s.num;
        const isCurrent = stage === s.num;
        const color = isPast ? '#4A7C59' : isCurrent ? '#C8B89A' : '#2A2A27';
        const dim = isCurrent ? activeDot : dotSize;
        return (
          <div
            key={s.num}
            title={s.title}
            className="rounded-full transition-all duration-300"
            style={{
              width: dim,
              height: dim,
              backgroundColor: color,
              boxShadow: isCurrent ? `0 0 6px ${color}80` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
