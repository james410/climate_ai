'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 自訂 Hook 計算 section 進度
function useSectionProgress(id: string) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const winH = window.innerHeight;
      const prog = Math.max(0, Math.min(1, (winH / 2 - top + winH / 2) / (height + winH)));
      setP(prog);
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [id]);
  return p;
}

// 產生粒子
type Particle = { id: number; x: number; y: number; scale: number; opacity: number; bg: string };
function makeParticles(text: string, f: number, color: string): Particle[] {
  if (f <= 0) return [];
  const count = Math.min(50, text.replace(/\s+/g, '').length * 2);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300 * f,
    y: (Math.random() - 0.5) * 200 * f,
    scale: 0.3 + Math.random() * 0.7,
    opacity: 1 - f,
    bg: color,
  }));
}

export default function Intro() {
  const p1 = useSectionProgress('intro-1');
  const p2 = useSectionProgress('intro-2');
  const [phase, setPhase] = useState<1 | 2>(1);
  const particles = useRef<Particle[]>([]);
  const threshold = 0.5;

  useEffect(() => {
    if (phase === 1) {
      if (p1 < threshold) particles.current = [];
      else if (p1 <= 1) particles.current = makeParticles('我們在城市裡行走', (p1 - threshold) / (1 - threshold), '#FFF');
      if (p1 >= 1) setPhase(2);
    } else {
      if (p2 < threshold) particles.current = [];
      else if (p2 <= 1) particles.current = makeParticles('你願意，聽聽它過去的記憶', (p2 - threshold) / (1 - threshold), '#8af0f4');
      if (p2 >= 1) {
        document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [p1, p2, phase]);

  return (
    <>
      {/* 第一段 */}
      <section id="intro-1" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {phase === 1 && p1 < threshold && (
            <motion.div
              key="block1"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              style={{ opacity: p1 < 0.2 ? p1 / 0.2 : 1 }}
              className="text-center max-w-2xl px-6"
            >
              <p className="font-sans text-2xl md:text-3xl leading-loose tracking-wide text-white mb-4" style={{ fontFamily: 'serif' }}>
                我們在城市裡行走，<br />
                彷彿它不曾說話。<br />
                但每一次高溫，每一場雨，<br />
                都是它在回應我們的沉默。
              </p>
              <p className="font-mono text-lg leading-relaxed tracking-wider text-[#8af0f4]">
                We walk through the city as if it were silent.<br />
                But every heatwave, every sudden rain —<br />
                is the city answering our silence.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {particles.current.map(p => (
          <motion.div
            key={p.id}
            className="absolute w-2 h-2 rounded-full"
            style={{ background: p.bg }}
            initial={{ opacity: 1, scale: p.scale, x: 0, y: 0 }}
            animate={{ opacity: 0, x: p.x, y: p.y }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        ))}
      </section>

      {/* 第二段 */}
      <section id="intro-2" className="relative min-h-screen flex items-center justify-center overflow-hidden -mt-16">
        <AnimatePresence>
          {phase === 2 && p2 < threshold && (
            <motion.div
              key="block2"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              style={{ opacity: p2 < 0.2 ? p2 / 0.2 : 1 }}
              className="text-center max-w-2xl px-6"
            >
              <p className="font-sans text-2xl md:text-3xl leading-loose tracking-wide text-white mb-4" style={{ fontFamily: 'serif' }}>
                你願意，聽聽它過去的記憶，<br />
                和我們能共同寫下的未來嗎？
              </p>
              <p className="font-mono text-lg leading-relaxed tracking-wider text-[#8af0f4]">
                Would you listen to what it remembers,<br />
                and what we might shape together?
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {particles.current.map(p => (
          <motion.div
            key={p.id}
            className="absolute w-2 h-2 rounded-full"
            style={{ background: p.bg }}
            initial={{ opacity: 1, scale: p.scale, x: 0, y: 0 }}
            animate={{ opacity: 0, x: p.x, y: p.y }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        ))}
      </section>
    </>
  );
}
