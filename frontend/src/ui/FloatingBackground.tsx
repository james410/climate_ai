// components/ui/FloatingBackground.tsx
'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';


interface BlobConfig {
  id: number;
  size: number;
  blur: number;
  gradient: string;
  initial: { x: number; y: number };
  transition: { duration: number; delay: number };
}

const blobConfigs: BlobConfig[] = [
  {
    id: 1,
    size: 600,
    blur: 60,
    gradient: 'radial-gradient(circle, #a7d7d9, #c2ccc6, transparent)',
    initial: { x: -100, y: -50 },
    transition: { duration: 120, delay: 0 },
  },
  {
    id: 2,
    size: 550,
    blur: 55,
    gradient: 'radial-gradient(circle, #f6bfc7, #d9c5c8, transparent)',
    initial: { x: 200, y: -100 },
    transition: { duration: 85, delay: 5 },
  },
  {
    id: 3,
    size: 500,
    blur: 50,
    gradient: 'radial-gradient(circle, #c2ccc6, #a7d7d9, transparent)',
    initial: { x: -150, y: 150 },
    transition: { duration: 100, delay: 10 },
  },
  {
    id: 4,
    size: 350,
    blur: 45,
    gradient: 'radial-gradient(circle, #d9c5c8, #a7d7d9, transparent)',
    initial: { x: 150, y: 200 },
    transition: { duration: 90, delay: 15 },
  },
  {
    id: 5,
    size: 320,
    blur: 40,
    gradient: 'radial-gradient(circle, #a7d7d9, #f6bfc7, transparent)',
    initial: { x: -200, y: -200 },
    transition: { duration: 75, delay: 20 },
  },
  {
    id: 6,
    size: 400,
    blur: 65,
    gradient: 'radial-gradient(circle, #f6bfc7, #a7d7d9, transparent)',
    initial: { x: 0, y: 300 },
    transition: { duration: 88, delay: 25 },
  },
];

const Container = styled.div`
  position: fixed;
  inset: 0;
  background: rgb(37, 38, 40);
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
`;

export default function FloatingBackground({
  className,
  ...restProps
}: FloatingBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Container className={className} {...restProps}>
      <div style={{ mixBlendMode: 'screen' }}>
        {blobConfigs.map((cfg) => (
          <motion.div
            key={cfg.id}
            style={{
              position: 'absolute',
              width: cfg.size,
              height: cfg.size,
              background: cfg.gradient,
              filter: `blur(${cfg.blur}px)`,
              borderRadius: '50%',
              opacity: 0.6,
            }}
            initial={cfg.initial}
            animate={{
              x: [cfg.initial.x, -cfg.initial.x, cfg.initial.x],
              y: [cfg.initial.y, -cfg.initial.y, cfg.initial.y],
              rotate: [0, 360, 0],
            }}
            transition={{
              ...cfg.transition,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </Container>
  );
}
