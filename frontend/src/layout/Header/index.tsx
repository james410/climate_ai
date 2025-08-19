'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

export default function Header() {
  const { scrollYProgress } = useScroll();

  const headerOpacity = useTransform(scrollYProgress, [0.7, 0.8], [0, 1]);

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 p-4 bg-blue-500`}
      style={{ opacity: headerOpacity }}
    >
      <h1
        className={`font-display text-white drop-shadow-glow text-xl`}
      >
        VERDISLE
      </h1>
    </motion.header>
  );
}
