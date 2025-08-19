import React, { useEffect, useRef } from 'react';

interface CSSAnimatedBackgroundProps {
  className?: string;
}

const CSSAnimatedBackground: React.FC<CSSAnimatedBackgroundProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 100;
      mouseY = (e.clientY / window.innerHeight) * 100;
      
      container.style.setProperty('--mouse-x', `${mouseX}%`);
      container.style.setProperty('--mouse-y', `${mouseY}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        overflow: 'hidden',
        background: `
          radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
            rgba(3, 186, 214, 0.4) 0%, 
            rgba(243, 227, 124, 0.3) 30%, 
            rgba(164, 244, 248, 0.2) 70%, 
            transparent 100%),
          linear-gradient(45deg, 
            rgba(26, 146, 212, 0.1) 0%, 
            rgba(204, 154, 57, 0.15) 50%, 
            rgba(164, 244, 248, 0.1) 100%)
        `,
      }}
    >
      {/* 動態波紋圓圈 */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 20%, rgba(3, 186, 214, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(243, 227, 124, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 70%, rgba(164, 244, 248, 0.1) 0%, transparent 50%)
          `,
          animation: 'float 8s ease-in-out infinite',
        }}
      />

      {/* 動態線條效果 */}
      <div
        style={{
          position: 'absolute',
          width: '200%',
          height: '200%',
          left: '-50%',
          top: '-50%',
          background: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 50px,
              rgba(255, 255, 255, 0.02) 51px,
              rgba(255, 255, 255, 0.02) 52px
            )
          `,
          animation: 'rotate 20s linear infinite',
        }}
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-20px) scale(1.05);
            opacity: 0.9;
          }
        }
        
        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default CSSAnimatedBackground;
