'use client';
import { motion, useScroll, useTransform, useSpring, cubicBezier } from 'framer-motion';
import { Button } from '../../ui/Button';
import { forwardRef, useState, useEffect } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

function CustomGradient() {
  const { scrollYProgress } = useScroll();

  // 相機與漸層動畫同步（可依需要調整或移除）
  const cameraDistance = useTransform(
    scrollYProgress,
    [0, 0.4],
    [32, 4.4],
    { ease: cubicBezier(0.4, 0, 0.2, 1) }
  );
  const springDistance = useSpring(cameraDistance, { stiffness: 100, damping: 30 });
  const polarAngle = useTransform(
    scrollYProgress,
    [0, 0.4],
    [125, 70],
    { ease: cubicBezier(0.4, 0, 0.2, 1) }
  );
  const springPolar = useSpring(polarAngle, { stiffness: 80, damping: 25 });

  // State variables to hold the numerical values from MotionValues
  const [currentCDistance, setCurrentCDistance] = useState(springDistance.get());
  const [currentCPolarAngle, setCurrentCPolarAngle] = useState(springPolar.get());

  // Update state when MotionValue changes
  useEffect(() => {
    const unsubDistance = springDistance.on('change', (latest) => {
      setCurrentCDistance(latest);
    });
    const unsubPolar = springPolar.on('change', (latest) => {
      setCurrentCPolarAngle(latest);
    });
    return () => {
      unsubDistance();
      unsubPolar();
    };
  }, [springDistance, springPolar]);

  return (
    <ShaderGradientCanvas
      style={{ position: 'absolute', top: 0, width: '100%', height: '100%' }}
      pixelDensity={1}
      fov={45}
    >
      <ShaderGradient
        animate="on"
        type="waterPlane"
        wireframe={false}
        shader="defaults"
        // 噪點與像素設定
        uStrength={3.4}
        uDensity={1.2}
        // 顏色
        color1="#79cdcc"
        color2="#285861"
        color3="#ffffff"
        // 顆粒與環境
        grain="on"
        envPreset={undefined}
        brightness={1.1}
        // 背景與動畫
        uSpeed={0.2}
        // 範圍控制
        // 相機相關
        cDistance={4.4}
        cAzimuthAngle={170}
        cPolarAngle={70}
        // 物件位置與旋轉
        positionX={1.5}
        positionY={0.9}
        positionZ={-0.3}
        rotationX={45}
        rotationY={0}
        rotationZ={0}
      />
    </ShaderGradientCanvas>
  );
}

const HeroSection = forwardRef<HTMLElement>((props, ref) => {
  const { scrollYProgress } = useScroll();
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    const unsub = scrollYProgress.on('change', p => setShowTitle(p < 0.09));
    return unsub;
  }, [scrollYProgress]);

  const ease = cubicBezier(0.4, 0, 0.2, 1);
  const targetScale = 1.25 / 4.5;
  const titleOpacity = useTransform(scrollYProgress, [0, 0.08, 0.09], [1, 1, 0], { ease });
  const titleScale = useTransform(scrollYProgress, [0, 0.09], [1, targetScale], { ease });
  const titleY = useTransform(scrollYProgress, [0, 0.09], ['0%', '-100%'], { ease });
  const titleX = useTransform(scrollYProgress, [0, 0.09], ['0%', '-50%'], { ease });

  const subtitleOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);
  const subtitleY = useTransform(scrollYProgress, [0, 0.06], [0, -20]);

  const buttonOpacity = useTransform(scrollYProgress, [0, 0.04], [1, 0]);
  const buttonY = useTransform(scrollYProgress, [0, 0.04], [0, 30]);

  const scrollToMap = () => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={ref} className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <CustomGradient />
      {showTitle && (
        <motion.h1
          layoutId="verdisle-title"
          className="text-[clamp(3rem,8vw,6rem)] font-display text-white mb-6 relative z-10"
          style={{ opacity: titleOpacity, scale: titleScale, y: titleY, x: titleX, transformOrigin: 'center center' }}
        >
          VERDISLE
        </motion.h1>
      )}
      <motion.p
        className="font-sans text-white text-lg md:text-xl max-w-lg mb-10 text-center relative z-10"
        style={{ opacity: subtitleOpacity, y: subtitleY }}
      >
        Islands of Heat, Cities of Change
      </motion.p>
      <motion.div
        onClick={scrollToMap}
        className="relative z-10"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ opacity: buttonOpacity, y: buttonY }}
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
