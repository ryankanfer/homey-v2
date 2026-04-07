'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NeighborhoodZone {
  name: string;
  // SVG path data for each simplified neighborhood polygon
  path: string;
  // Label position
  labelX: number;
  labelY: number;
}

// Simplified SVG paths representing key Brooklyn/Manhattan neighborhoods
// Coordinate space: 0 0 400 380 viewBox — roughly geo-positioned
const ZONES: NeighborhoodZone[] = [
  {
    name: 'West Village',
    path: 'M 148 68 L 180 65 L 185 88 L 165 95 L 148 90 Z',
    labelX: 164,
    labelY: 80,
  },
  {
    name: 'Cobble Hill',
    path: 'M 170 200 L 210 196 L 214 222 L 172 226 Z',
    labelX: 192,
    labelY: 212,
  },
  {
    name: 'Carroll Gardens',
    path: 'M 168 228 L 214 224 L 218 252 L 170 256 Z',
    labelX: 193,
    labelY: 240,
  },
  {
    name: 'Park Slope',
    path: 'M 210 210 L 258 206 L 264 256 L 214 260 Z',
    labelX: 237,
    labelY: 233,
  },
  {
    name: 'Prospect Heights',
    path: 'M 210 168 L 258 164 L 262 208 L 212 212 Z',
    labelX: 236,
    labelY: 188,
  },
];

// East River separating Manhattan from Brooklyn — decorative path
const RIVER_PATH = 'M 138 40 Q 148 120 152 180 Q 155 220 158 290 Q 160 330 162 360';

interface NYCNeighborhoodMapProps {
  selected: string;
  onSelect: (name: string) => void;
  budgetTier?: string;       // e.g. "$1M–$1.25M"
  neighborhoodStats: Record<string, { median?: number; medianRent?: number }>;
  mode?: 'Buy' | 'Rent';
}

function parseBudgetMax(tier: string | undefined): number {
  if (!tier) return Infinity;
  const nums = tier.replace(/[$,M]/g, '').split(/[–\-–]/).map(Number);
  const last = nums[nums.length - 1];
  return last < 100 ? last * 1_000_000 : last;
}

function getZoneColor(
  name: string,
  stats: Record<string, { median?: number; medianRent?: number }>,
  budgetMax: number,
  mode: 'Buy' | 'Rent',
): string {
  const s = stats[name];
  if (!s) return '#2A2A27';
  const price = mode === 'Rent' ? (s.medianRent ?? 0) * 40 : (s.median ?? 0); // rent * 40 rough annual affordability
  const ratio = price / budgetMax;
  if (ratio <= 0.9) return '#4A7C59';   // within budget — green
  if (ratio <= 1.1) return '#A8956E';   // stretch — amber
  return '#8B3A3A';                     // above budget — red
}

export function NYCNeighborhoodMap({
  selected,
  onSelect,
  budgetTier,
  neighborhoodStats,
  mode = 'Buy',
}: NYCNeighborhoodMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const budgetMax = parseBudgetMax(budgetTier);

  return (
    <div className="relative w-full">
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#6E6A65] mb-3">
        Budget fit — click a neighborhood
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {[
          { color: '#4A7C59', label: 'Within budget' },
          { color: '#A8956E', label: 'Stretch' },
          { color: '#8B3A3A', label: 'Above ceiling' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-[#6E6A65]">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-sm border border-[#2A2A27] bg-[#0D0D0B]">
        <svg
          viewBox="0 0 400 380"
          className="w-full"
          style={{ maxHeight: 340 }}
        >
          {/* Background grid lines */}
          {[80, 160, 240, 320].map(y => (
            <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#1A1A17" strokeWidth="1" />
          ))}
          {[80, 160, 240, 320].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="380" stroke="#1A1A17" strokeWidth="1" />
          ))}

          {/* East River */}
          <path
            d={RIVER_PATH}
            fill="none"
            stroke="#1E2A3A"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d={RIVER_PATH}
            fill="none"
            stroke="#243040"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text x="96" y="200" fontSize="8" fill="#2A3A4A" transform="rotate(-75 96 200)" fontFamily="serif" letterSpacing="2">
            EAST RIVER
          </text>

          {/* Neighborhood zones */}
          {ZONES.map(zone => {
            const zoneColor = getZoneColor(zone.name, neighborhoodStats, budgetMax, mode);
            const isSelected = selected === zone.name;
            const isHovered = hovered === zone.name;

            return (
              <g key={zone.name}>
                <motion.path
                  d={zone.path}
                  fill={zoneColor}
                  fillOpacity={isSelected ? 0.55 : isHovered ? 0.4 : 0.2}
                  stroke={isSelected ? zoneColor : '#2A2A27'}
                  strokeWidth={isSelected ? 2 : 1}
                  className="cursor-pointer transition-all"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onSelect(zone.name)}
                  onMouseEnter={() => setHovered(zone.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 8px ${zoneColor}60)` : undefined,
                  }}
                />
                <text
                  x={zone.labelX}
                  y={zone.labelY}
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="700"
                  fill={isSelected || isHovered ? zoneColor : '#6E6A65'}
                  fontFamily="sans-serif"
                  letterSpacing="0.5"
                  className="pointer-events-none uppercase"
                >
                  {zone.name.split(' ').map((word, i) => (
                    <tspan key={i} x={zone.labelX} dy={i === 0 ? 0 : 9}>{word}</tspan>
                  ))}
                </text>
              </g>
            );
          })}

          {/* Compass rose */}
          <g transform="translate(370 30)">
            <text x="0" y="-8" textAnchor="middle" fontSize="7" fill="#3A3A37" fontFamily="sans-serif">N</text>
            <line x1="0" y1="-5" x2="0" y2="5" stroke="#3A3A37" strokeWidth="1" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#3A3A37" strokeWidth="1" />
          </g>
        </svg>
      </div>

      {/* Hover/selected name callout */}
      <div className={cn(
        'mt-3 text-[10px] text-[#A8A49E] transition-opacity',
        (hovered || selected) ? 'opacity-100' : 'opacity-0'
      )}>
        <span className="font-bold text-[#C8B89A]">{hovered || selected}</span>
        {' — '}
        {(() => {
          const s = neighborhoodStats[hovered || selected];
          if (!s) return null;
          return mode === 'Rent'
            ? `$${(s.medianRent ?? 0).toLocaleString()}/mo median`
            : `$${((s.median ?? 0) / 1_000_000).toFixed(2)}M median`;
        })()}
      </div>
    </div>
  );
}
