'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, FormEvent } from 'react';

export default function EducationSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [mounted, setMounted] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<string[]>([
    '🌿 你知道植被是如何降低城市溫度的嗎？'
  ]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setMessages(prev => [...prev, inputValue.trim()]);
    setInputValue('');
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      setAtBottom(true);
    }
  };

  const handleScroll = () => {
    if (chatRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
      setAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
    }
  };

  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    ta.rows = 1;
    ta.rows = Math.min(4, ta.value.split('\n').length);
  };

  return (
    <section
      ref={sectionRef}
      className="py-40 px-12 md:px-16 lg:px-24 bg-transparent relative overflow-visible"
    >
      <div className="max-w-6xl mx-auto space-y-32 relative z-10">
        {/* 標題區 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView && mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h3 className="font-black text-[clamp(2.5rem,6vw,4rem)] text-white mb-4">
            Urban Heat Forum
          </h3>
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView && mounted ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm md:text-xl text-gray-300 whitespace-pre-line font-vintage tracking-[0.25em] leading-[1.5]"
          >
            {`陽光，雨水，河流，風，植物，建築

這些匯流成都市的命脈，以及你我生活的基礎

試著與我們的資料庫對話，與未來的想像更近一步吧！`}
          </motion.p>
        </motion.div>

        {/* 智慧客服聊天區（只有客戶端渲染） */}
        {mounted && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-[rgba(37,38,40,0.7)] backdrop-blur-lg rounded-3xl p-8 flex flex-col space-y-6 relative"
          >
            <div
              id="chat-window"
              ref={chatRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto space-y-6 max-h-[600px] pr-4 scrollbar scrollbar-thumb scrollbar-track"
            >
              {messages.map((msg, idx) => (
                <div key={idx} className="relative">
                  {idx !== 0 && (
                    <div className="absolute top-0 left-12 right-12 h-px bg-gray-200"></div>
                  )}
                  <div className="flex items-start space-x-3 pt-4">
                    {idx % 2 === 0 ? (
                      <>
                        
                        <div className="bg-white bg-opacity-90 text-gray-900 rounded-tl-none rounded-tr-xl rounded-bl-xl rounded-br-xl p-4 max-w-[70%] shadow-md border border-gray-200">
                          <p className="font-bold text-sm mb-1">客服</p>
                          <p className="leading-relaxed">{msg}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1" />
                        <div className="bg-gray-100 text-gray-800 rounded-tr-none rounded-tl-xl rounded-br-xl rounded-bl-xl p-4 max-w-[70%] self-end shadow-sm border border-gray-200 leading-relaxed">
                          <p className="font-bold text-sm text-right mb-1">我</p>
                          <p className="text-right leading-relaxed">{msg}</p>
                        </div>
                        <img
                          src="/avatar-user.png"
                          className="w-8 h-8 rounded-full"
                          alt="我"
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!atBottom && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 right-6 bg-primary text-white px-4 py-2 rounded-full shadow-lg"
              >
                ↓ 新訊息
              </button>
            )}

            {/* 輸入區 */}
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="flex items-center gap-2">
                <textarea
                  rows={1}
                  onInput={autoResize}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="請輸入你的回覆..."
                  className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 placeholder-gray-500 focus:outline-none resize-none transition-all"
                />
                <button type="submit" className="bg-primary text-white p-3 rounded-full">
                  <svg /* icon */ />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </section>
  );
}
