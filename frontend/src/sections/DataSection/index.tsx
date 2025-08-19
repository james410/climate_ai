// src/components/sections/DataSection/index.tsx
'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function DataSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // 監測滾動進度（可依需求移除或保留）
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const revealOpacity = useTransform(scrollYProgress, [0, 0.2, 0.4], [0, 1, 1]);
  const revealScale = useTransform(scrollYProgress, [0, 0.2, 0.4], [0.9, 1, 1]);

  return (
    <section
      ref={sectionRef}
      className="py-16 bg-transparent flex flex-col items-center"
    >
      {/* 引導文字 */}
      <motion.div
        style={{ opacity: revealOpacity, scale: revealScale }}
        className="max-w-2xl text-center mb-12"
      >
        <p
          className="
            text-2xl 
            text-white 
            font-vintage 
            tracking-[0.15em] 
            leading-[1.2]
          "
        >
          都心・近郊・山林
        </p>
        <p
          className="
            mt-4 
            text-lg 
            text-white 
            font-vintage 
            tracking-[0.25em] 
            leading-[2.5]
          "
        >
          探索植被覆蓋率如何影響溫度與體感舒適度
        </p>
        <br></br>
      </motion.div>

      {/* 三個水平並排的小容器 */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-6 w-full max-w-5xl">
        {['都心', '近郊', '山林'].map((label) => (
          <motion.div
            key={label}
            style={{ opacity: revealOpacity, scale: revealScale }}
            className="
              w-64 h-48
              rounded-xl
              shadow-lg
              flex items-center justify-center
              bg-[url('/images/noise.png')] bg-cover bg-center
            "
          >
            <span className="text-xl text-white font-vintage">
              {label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
