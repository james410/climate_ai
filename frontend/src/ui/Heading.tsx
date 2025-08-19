'use client';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function Heading({
  children,
  className = '',
}: { children: string; className?: string }) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: .8 }}
      className={clsx('relative font-bold text-primary drop-shadow-glow',
                      'text-5xl md:text-display leading-none',
                      className)}
    >
      {children}
      {/* underline line */}
      <span className="block h-px w-2/5 bg-primary/40 mt-6" />
    </motion.h1>
  );
}
