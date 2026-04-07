'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/buyer/Nav';

export default function SplashPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0D0D0B] text-[#F0EDE8]">
      <Nav isAuthenticated={false} />
      <div className="flex flex-col items-center justify-center min-h-[90vh] px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_30%,rgba(200,184,154,0.06)_0%,transparent_70%)] pointer-events-none" />

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-5xl md:text-7xl leading-[1.1] mb-8"
        >
          <span className="block mb-4 opacity-70 tracking-wide leading-tight font-light">
            The NYC market is designed<br />
            to overwhelm you.
          </span>
          <span className="italic text-[#C8B89A] tracking-tighter">homey. is not</span>
        </motion.h1>

        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="text-[#A8A49E] text-lg max-w-md mx-auto mb-12 font-light leading-relaxed"
        >
          No one should make a real estate decision alone.
        </motion.p>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 flex flex-col items-center gap-3"
        >
          <button
            onClick={() => router.push('/interview')}
            aria-label="Get started — takes about 3 minutes"
            className="px-12 py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[11px] tracking-widest uppercase hover:bg-[#E8DCC8] active:bg-[#D8C8A8] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[#6E6A65] text-[9px] font-bold uppercase tracking-widest">6 questions · about 3 minutes</p>
        </motion.div>
      </div>
    </div>
  );
}
