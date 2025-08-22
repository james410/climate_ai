'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function Intro() {
  const ref1 = useRef<HTMLElement>(null);
  const ref2 = useRef<HTMLElement>(null);

  // 各 section 滾動進度
  const { scrollYProgress: p1 } = useScroll({ target: ref1, offset: ['start end', 'end start'] });
  const { scrollYProgress: p2 } = useScroll({ target: ref2, offset: ['start end', 'end start'] });

  // 淡入淡出區間：30%→45% 漸顯，55%→70% 漸隱
  const fadeRange = [0.3, 0.45, 0.55, 0.7] as const;
  const opacity1 = useTransform(p1, fadeRange, [0, 1, 1, 0]);
  const opacity2 = useTransform(p2, fadeRange, [0, 1, 1, 0]);

  return (
    <>
      {/* 第一段 */}
      <section ref={ref1} className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          style={{ opacity: opacity1 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="text-center max-w-4xl w-full"
        >
          <h2
            className="font-chinese text-white leading-relaxed tracking-wider mb-8"
            style={{
              fontSize: 'clamp(1.25rem,5vw,1.5rem)',
              lineHeight: '1.4',
            }}
          >
            我們在城市裡行走，<br />
            彷彿它不曾說話。<br />
            但每一次高溫，每一場雨，<br />
            都是它在回應我們的沉默。
          </h2>
          <p
            className="font-mono text-[#8af0f4] leading-relaxed tracking-wide"
            style={{
              fontSize: 'clamp(0.875rem,4vw,1.333rem)',
              lineHeight: '1.4',
            }}
          >
            We walk through the city as if it were silent.<br />
            But every heatwave, every sudden rain —<br />
            is the city answering our silence.
          </p>
        </motion.div>
      </section>

      {/* 縮短空白距離 */}
      <div className="h-1/2" />

      {/* 第二段 */}
      <section ref={ref2} className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          style={{ opacity: opacity2 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="text-center max-w-4xl w-full"
        >
          <h2
            className="font-chinese text-white leading-relaxed tracking-wider mb-8"
            style={{
              fontSize: 'clamp(1.25rem,5vw,1.5rem)',
              lineHeight: '1.4',
            }}
          >
            你願意，聽聽它過去的記憶，<br />
            和我們能共同寫下的未來嗎？
          </h2>
          <p
            className="font-mono text-[#8af0f4] leading-relaxed tracking-wide"
            style={{
              fontSize: 'clamp(0.875rem,4vw,1.333rem)',
              lineHeight: '1.4',
            }}
          >
            Would you listen to what it remembers,<br />
            and what we might shape together?
          </p>
        </motion.div>
      </section>
    </>
  );
}
