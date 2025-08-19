'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useRef } from 'react';

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]); // Scale down to 20%
  const y = useTransform(scrollYProgress, [0, 0.8], ["0%", "-40vh"]); // Move up

  const scrollToMap = () =>
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={ref} className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* 大膽醒目的主標題：使用 Droid Sans Mono */}
      <motion.h1
        className="text-[clamp(3rem,8vw,6rem)] font-display text-black mb-6 drop-shadow-glow"
        style={{ opacity, scale, y }}
      >
        VERDISLE
      </motion.h1>

      {/* 簡潔副標：使用主要無襯線字體 */}
      <motion.p
        className="font-sans text-white text-lg md:text-xl max-w-lg mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        Islands of Heat, Cities of Change
      </motion.p>

      {/* 按鈕：使用科技感字體 */}
      <motion.button
        onClick={scrollToMap}
        className="font-tech text-white hover:text-primary transition text-sm md:text-base"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Scroll ↓
      </motion.button>
    </section>
  );
}
