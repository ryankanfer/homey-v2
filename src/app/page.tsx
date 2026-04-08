'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Nav } from '@/components/buyer/Nav';

const expo = [0.16, 1, 0.3, 1] as const;

const reveal = (delay = 0) => ({
  initial: { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
  animate: { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
  transition: { delay, duration: 0.9, ease: expo },
});

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: expo },
});

export default function SplashPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const glowY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const headlineY = useTransform(scrollYProgress, [0, 0.4], ['0%', '-8%']);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0D0D0B] text-[#F0EDE8] overflow-x-hidden">
      <Nav isAuthenticated={false} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100svh-73px)] flex flex-col px-6 md:px-14 lg:px-20 pt-14 pb-10 overflow-hidden">

        {/* Ambient glow */}
        <motion.div
          style={{ y: glowY }}
          className="absolute -top-40 left-0 w-[70vw] h-[80vh] pointer-events-none"
          aria-hidden
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_60%_60%_at_20%_40%,rgba(200,184,154,0.07)_0%,transparent_70%)]" />
        </motion.div>

        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '300px 300px',
          }}
        />

        {/* Left editorial rule */}
        <motion.div
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.3, duration: 1.1, ease: expo }}
          className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#2A2A27] to-transparent"
          aria-hidden
        />

        {/* Eyebrow */}
        <motion.p
          {...fade(0.15)}
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C8B89A] mb-12 md:mb-16"
        >
          New York City · Private Advisory
        </motion.p>

        {/* Headline */}
        <motion.div style={{ y: headlineY }} className="flex-1 flex flex-col justify-center max-w-[1100px]">
          <h1 className="font-serif leading-[1.0] tracking-tight">
            {/* Line 1 */}
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 0.25, duration: 0.9, ease: expo }}
                className="block text-[clamp(3rem,8.5vw,7.5rem)] text-[#F0EDE8]/40 font-light"
              >
                The NYC market
              </motion.span>
            </span>
            {/* Line 2 */}
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 0.35, duration: 0.9, ease: expo }}
                className="block text-[clamp(3rem,8.5vw,7.5rem)] text-[#F0EDE8]/40 font-light"
              >
                is designed to
              </motion.span>
            </span>
            {/* Line 3 */}
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 0.45, duration: 0.9, ease: expo }}
                className="block text-[clamp(3rem,8.5vw,7.5rem)] text-[#F0EDE8]/40 font-light"
              >
                overwhelm you.
              </motion.span>
            </span>
            {/* Contrast line */}
            <span className="block overflow-hidden mt-2 md:mt-3">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 0.58, duration: 1.0, ease: expo }}
                className="block italic text-[clamp(3rem,8.5vw,7.5rem)] text-[#C8B89A]"
              >
                homey. is not.
              </motion.span>
            </span>
          </h1>

          {/* Body + CTA */}
          <div className="mt-10 md:mt-14 flex flex-col md:flex-row md:items-end gap-8 md:gap-20">
            <motion.p
              {...fade(0.72)}
              className="text-[#A8A49E] text-base md:text-lg leading-relaxed max-w-sm"
            >
              Your private intelligence layer for the most opaque market in America. Before the offer. During the negotiation. After the keys.
            </motion.p>

            <motion.div {...fade(0.82)} className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/onboarding')}
                aria-label="Get started — 6 questions, about 3 minutes"
                className="group px-10 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[11px] tracking-[0.22em] uppercase hover:bg-[#E8DCC8] active:scale-[0.98] transition-all duration-200 flex items-center gap-3 cursor-pointer w-fit"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
              <p className="text-[#6E6A65] text-[10px] font-bold uppercase tracking-[0.22em]">
                6 questions · about 3 minutes
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom row */}
        <div className="flex justify-between items-end mt-10">
          <motion.button
            {...fade(0.92)}
            onClick={() => router.push('/auth?role=agent')}
            className="text-[10px] text-[#6E6A65] hover:text-[#C8B89A] uppercase tracking-[0.22em] font-bold transition-colors duration-200 cursor-pointer border-b border-transparent hover:border-[#C8B89A]/40 pb-px"
          >
            Agent Sign In / Apply
          </motion.button>

          <motion.div
            {...fade(0.95)}
            className="hidden md:flex items-center gap-2 text-[10px] text-[#3A3A37] uppercase tracking-widest"
          >
            <span>Scroll</span>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="w-[1px] h-4 bg-[#3A3A37]"
            />
          </motion.div>
        </div>
      </section>

      {/* ── DIVIDER ─────────────────────────────────────────── */}
      <div className="border-t border-[#2A2A27] mx-6 md:mx-14 lg:mx-20" />

      {/* ── INTELLIGENCE PILLARS ────────────────────────────── */}
      <section className="px-6 md:px-14 lg:px-20 py-24 md:py-32">
        <div className="max-w-[1100px]">

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C8B89A] mb-16"
          >
            What homey. does
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              {
                n: '01',
                title: 'Reads the market for you',
                body: 'Neighborhood volatility, days-on-market, price-per-sqft trends — surfaced and interpreted without the noise.',
              },
              {
                n: '02',
                title: 'Pairs you with the right agent',
                body: 'Matched by deal history, communication style, and neighborhood expertise. Intelligence-driven, not referral-network random.',
              },
              {
                n: '03',
                title: 'Stays through closing',
                body: 'Offer strategy, inspection prep, attorney recommendations. Your file lives in one place — from first search to keys in hand.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.14, duration: 0.65, ease: expo }}
                className="py-10 md:py-0 md:pr-12 border-t border-[#2A2A27] md:border-t-0 md:border-l first:border-l-0 first:pl-0 md:pl-12 md:first:pr-12"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6E6A65] mb-5">{item.n}</p>
                <p className="font-serif text-xl md:text-2xl text-[#F0EDE8] mb-4 leading-snug">{item.title}</p>
                <p className="text-[#A8A49E] text-sm leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─────────────────────────────────────────── */}
      <div className="border-t border-[#2A2A27] mx-6 md:mx-14 lg:mx-20" />

      {/* ── CLOSING CTA ─────────────────────────────────────── */}
      <section className="px-6 md:px-14 lg:px-20 py-24 md:py-32">
        <div className="max-w-[1100px] flex flex-col md:flex-row md:items-end justify-between gap-12 md:gap-8">

          <motion.blockquote
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: expo }}
            className="font-serif italic text-[clamp(1.6rem,3.5vw,2.75rem)] text-[#F0EDE8]/35 leading-[1.2] max-w-2xl"
          >
            "The NYC market rewards preparation and punishes confusion."
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="flex flex-col gap-3 md:items-end shrink-0"
          >
            <button
              onClick={() => router.push('/onboarding')}
              className="group px-10 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[11px] tracking-[0.22em] uppercase hover:bg-[#E8DCC8] transition-colors duration-200 flex items-center gap-3 cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
            <p className="text-[#6E6A65] text-[10px] uppercase tracking-[0.22em]">Free · No commitment</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-[#2A2A27] px-6 md:px-14 lg:px-20 py-8">
        <div className="max-w-[1100px] mx-auto flex justify-between items-center">
          <span className="font-serif italic text-[#C8B89A]/40 text-xl">homey.</span>
          <p className="text-[10px] text-[#6E6A65] uppercase tracking-[0.25em]">New York City</p>
        </div>
      </footer>
    </div>
  );
}
