import { useRef } from 'react';
import { motion, useScroll, easeInOut } from 'framer-motion';
import Image from 'next/image';

export default function HeatIslandReportLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const fadeIn = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeInOut } },
  };

  const slideIn = {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: easeInOut } },
  };

  const floatingAnimation = {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      ease: easeInOut,
      repeat: Infinity,
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#1a1d1f] text-text-secondary font-chinese">
      
      {/* 增加與上個Section的空白 */}
      <div className="h-[20vh]"></div>

      {/* 第一區塊：圖片左側，文字疊在圖片右下角 */}
      <section className="relative px-6 py-16 max-w-7xl mx-auto">
        {/* 圖片 - 左側20%-50% */}
        <motion.div
          className="absolute left-[15%] w-[35%] aspect-[4/3]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={slideIn}
          animate={floatingAnimation}
        >
          <div className="w-full h-full rounded-lg overflow-hidden opacity-80 shadow-2xl">
            <Image
              src="/images/img01.jpg"
              alt="城市熱島效應圖片"
              width={800}
              height={600}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* 文字 - 疊在圖片右下角 */}
        <motion.div
          className="relative ml-[42%] mt-[12%] max-w-[55%] space-y-6 z-10 bg-[#1a1d1f]/65 backdrop-blur-sm p-8 rounded-lg"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeIn}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-subtitle02 font-medium text-accent mb-4">一年比一年更熱的現實</h2>
          <p className="text-content01 leading-relaxed text-justify ">
            近十年來，台北與新北地區的平均氣溫穩步上升，每十年約增加<strong className="text-accent">0.9°C</strong>；當我們回顧過去的五年與展望未來的五年，溫度差距更接近<strong className="text-accent">0.8°C</strong>。
          </p>
          <p className="text-content01 leading-relaxed opacity-90 text-justify">
            這樣的增幅，猶如初夏午後的緩緩升溫，卻無形中堆積在每一個日常片刻中。站在夜色之下，空氣不再如從前般涼爽，那逐漸消逝的涼意，正悄然影響每一個城市的日常與夜晚。
          </p>
        </motion.div>
      </section>

      {/* 第二區塊：左側兩段文字，右側一張圖，文字右側略微覆蓋圖片 */}
      <section className="relative px-6 py-24 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* 左側文字區域 */}
        <div className="space-y-12 relative z-10">
          {/* 第一段文字 */}
          <motion.div
            className="relative ml-[38%] w-[75%] max-w-[120%] space-y-6 z-10 bg-[#1a1d1f]/65 backdrop-blur-sm p-8 rounded-lg"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={slideIn}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-subtitle02 font-medium text-accent mb-4">日夜溫差的悄然收斂</h2>
            <p className="text-content01 leading-relaxed text-justify">
              數據顯示，日夜溫差每十年縮小約<strong className="text-accent">0.7°C</strong>，平均月低溫上升<strong className="text-accent">1.23°C</strong> 。當夜間溫度上升，涼意轉被悶熱取代。未來的城市輪廓將在燈火中繼續延展，而黑夜則難以消去累積的餘溫。
            </p>
          </motion.div>

          {/* 第二段文字 */}
          <motion.div
            className="space-y-4 ml-[12%] max-w-[80%]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeIn}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-subtitle02 font-medium text-accent">綠覆與海風：微妙的降溫之道</h3>
            <p className="text-content01 leading-relaxed text-justify [text-align-last:justify]">
              研究指出，沿海地區綠覆每提升10%，平均氣溫可下降約<strong className="text-accent">0.02°C</strong>，夜間更可降約<strong className="text-accent">0.03°C</strong>。相對市區同增量綠覆，夜間僅微降<strong className="text-accent">0.01°C</strong>，白天降溫效果有限。當我們在海邊種下綠植，細微的變化正逐漸累積，為城市帶來一絲涼意。
            </p>
          </motion.div>
        </div>

        {/* 右側圖片 - 保留浮動效果 */}
        <motion.div
          className="absolute left-[49%] w-[35%] -translate-y-1/2 w-[35%] aspect-[4/3] z-0"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={slideIn}
          animate={floatingAnimation}
          transition={{ delay: 0.7 }}
        >
          <div className="aspect-[4/3] w-full rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="/images/img02.jpg"
              alt="溫度變化趨勢圖"
              width={800}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </section>


      {/* 第三區塊：背景圖片加遮罩，文字分行排列 */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* 背景圖片 */}
        <div className="absolute inset-0">
          <Image
            src="/images/img03.jpg"
            alt="城市景觀背景"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        {/* 底部區域模糊遮罩 */}
        <motion.div
          className="absolute inset-x-0 top-[40%] bottom-0 z-20 pointer-events-none"
          style={{
            background: `linear-gradient(to top, 
              rgba(26, 29, 31, 1) 5%, 
              rgba(29, 33, 36, 0.85) 20%, 
              rgba(26, 29, 31, 0.45) 40%, 
              rgba(26, 29, 31, 0.1) 70%, 
              rgba(255, 0, 0, 0) 100%)`,
          }}
        />

        {/* 文字內容 */}
        <motion.div
          className="relative z-30 max-w-3xl mx-auto px-6 space-y-8 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeIn}
        >
          <div className="space-y-4 mt-12">
            <p className="text-subtitle02 leading-relaxed text-text-primary">
              城市的熱島效應，是時間和空間交織而成的長篇敘事。<br />
              每一次溫度的改變，都是自然與人為力量的共鳴。<br />
              唯有在細微之處注入智慧，才能讓城市在未來的日子裡，<br />
              既保有繁華的脈動，也能在夜色中酣然入眠。
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
