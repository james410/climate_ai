import React, { useRef, useEffect, useState } from 'react';

interface SimpleCanvasBackgroundProps {
  className?: string;
}

// 粒子類別
class Particle {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  radius: number;
  color: string;
  speed: number;
  angle: number;
  attraction: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.radius = Math.random() * 20 + 10;
    this.color = color;
    this.speed = Math.random() * 0.02 + 0.01;
    this.angle = Math.random() * Math.PI * 2;
    this.attraction = Math.random() * 0.05 + 0.02;
  }

  update(mouseX: number, mouseY: number, time: number) {
    // 計算到滑鼠的距離
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 150; // 影響範圍

    // 如果滑鼠在影響範圍內
    if (distance < maxDistance) {
      // 吸引力效果
      const force = (maxDistance - distance) / maxDistance;
      this.x += dx * this.attraction * force;
      this.y += dy * this.attraction * force;
    } else {
      // 回歸原位的力
      const returnForce = 0.03;
      this.x += (this.originalX - this.x) * returnForce;
      this.y += (this.originalY - this.y) * returnForce;
    }

    // 添加輕微的浮動效果
    this.originalX += Math.sin(time * this.speed + this.angle) * 0.5;
    this.originalY += Math.cos(time * this.speed * 0.7 + this.angle) * 0.3;

    // 邊界檢查
    if (this.originalX < 0 || this.originalX > window.innerWidth) {
      this.angle += Math.PI;
    }
    if (this.originalY < 0 || this.originalY > window.innerHeight) {
      this.angle += Math.PI;
    }
  }

  draw(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 根據到滑鼠的距離調整透明度和大小
    const maxDistance = 150;
    let alpha = 0.05;
    let size = this.radius;

    if (distance < maxDistance) {
      const proximity = 1 - (distance / maxDistance);
      alpha = 0.05 + proximity * 0.15;
      size = this.radius * (1 + proximity * 0.5);
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.fill();

    // 連接線效果
    if (distance < maxDistance) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(mouseX, mouseY);
      // 使用更明亮的顏色和完全不透明
      ctx.strokeStyle = `rgba(3, 186, 214, ${(1 - distance / maxDistance) * 0.9})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

const SimpleCanvasBackground: React.FC<SimpleCanvasBackgroundProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // 設置 canvas 尺寸
    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      
      // 重新創建粒子
      createParticles();
    };

    // 創建粒子
    const createParticles = () => {
      particlesRef.current = [];
      const particleCount = 30; // 減少粒子數量以提高性能
      const colors = [
        'rgb(3, 186, 214)',
        'rgb(243, 227, 124)', 
        'rgb(164, 244, 248)',
        'rgb(255, 255, 255)'
      ];

      const rect = canvas?.parentElement?.getBoundingClientRect();
      const width = rect?.width || window.innerWidth;
      const height = rect?.height || window.innerHeight;

      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particlesRef.current.push(new Particle(x, y, color));
      }
    };

    // 滑鼠移動事件
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    // 動畫循環
    const animate = () => {
      if (!canvas || !ctx || !running) return;
      
      const time = Date.now() * 0.001;
      const width = canvas.width;
      const height = canvas.height;
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      // 清除畫布
      ctx.clearRect(0, 0, width, height);

      // 創建更透明的漸變背景
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `rgba(3, 186, 214, ${0.08 + Math.sin(time * 0.5) * 0.02})`);
      gradient.addColorStop(0.5, `rgba(243, 227, 124, ${0.05 + Math.cos(time * 0.7) * 0.02})`);
      gradient.addColorStop(1, `rgba(164, 244, 248, ${0.08 + Math.sin(time * 0.3) * 0.02})`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 更新並繪製粒子
      particlesRef.current.forEach(particle => {
        particle.update(mouseX, mouseY, time);
        particle.draw(ctx, mouseX, mouseY);
      });

      // 添加更透明的波紋線條
      ctx.strokeStyle = 'rgba(164, 244, 248, 0.6)';
      ctx.lineWidth = 1;
      
      for (let y = 0; y < height; y += 50) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 15) {
          // 加入滑鼠位置的影響
          const distanceToMouse = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2);
          const mouseInfluence = Math.max(0, 1 - distanceToMouse / 200) * 30;
          const waveY = y + Math.sin((x * 0.01) + (time * 2)) * 15 + mouseInfluence * Math.sin(time * 3);
          
          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: 0.8,
      }}
    />
  );
};

export default SimpleCanvasBackground;
