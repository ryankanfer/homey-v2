'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Clock, DollarSign, MapPin, AlertCircle } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { profile, updateProfile } = useProfile();
  const [localProfile, setLocalProfile] = useState(profile);

  const handleSave = () => {
    updateProfile(localProfile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0D0D0B]/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#141412] border border-[#2A2A27] rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A27] flex items-center justify-between bg-[#1A1A17]">
          <div>
            <h2 className="font-serif text-2xl text-[#F0EDE8]">Refine Strategy</h2>
            <p className="text-[10px] text-[#6E6A65] uppercase tracking-[0.2em] font-bold mt-1">Adjust your parameters</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2A2A27] rounded-full transition-colors">
            <X className="w-5 h-5 text-[#6E6A65]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12">
          {/* Timeline Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#A8956E]">
              <Clock className="w-4 h-4" />
              <h3 className="text-[10px] uppercase tracking-widest font-bold">Timeline</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(profile.mode === 'Rent' 
                ? ['ASAP', '15-30 days', '30-60 days', 'Flexible']
                : ['Immediate', '3-6 months', '6-12 months', 'Flexible']
              ).map(t => (
                <button
                  key={t}
                  onClick={() => setLocalProfile({ ...localProfile, timeline: t })}
                  className={cn(
                    "py-3 px-2 border text-[10px] uppercase font-bold tracking-widest transition-all",
                    localProfile.timeline === t 
                      ? "bg-[#C8B89A]/10 border-[#C8B89A] text-[#C8B89A]" 
                      : "border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Budget Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#A8956E]">
              <DollarSign className="w-4 h-4" />
              <h3 className="text-[10px] uppercase tracking-widest font-bold">
                {profile.mode === 'Rent' ? 'Max Monthly Rent' : 'Target Budget'}
              </h3>
            </div>
            {profile.mode === 'Rent' ? (
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8956E] font-serif">$</span>
                <input
                  type="number"
                  value={localProfile.maxMonthlyRent || ''}
                  onChange={e => setLocalProfile({ ...localProfile, maxMonthlyRent: Number(e.target.value) })}
                  className="w-full bg-[#0D0D0B] border border-[#2A2A27] p-4 pl-8 text-[#F0EDE8] outline-none focus:border-[#C8B89A] transition-colors font-serif"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {['Under $750K', '$750K – $1.2M', '$1.2M – $2M', '$2M – $3.5M', '$3.5M+'].map(b => (
                  <button
                    key={b}
                    onClick={() => setLocalProfile({ ...localProfile, budgetTier: b })}
                    className={cn(
                      "py-3 px-2 border text-[10px] uppercase font-bold tracking-widest transition-all",
                      localProfile.budgetTier === b 
                        ? "bg-[#C8B89A]/10 border-[#C8B89A] text-[#C8B89A]" 
                        : "border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E]"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Territory Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#A8956E]">
              <MapPin className="w-4 h-4" />
              <h3 className="text-[10px] uppercase tracking-widest font-bold">Territory</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {['West Village', 'Park Slope', 'Cobble Hill', 'Carroll Gardens', 'Prospect Heights'].map(n => {
                const isSelected = localProfile.territory?.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => {
                      const next = isSelected 
                        ? localProfile.territory.filter(t => t !== n)
                        : [...(localProfile.territory || []), n];
                      setLocalProfile({ ...localProfile, territory: next });
                    }}
                    className={cn(
                      "py-2 px-4 border text-[10px] uppercase font-bold tracking-widest transition-all",
                      isSelected 
                        ? "bg-[#C8B89A]/10 border-[#C8B89A] text-[#C8B89A]" 
                        : "border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E]"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Fear Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#A8956E]">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-[10px] uppercase tracking-widest font-bold">Primary Anxiety</h3>
            </div>
            <div className="space-y-3">
              {(profile.mode === 'Rent'
                ? [
                  { label: 'Hidden Broker Fees', value: 'Fees' },
                  { label: 'Bidding War Stress', value: 'Competition' },
                  { label: 'Qualification Roadblocks', value: 'Qualification' }
                ]
                : [
                  { label: 'Overpaying in a high-rate market', value: 'Overpaying' },
                  { label: 'Hidden structural or board issues', value: 'Issues' },
                  { label: 'Moving too slowly / missing out', value: 'Speed' }
                ]
              ).map(fear => (
                <button
                  key={fear.value}
                  onClick={() => setLocalProfile({ ...localProfile, fear: fear.label })}
                  className={cn(
                    "w-full p-4 border text-left text-xs transition-all flex items-center justify-between group",
                    localProfile.fear === fear.label 
                      ? "bg-[#C8B89A]/10 border-[#C8B89A] text-[#C8B89A]" 
                      : "border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E]"
                  )}
                >
                  {fear.label}
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    localProfile.fear === fear.label ? "bg-[#C8B89A]" : "bg-[#2A2A27] group-hover:bg-[#A8956E]"
                  )} />
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#1A1A17] border-t border-[#2A2A27] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 border border-[#2A2A27] text-[#6E6A65] font-bold text-[10px] uppercase tracking-widest hover:text-[#F0EDE8] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-3 h-3" /> Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
