'use client';
import { motion, useScroll, useTransform, cubicBezier } from 'framer-motion';
import { Button } from '../../ui/Button';
import { forwardRef, useRef, useState, useEffect } from 'react';

const HeroSection = forwardRef<HTMLElement>((props, forwardedRef) => {
  // 全頁滾動進度
  const { scrollYProgress } = useScroll();

  // 控制是否顯示 Section 版標題（可選）
  const [showSectionTitle, setShowSectionTitle] = useState(true);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (p) => {
      // 9% 時隱藏 Section 版大標
      setShowSectionTitle(p < 0.09);
    });
    return unsubscribe;
  }, [scrollYProgress]);

  // 緩動函數
  const easing = cubicBezier(0.4, 0, 0.2, 1);

  // 精確縮放到 Header 的 text-xl (1.25rem) 大小
  const targetScale = 1.25 / 4.5;  // ≈0.278

  // 在全頁滾動 0→0.09 期間進行動畫
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.09],
    [1, 1, 0],
    { ease: easing }
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.09],
    [1, targetScale],
    { ease: easing }
  );
  const y = useTransform(
    scrollYProgress,
    [0, 0.09],
    ['0%', '-100%'],   // 向上移動整個 viewport 高度
    { ease: easing }
  );
  const x = useTransform(
    scrollYProgress,
    [0, 0.09],
    ['0%', '-50%'],    // 向左移動 50% 寬度 (約移到左側 padding 位置)
    { ease: easing }
  );

  const scrollToMap = () => {
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={forwardedRef}
      data-hero-section
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
    >
      {showSectionTitle && (
        <motion.h1
          layoutId="verdisle-title" 
          className="text-[clamp(3rem,8vw,6rem)] font-display text-black drop-shadow-glow mb-6"
          style={{ opacity, scale, y, x, transformOrigin: 'center center' }}
        >
          VERDISLE
        </motion.h1>
      )}
      <motion.p
        className="font-sans text-white text-lg md:text-xl max-w-lg mb-10"
        style={{
          opacity: useTransform(scrollYProgress, [0, 0.06], [1, 0]),
        }}
      >
        Islands of Heat, Cities of Change
      </motion.p>
      <motion.div
        onClick={scrollToMap}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          opacity: useTransform(scrollYProgress, [0, 0.04], [1, 0]),
        }}
      >
        <Button className="font-tech text-white hover:text-primary transition text-sm md:text-base">
          Scroll ↓
        </Button>
      </motion.div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
export default HeroSection;
