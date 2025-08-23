'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function DataSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const revealOpacity = useTransform(scrollYProgress, [0, 0.2, 0.4], [0, 1, 1]);
  const revealScale = useTransform(scrollYProgress, [0, 0.2, 0.4], [0.9, 1, 1]);

  return (
    <section
      ref={sectionRef}
      className="py-10 bg-transparent flex flex-col items-center"
    >
      {/* 標題區域 */}
      <motion.div
        style={{ opacity: revealOpacity, scale: revealScale }}
        className="max-w-4xl text-center mb-16 px-8"
      >
        <h2 className="text-4xl text-white font-vintage tracking-[0.15em] leading-[1.2] mb-8">
          🌡️ 台北都市熱島實測揭露
        </h2>
        <p className="text-2xl text-white font-vintage tracking-[0.1em] leading-[1.2]">
          <span
            style={{
              background: 'linear-gradient(transparent 60%, #a7d7d9 60%)',
              fontWeight: 'bold',
              paddingBottom: '2px',
            }}
          >
            植被調控溫度的驚人能力
          </span>
        </p>
      </motion.div>

      {/* 主要內容區域 */}
      <motion.div
        style={{ opacity: revealOpacity, scale: revealScale }}
        className="max-w-6xl w-full px-12"
      >
        <div className="bg-white/8 backdrop-blur-sm rounded-3xl p-16 border border-gray-400/20 shadow-xl">
          
          {/* 核心發現 */}
          <motion.div
            initial={{ opacity: 0, y: 50  }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-2xl text-white font-vintage font-light leading-[1.6] mb-8">
              🌳 
              <span
                style={{
                  background: 'linear-gradient(transparent 65%, #a7d7d9 65%)',
                  fontWeight: '600',
                  paddingBottom: '3px',
                  marginLeft: '0.5rem'
                }}
              >
                大安森林公園 34.9°C 的冷島奇蹟
              </span>
              <br />
              源自蒸發散效應、物理遮蔭與空氣對流三重降溫機制
            </p>
          </motion.div>

          {/* 溫差數據 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-2xl text-white font-vintage font-light leading-[1.6]">
              📏 相較於士林區開發區，溫差高達
              <span
                style={{
                  background: 'linear-gradient(transparent 65%, #a7d7d9 65%)',
                  fontWeight: '600',
                  paddingBottom: '3px',
                  marginLeft: '0.5rem',
                  marginRight: '0.5rem'
                }}
              >
                2.4–3.6°C
              </span>
              <br />
              相當於南移 300–500 公里的氣候差異，幾乎是台北到嘉義的距離
            </p>
          </motion.div>

          {/* 熱島強度 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-2xl text-white font-vintage font-light leading-[1.6]">
              🔥 
              <span
                style={{
                  background: 'linear-gradient(transparent 65%, #a7d7d9 65%)',
                  fontWeight: '600',
                  paddingBottom: '3px',
                  marginLeft: '0.5rem'
                }}
              >
                士林區 37.3–38.5°C 的極端高溫
              </span>
              <br />
              混凝土熱陷阱與多重反射效應，熱島強度達 10–15%
            </p>
          </motion.div>

          {/* 聚集效應 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-2xl text-white font-vintage font-light leading-[1.6]">
              ⚡ 
              <span
                style={{
                  background: 'linear-gradient(transparent 65%, #a7d7d9 65%)',
                  fontWeight: '600',
                  paddingBottom: '3px',
                  marginLeft: '0.5rem'
                }}
              >
                綠地聚集效應非線性增強
              </span>
              <br />
              大型集中綠地降溫效能達分散小綠地的 1.5–2 倍
            </p>
          </motion.div>

          {/* 分隔線 */}
          <div className="w-32 h-px bg-white/30 mx-auto my-16"></div>

          {/* 總結 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-3xl text-white font-vintage font-light leading-[1.6]">
              植被系統具備
              <span
                style={{
                  background: 'linear-gradient(transparent 60%, #a7d7d9 60%)',
                  fontWeight: '700',
                  paddingBottom: '4px',
                  fontSize: '1.2em',
                  marginLeft: '0.5rem',
                  marginRight: '0.5rem'
                }}
              >
                10–15% 溫度調節能力
              </span>
              <br />
              <span className="text-xl text-white/80 mt-6 block font-light">
                決定極端高溫頻率・熱舒適度・能源消耗的關鍵因子
              </span>
            </p>
          </motion.div>

        </div>
      </motion.div>
    </section>
  );
}
