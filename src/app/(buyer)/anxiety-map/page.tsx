'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Nav } from '@/components/buyer/Nav';
import { AnxietyMap } from '@/components/buyer/AnxietyMap';
import { useProfile } from '@/hooks/useProfile';

export default function AnxietyMapPage() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();

  return (
    <div className="min-h-screen bg-[#0D0D0B]">
      <Nav isAuthenticated={false} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[90vh] px-6 py-12"
      >
        <div className="w-full max-w-5xl">
          <div className="mb-12 text-center">
            <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.25em] uppercase mb-4">
              Phase 0: Orientation
            </div>
            <h2 className="font-serif text-4xl md:text-5xl mb-4 leading-tight text-[#F0EDE8]">
              The move no one is making:<br />
              <span className="italic text-[#C8B89A]">Publishing the Anxiety Map.</span>
            </h2>
            <p className="text-[#A8A49E] font-light max-w-2xl mx-auto">
              Every real estate platform hides the emotional chaos behind a clean UI. We don't. Here is exactly
              what you are going to feel, in what order, and why.
            </p>
          </div>

          <div className="glass p-8 md:p-12 rounded-sm mb-12">
            <AnxietyMap
              currentStage={profile.journeyStage || 1}
              onSetStage={s => updateProfile({ journeyStage: s })}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-12 py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-xs tracking-widest uppercase hover:bg-[#E8DCC8] transition-colors flex items-center gap-3"
            >
              Open homey. <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
