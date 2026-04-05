'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/buyer/Nav';
import { useBuyerProfile } from '@/hooks/useBuyerProfile';
import type { AccuracyRating } from '@/types/buyer';

export default function ReviewPage() {
  const router = useRouter();
  const { profile, updateProfile } = useBuyerProfile();

  const handleAccuracy = (rating: AccuracyRating) => {
    updateProfile({ accuracyRating: rating });
    router.push('/anxiety-map');
  };

  return (
    <div className="min-h-screen bg-[#0D0D0B]">
      <Nav isAuthenticated={false} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[90vh] px-6 py-12"
      >
        <div className="w-full max-w-2xl glass p-8 md:p-12 rounded-sm border-t-4 border-t-[#C8B89A]">
          <div className="text-center mb-10">
            <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.25em] uppercase mb-2">
              System Generated
            </div>
            <h2 className="font-serif text-3xl text-[#F0EDE8]">Your Profile</h2>
          </div>

          <div className="space-y-6 mb-12">
            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-[#2A2A27]">
              <div>
                <span className="text-[9px] text-[#6E6A65] uppercase tracking-widest block mb-1">Target Capital</span>
                <span className="font-serif text-xl text-[#C8B89A]">{profile.budgetTier || 'Undisclosed'}</span>
              </div>
              <div>
                <span className="text-[9px] text-[#6E6A65] uppercase tracking-widest block mb-1">Territory</span>
                <span className="font-serif text-xl text-[#C8B89A]">{profile.territory?.join(', ') || 'NYC'}</span>
              </div>
            </div>

            <div className="bg-[#C8B89A]/5 border border-[#A8956E]/20 p-6 rounded-sm text-sm text-[#E8DCC8] italic leading-relaxed">
              "{profile.summary || 'Building your strategic profile...'}"
            </div>
          </div>

          <div className="bg-[#0D0D0B] p-6 rounded-sm border border-[#2A2A27]">
            <h3 className="text-center font-serif text-xl text-[#F0EDE8] mb-6">Does this feel accurate?</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAccuracy('Yes, this is me')}
                className="flex-1 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all"
              >
                Yes, this is me
              </button>
              <button
                onClick={() => handleAccuracy('Mostly')}
                className="flex-1 py-4 bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#C8B89A] font-bold text-[10px] uppercase tracking-widest hover:bg-[#C8B89A]/20 transition-all"
              >
                Mostly
              </button>
              <button
                onClick={() => handleAccuracy('Not quite')}
                className="flex-1 py-4 bg-[#0D0D0B] border border-[#2A2A27] text-[#6E6A65] font-bold text-[10px] uppercase tracking-widest hover:text-[#F0EDE8] transition-all"
              >
                Not quite
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
