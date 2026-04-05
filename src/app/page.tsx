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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-5xl md:text-7xl leading-[1.1] tracking-tighter mb-8"
        >
          The NYC market is designed<br />
          to overwhelm you.<br />
          <span className="italic text-[#C8B89A]">homey. is not.</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[#A8A49E] text-lg max-w-md mx-auto mb-12 font-light leading-relaxed"
        >
          No one should make a real estate decision alone.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="z-10"
        >
          <button
            onClick={() => router.push('/interview')}
            className="px-12 py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] tracking-widest uppercase hover:bg-[#E8DCC8] transition-colors flex items-center justify-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
