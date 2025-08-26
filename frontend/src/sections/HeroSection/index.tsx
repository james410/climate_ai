'use client';
import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

function CustomGradient() {
  return (
    <ShaderGradientCanvas
      style={{ position: 'absolute', top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      pixelDensity={1}
      fov={60}
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
        color1="#61c2c2"
        color2="#d18b8b"
        color3="#faebd7"
        // 顆粒與環境
        grain="off"
        envPreset={undefined}
        brightness={0.9}
        // 背景與動畫
        uSpeed={0.2}
        // 範圍控制
        // 相機相關
        cDistance={5}
        cAzimuthAngle={180}
        cPolarAngle={50}
        // 物件位置與旋轉
        positionX={0.4}
        positionY={2.4}
        positionZ={-1}
        rotationX={60}
        rotationY={0}
        rotationZ={0}
      />
    </ShaderGradientCanvas>
  );
}

const HeroSection = forwardRef<HTMLElement>((props, ref) => {
  const scrollToIntro = () => document.getElementById('IntroSection')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={ref} className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <CustomGradient />

      {/* 底部區域模糊遮罩 - 更自然的漸變 */}
      <motion.div
        className="absolute inset-x-0 top-[60%] bottom-0 z-20 pointer-events-none"
        style={{
          background: `linear-gradient(to top, 
            rgba(26, 29, 31, 1) 5%, 
            rgba(29, 33, 36, 0.85) 20%, 
            rgba(26, 29, 31, 0.45) 40%, 
            rgba(26, 29, 31, 0.1) 70%, 
            rgba(255, 0, 0, 0) 100%)`,
        }}
      />
      <h1
        className="text-display font-mono font-bold text-text-primary mb-6 relative z-10 tracking-wider"
      >
        VERDISLE
      </h1>
      <p
        className="font-mono text-subtitle01 text-text-secondary text-lg md:text-xl max-w-lg mb-10 text-center relative z-10 font-medium"
      >
        Islands of Heat, Cities of Change
      </p>
      <motion.div
        onClick={scrollToIntro}
        className="relative z-10"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Button className="font-mono text-text-primary hover:text-primary transition text-sm md:text-base font-medium tracking-wide">
          Enter ↓
        </Button>
      </motion.div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
export default HeroSection;
