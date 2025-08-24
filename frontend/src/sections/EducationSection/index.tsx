'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import React, { useState, useEffect } from 'react';
import MouseFollowCanvasBackground from './MouseFollowCanvasBackground'; // 滑鼠跟隨粒子版本
import CSSAnimatedBackground from './CSSAnimatedBackground'; // CSS 動畫版本（最穩定）

// 定義訊息類型
interface Message {
  id: string | number;
  content: string;
  type: 'user' | 'bot' | 'system' | 'error' | 'loading';
  timestamp: Date;
}

// 定義系統狀態類型
interface SystemStatus {
  ready: boolean;
  status: 'connecting' | 'ready' | 'error';
  text: string;
}

export default function EducationSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  
  // RAG 聊天機器人狀態
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    ready: false,
    status: 'connecting',
    text: '連接中...'
  });
  const [sessionId] = useState<string>(`user_${Date.now()}`);
  
  // DOM 引用
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // 初始化聊天機器人
  useEffect(() => {
  checkSystemStatus();
  }, []);

  // 自動滾動到底部
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // 檢查系統狀態
  const checkSystemStatus = async () => {
    try {
      const response = await fetch('http://localhost:5001/status');
      const data = await response.json();
      if (data.ready) {
        setSystemStatus({
          ready: true,
          status: 'ready',
          text: 'ready'
        });
        // 僅在訊息為空時加入歡迎訊息
        setMessages(prev => {
          if (prev.length === 0) {
            const welcome = '您好！歡迎來到熱島小學堂！我可以回答有關都市熱島效應的問題，請問有什麼可以幫助您的嗎？';
            return [
              {
                id: Date.now() + Math.random(),
                content: welcome,
                type: 'bot',
                timestamp: new Date()
              }
            ];
          }
          return prev;
        });
      } else {
        setSystemStatus({
          ready: false,
          status: 'error',
          text: '系統未就緒'
        });
        addMessage('系統正在初始化中，請稍候...', 'system');
      }
    } catch (error) {
      setSystemStatus({
        ready: false,
        status: 'error',
        text: '連接失敗'
      });
      addMessage('無法連接到服務器，請檢查網路', 'error');
    }
  };

  // 添加歡迎訊息（僅在 messages 為空時加入）
  const addWelcomeMessage = () => {
    if (messages.length === 0) {
      const welcome = '您好！歡迎來到熱島小學堂！我可以回答有關都市熱島效應的問題，請問有什麼可以幫助您的嗎？';
      addMessage(welcome, 'bot');
    }
  };

  // 添加訊息
  const addMessage = (content: string, type: Message['type'], id: string | number | null = null): string | number => {
    const newMessage: Message = {
      id: id || Date.now() + Math.random(),
      content,
      type,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  // 移除訊息
  const removeMessage = (messageId: string | number): void => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // 發送訊息
  const sendMessage = async () => {
    const message = inputMessage.trim();
    
    if (!message || isLoading) return;

    // 驗證訊息長度
    if (message.length > 500) {
      addMessage('訊息長度不能超過 500 字', 'error');
      return;
    }

    // 顯示用戶訊息
    addMessage(message, 'user');
    setInputMessage('');

    // 設置載入狀態
    setIsLoading(true);
    const loadingMsgId = addMessage('正在思考中...', 'loading');

    try {
      const response = await fetch('http://localhost:5001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId
        })
      });

      const data = await response.json();
      
      // 移除載入訊息
      removeMessage(loadingMsgId);

      if (data.success) {
        addMessage(data.response, 'bot');
        const sources = data.sources || 0;
        setSystemStatus(prev => ({
          ...prev,
          text: `已回應 (參考 ${sources} 個來源)`
        }));
      } else {
        addMessage(`錯誤: ${data.error}`, 'error');
        setSystemStatus(prev => ({
          ...prev,
          status: 'error',
          text: '回應失敗'
        }));
      }

    } catch (error) {
      removeMessage(loadingMsgId);
      addMessage('網路錯誤，請稍後重試', 'error');
      setSystemStatus(prev => ({
        ...prev,
        status: 'error',
        text: '網路錯誤'
      }));
      console.error('發送訊息錯誤:', error);
    } finally {
      setIsLoading(false);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  };

  // 清除對話
  const clearChat = async () => {
    if (isLoading) return;

    if (window.confirm('確定要清除所有對話記錄嗎？')) {
      try {
        await fetch('http://localhost:5001/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId
          })
        });

        setMessages([]);
        addWelcomeMessage();
        setSystemStatus(prev => ({
          ...prev,
          text: '對話已清除'
        }));

      } catch (error) {
        addMessage('清除對話失敗', 'error');
      }
    }
  };

  // 檢查狀態
  const checkStatus = async () => {
    try {
      const response = await fetch('http://localhost:5001/status');
      const data = await response.json();
      
      let statusInfo = '系統狀態:\n';
      statusInfo += `• 整體狀態: ${data.ready ? '✅ 就緒' : '❌ 未就緒'}\n`;
      statusInfo += `• 語言模型: ${data.llm_loaded ? '✅ 已載入' : '❌ 未載入'}\n`;
      statusInfo += `• 向量資料庫: ${data.vectorstore_loaded ? '✅ 已載入' : '❌ 未載入'}\n`;
      statusInfo += `• 會話 ID: ${sessionId}`;
      
      alert(statusInfo);
      
    } catch (error) {
      alert('無法獲取系統狀態');
    }
  };

  // 處理鍵盤事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  // 渲染訊息
  const renderMessage = (message: Message) => {
    const { id, content, type } = message;
    
    // 訊息框樣式依 type 動態設定
    let msgClass = "message mb-3 p-3 rounded-2xl max-w-[80%] break-words decoration-double font-bold border-4 border-green-100 shadow-lg bg-white/10 text-white rounded-bl-sm text-2xl";
    if (type === 'user') {
      msgClass += "bg-white/10 text-white ml-auto rounded-br-sm";
    } else if (type === 'bot') {
      msgClass += "bg-white/10 text-white rounded-bl-sm";
    } else if (type === 'system') {
      msgClass += "bg-blue-50 text-white text-center text-sm mx-auto";
    } else if (type === 'error') {
      msgClass += "bg-red-50 text-white border border-red-200";
    } else {
      msgClass += "bg-gray-50 text-white";
    }

    return (
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={msgClass}
      >
        {type === 'loading' ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-1 border-primary border-t-transparent"></div>
            <span className="italic">{content}</span>
          </div>
        ) : (
          content
        )}
      </motion.div>
    );
  };

  return (
    <section ref={sectionRef} className="py-20 px-4 bg-transparent relative overflow-visible">
        <img
          src="/images/04.png"
          alt="BG"
          className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40 pointer-events-none"
        />
      {/* 雙層背景效果 - 同時使用兩個背景創造豐富層次 */}
      {/* 底層：CSS 動畫背景 - 提供鼠標跟隨和基礎漸變效果 */}
      {/* <CSSAnimatedBackground /> */}
      
      {/* 上層：滑鼠跟隨粒子背景 - 提供互動式粒子效果 */}
      <MouseFollowCanvasBackground />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h3 className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-white/60 mb-6">
            Urban Heat School 熱島小學堂
          </h3>
      
        </motion.div>

        {/* RAG 聊天機器人界面 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/0 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
          style={{ height: '80vh' }}
        >
          {/* 聊天機器人標題區 */}
            <div className="text-white p-6 text-center">
            {/* <h4 className="text-xl font-bold mb-2">熱島小學堂 </h4> */}
            <div className="flex items-center justify-center space-x-2 text-sm opacity-90">
              <div 
                className={`w-2 h-2 rounded-full ${
                  systemStatus.status === 'ready' ? 'bg-green-400' : 
                  systemStatus.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                }`}
              ></div>
              <span>{systemStatus.text}</span>
            </div>
          </div>

          {/* 聊天訊息區 */}
          <div 
            ref={chatMessagesRef}
            className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white/0"
            style={{ height: 'calc(100% - 200px)' }}
          >
            {messages.map(message => renderMessage(message))}
          </div>

          {/* 輸入區 */}
          <div className="p-6 border-t border-gray-200/50 h-20">
            <div className="flex space-x-3 mb-3">
              <input
                ref={messageInputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                // 使用者文字輸入設定
                className="flex-1 px-4 py-10 h-14 bg-primary text-white text-1xl font-bold border border-primary rounded-full outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:bg-primary/60 disabled:text-white/60 placeholder:text-white/60"
                placeholder="請輸入您關於都市熱島的問題..."
                disabled={!systemStatus.ready || isLoading}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!systemStatus.ready || isLoading}
                className="px-6 py-3 bg-green-200 text-green-800 rounded-full font-bold transition-all hover:bg-green-300 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[80px]"
              >
                {isLoading ? '傳送中...' : '發送'}
              </motion.button>
            </div>
            
            {/* 控制按鈕功能已移除 */}
          </div>
        </motion.div>
      </div>

    </section>
  );
}