'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function BackgroundParticles() {
  // 使用固定數值避免 Hydration Mismatch
  const [particles] = useState(
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      left: (i * 3.7) % 100,
      delay: (i * 0.1) % 8,
      duration: 6 + (i % 4),
    }))
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-40"
          style={{ left: `${p.left}%`, top: '100%' }}
          animate={{
            y: [`0px`, `-${800 + (p.id % 400)}px`],
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
