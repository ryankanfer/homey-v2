'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, MapPin, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NYC_BOROUGHS, type MicroNeighborhood, type Borough } from '@/data/neighborhoods';

interface TerritoryPickerProps {
  territory: string[];
  onUpdate: (territory: string[]) => void;
  onContinue: () => void;
  onBack?: () => void;
}

export function TerritoryPicker({ territory, onUpdate, onContinue, onBack }: TerritoryPickerProps) {
  const [expandedBorough, setExpandedBorough] = useState<string | null>(null);
  const [expandedSubMarket, setExpandedSubMarket] = useState<string | null>(null);

  const toggleMicro = useCallback((name: string) => {
    const next = territory.includes(name)
      ? territory.filter(t => t !== name)
      : [...territory, name];
    onUpdate(next);
  }, [territory, onUpdate]);

  const selectedCount = territory.length;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-4xl mb-4 text-[#F0EDE8]">where are you searching?</h2>
        <p className="text-[#A8A49E] font-light mb-6">Drill into the micro-neighborhoods that actually matter.</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <div className="space-y-4 max-w-2xl mx-auto w-full max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
          {NYC_BOROUGHS.map((borough) => (
            <BoroughAccordion
              key={borough.name}
              borough={borough}
              territory={territory}
              onToggle={toggleMicro}
              isExpanded={expandedBorough === borough.name}
              onExpand={() => setExpandedBorough(expandedBorough === borough.name ? null : borough.name)}
              expandedSubMarket={expandedSubMarket}
              onExpandSubMarket={(name) => setExpandedSubMarket(expandedSubMarket === name ? null : name)}
            />
          ))}
        </div>
      </div>

      {/* Selected Chips + Continue */}
      <div className="mt-8 pt-6 border-t border-[#2A2A27] flex flex-col items-center">
        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-lg">
            {territory.map(t => (
              <button
                key={t}
                onClick={() => toggleMicro(t)}
                className="text-[8px] bg-[#C8B89A]/10 text-[#C8B89A] border border-[#C8B89A]/30 px-2 py-1 uppercase tracking-widest font-bold hover:bg-[#C8B89A]/20 transition-colors flex items-center gap-1"
              >
                {t}
                <X className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onContinue}
          disabled={selectedCount === 0}
          className="w-full max-w-lg py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {selectedCount > 0 ? `Continue with ${selectedCount} micro${selectedCount > 1 ? 's' : ''}` : 'Select at least one area'}
          <ArrowRight className="w-4 h-4" />
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-3 w-full max-w-lg py-3 text-[#6E6A65] hover:text-[#F0EDE8] font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #2A2A27;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// Sub-components

function BoroughAccordion({
  borough,
  territory,
  onToggle,
  isExpanded,
  onExpand,
  expandedSubMarket,
  onExpandSubMarket,
}: {
  borough: Borough;
  territory: string[];
  onToggle: (name: string) => void;
  isExpanded: boolean;
  onExpand: () => void;
  expandedSubMarket: string | null;
  onExpandSubMarket: (name: string) => void;
}) {
  const selectedInBorough = borough.subMarkets.flatMap(sm =>
    sm.micros.filter(m => territory.includes(m.name))
  ).length;

  return (
    <div className="border border-[#2A2A27] bg-[#141412]/30 overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between p-5 hover:bg-[#1A1A17] transition-colors"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-[#C8B89A]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F0EDE8]">{borough.name}</span>
          {selectedInBorough > 0 && (
            <span className="text-[8px] bg-[#C8B89A] text-[#0D0D0B] px-1.5 py-0.5 font-bold">{selectedInBorough}</span>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-[#C8B89A] transition-transform", isExpanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-[#2A2A27]"
          >
            <div className="p-3 space-y-3">
              {borough.subMarkets.map((sm) => (
                <SubMarketBlock
                  key={sm.name}
                  subMarket={sm}
                  territory={territory}
                  onToggle={onToggle}
                  isExpanded={expandedSubMarket === sm.name}
                  onExpand={() => onExpandSubMarket(sm.name)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubMarketBlock({
  subMarket,
  territory,
  onToggle,
  isExpanded,
  onExpand,
}: {
  subMarket: { name: string; micros: MicroNeighborhood[] };
  territory: string[];
  onToggle: (name: string) => void;
  isExpanded: boolean;
  onExpand: () => void;
}) {
  const selectedCount = subMarket.micros.filter(m => territory.includes(m.name)).length;

  return (
    <div className="bg-[#0D0D0B]/50 border border-[#2A2A27]">
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between p-4 hover:text-[#C8B89A] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A8A49E]">{subMarket.name}</span>
          {selectedCount > 0 && (
            <span className="text-[7px] bg-[#C8B89A]/20 text-[#C8B89A] px-1.5 py-0.5 font-bold">{selectedCount}</span>
          )}
        </div>
        <ChevronRight className={cn("w-3 h-3 text-[#6E6A65] transition-transform", isExpanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
              {subMarket.micros.map((micro) => {
                const isSelected = territory.includes(micro.name);
                return (
                  <button
                    key={micro.name}
                    onClick={() => onToggle(micro.name)}
                    className={cn(
                      "p-3 border text-left transition-all group",
                      isSelected
                        ? "bg-[#C8B89A] border-[#C8B89A] text-[#0D0D0B]"
                        : "bg-[#141412] border-[#2A2A27] text-[#6E6A65] hover:border-[#C8B89A]/40 hover:text-[#A8A49E]"
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest block leading-tight">{micro.name}</span>
                    <span className={cn(
                      "text-[8px] mt-1 block leading-snug italic",
                      isSelected ? "text-[#0D0D0B]/70" : "text-[#6E6A65] group-hover:text-[#A8A49E]"
                    )}>
                      {micro.vibe}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
