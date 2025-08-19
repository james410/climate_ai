'use client';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function Header() {
  const { scrollYProgress } = useScroll();

  // 分階段的動畫效果
  const headerDisplay = useTransform(scrollYProgress, [0.079, 0.08], ["none", "block"]);
  
  // 透明度：稍早開始
  const headerOpacity = useTransform(scrollYProgress, [0.08, 0.11], [0, 1]);
  
  // Y 軸位移：稍晚開始，創造層次感
  const headerY = useTransform(scrollYProgress, [0.09, 0.13], [-30, 0]);
  
  // 縮放：最晚開始
  const headerScale = useTransform(scrollYProgress, [0.10, 0.14], [0.9, 1]);
  
  // 背景透明度：可以與內容分開控制
  const bgOpacity = useTransform(scrollYProgress, [0.08, 0.12], [0, 0.9]);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 p-4"
      style={{ 
        display: headerDisplay,
        y: headerY,
        scale: headerScale,
        backgroundColor: `rgba(59, 130, 246, ${bgOpacity.get()})`, // 動態背景色
        transformOrigin: "center top"
      }}
    >
      <motion.h1
        layoutId="verdisle-title"
        className="font-display text-white drop-shadow-glow text-xl"
        style={{ 
          opacity: headerOpacity 
        }}
      >
        VERDISLE
      </motion.h1>
    </motion.header>
  );
}
