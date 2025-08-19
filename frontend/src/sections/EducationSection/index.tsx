'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import React, { useState, useEffect } from 'react';
import MouseFollowCanvasBackground from './MouseFollowCanvasBackground';
import CSSAnimatedBackground from './CSSAnimatedBackground';

// 訊息介面定義
interface ChatMessage {
  id: string | number;
  content: string;
  type: 'user' | 'bot' | 'system' | 'error' | 'loading';
  timestamp: Date;
}

// 系統狀態介面定義
interface ChatSystemStatus {
  ready: boolean;
  status: 'connecting' | 'ready' | 'error';
  text: string;
}

export default function NewChatInterface() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  
  // 聊天狀態管理
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<ChatSystemStatus>({
    ready: false,
    status: 'connecting',
    text: '正在連接...'
  });
  const [sessionId] = useState<string>(`session_${Date.now()}`);
  
  // DOM 引用
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 組件初始化
  useEffect(() => {
    initializeChat();
  }, []);

  // 自動滾動到最新訊息
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 初始化聊天系統
  const initializeChat = async () => {
    try {
      const response = await fetch('http://localhost:5000/status');
      const data = await response.json();
      
      if (data.ready) {
        setSystemStatus({
          ready: true,
          status: 'ready',
          text: '系統就緒'
        });
        
        // 添加歡迎訊息
        if (messages.length === 0) {
          addMessage('歡迎使用熱島小學堂 AI 助理！我可以回答關於都市熱島效應的問題。', 'bot');
        }
      } else {
        setSystemStatus({
          ready: false,
          status: 'error',
          text: '系統初始化中...'
        });
        addMessage('系統正在啟動中，請稍等片刻...', 'system');
      }
    } catch (error) {
      setSystemStatus({
        ready: false,
        status: 'error',
        text: '連接失敗'
      });
      addMessage('無法連接到伺服器，請檢查網路連線', 'error');
    }
  };

  // 添加新訊息
  const addMessage = (content: string, type: ChatMessage['type'], messageId?: string | number): string | number => {
    const newMessage: ChatMessage = {
      id: messageId || `msg_${Date.now()}_${Math.random()}`,
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

  // 發送訊息邏輯
  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    
    if (!trimmedMessage || isLoading) return;

    // 檢查訊息長度
    if (trimmedMessage.length > 500) {
      addMessage('訊息長度超過限制（最多 500 字）', 'error');
      return;
    }

    // 顯示用戶訊息
    addMessage(trimmedMessage, 'user');
    setInputMessage('');
    setIsLoading(true);

    // 顯示載入中訊息
    const loadingId = addMessage('AI 正在思考中...', 'loading');

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          session_id: sessionId
        })
      });

      const result = await response.json();
      
      // 移除載入訊息
      removeMessage(loadingId);

      if (result.success) {
        addMessage(result.response, 'bot');
        const sourceCount = result.sources || 0;
        setSystemStatus(prev => ({
          ...prev,
          text: `回應完成 (參考了 ${sourceCount} 個資料來源)`
        }));
      } else {
        addMessage(`處理失敗: ${result.error}`, 'error');
        setSystemStatus(prev => ({
          ...prev,
          status: 'error',
          text: '處理失敗'
        }));
      }

    } catch (error) {
      removeMessage(loadingId);
      addMessage('網路錯誤，請稍後再試', 'error');
      setSystemStatus(prev => ({
        ...prev,
        status: 'error',
        text: '網路異常'
      }));
      console.error('發送訊息時發生錯誤:', error);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // 清空對話
  const handleClearChat = async () => {
    if (isLoading) return;

    if (window.confirm('確定要清除所有對話紀錄嗎？')) {
      try {
        await fetch('http://localhost:5000/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId
          })
        });

        setMessages([]);
        addMessage('歡迎使用熱島小學堂 AI 助理！我可以回答關於都市熱島效應的問題。', 'bot');
        setSystemStatus(prev => ({
          ...prev,
          text: '對話已清除'
        }));

      } catch (error) {
        addMessage('清除對話失敗', 'error');
      }
    }
  };

  // 檢查系統狀態
  const handleCheckStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/status');
      const data = await response.json();
      
      let statusReport = '📊 系統狀態報告:\n\n';
      statusReport += `🔗 整體狀態: ${data.ready ? '✅ 正常運行' : '❌ 異常'}\n`;
      statusReport += `🧠 語言模型: ${data.llm_loaded ? '✅ 已載入' : '❌ 未載入'}\n`;
      statusReport += `🗃️ 向量資料庫: ${data.vectorstore_loaded ? '✅ 已載入' : '❌ 未載入'}\n`;
      statusReport += `🆔 會話識別碼: ${sessionId}`;
      
      alert(statusReport);
      
    } catch (error) {
      alert('❌ 無法取得系統狀態資訊');
    }
  };

  // 鍵盤事件處理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  // 訊息渲染組件
  const MessageCard = ({ message }: { message: ChatMessage }) => {
    const { id, content, type } = message;
    
    return (
      <motion.div
        key={id}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full mb-6"
      >
        <div
          className={`
            w-full p-5 rounded-3xl shadow-xl border-2 backdrop-blur-md transition-all duration-300 hover:shadow-2xl
            ${type === 'user' 
              ? 'bg-gradient-to-br from-blue-500/30 via-blue-600/30 to-purple-600/30 text-white border-blue-300 transform hover:scale-[1.02]'
              : type === 'bot'
              ? 'bg-white/30 text-gray-800 border-gray-300 hover:bg-white/40'
              : type === 'system'
              ? 'bg-gradient-to-r from-cyan-100/30 to-blue-100/30 text-cyan-900 border-cyan-300'
              : type === 'error'
              ? 'bg-gradient-to-r from-red-100/30 to-pink-100/30 text-red-800 border-red-300'
              : 'bg-gray-100/30 text-gray-700 border-gray-300'
            }
          `}
        >
          {/* 訊息標籤列 */}
          <div className="flex items-center mb-3">
            {type === 'user' && (
              <div className="flex items-center text-blue-100">
                <span className="text-lg mr-2">👤</span>
                <span className="font-semibold text-sm">使用者</span>
              </div>
            )}
            {type === 'bot' && (
              <div className="flex items-center text-gray-600">
                <span className="text-lg mr-2">🤖</span>
                <span className="font-semibold text-sm">熱島小學堂 AI</span>
              </div>
            )}
            {type === 'system' && (
              <div className="flex items-center text-cyan-700">
                <span className="text-lg mr-2">ℹ️</span>
                <span className="font-semibold text-sm">系統通知</span>
              </div>
            )}
            {type === 'error' && (
              <div className="flex items-center text-red-700">
                <span className="text-lg mr-2">⚠️</span>
                <span className="font-semibold text-sm">錯誤訊息</span>
              </div>
            )}
          </div>
          
          {/* 訊息內容 */}
          {type === 'loading' ? (
            <div className="flex items-center space-x-3">
              <div className="inline-block w-4 h-4 border-3 border-gray-400 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-gray-600 italic font-medium">AI 正在分析您的問題...</span>
            </div>
          ) : (
            <div className="text-lg leading-relaxed font-medium whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <section ref={sectionRef} className="py-20 px-4 bg-transparent relative overflow-hidden min-h-screen">
      {/* 背景層 - 最底層 z-index */}
      <div className="absolute inset-0 w-full h-full z-0">
        <CSSAnimatedBackground />
      </div>
      <div className="absolute inset-0 w-full h-full z-1">
        <MouseFollowCanvasBackground />
      </div>

      {/* 內容層 - 確保在背景之上 */}
      <div className="max-w-5xl mx-auto relative z-20" style={{ transform: 'translateY(-100px)' }}>
        {/* 標題區域 */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h1 className="text-[clamp(2.5rem,7vw,4rem)] font-black bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600 text-transparent bg-clip-text mb-4 tracking-tight">
            🏙️ Urban Heat School
          </h1>
          <p className="text-xl text-gray-700 font-semibold bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full inline-block">
            熱島小學堂智能助理
          </p>
        </motion.div>

        {/* 主要聊天介面 - 縮小到70%並增加圓角 */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="bg-transparent backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden mx-auto border-2 border-white/40 relative z-30"
          style={{ 
            width: '84%', 
            maxWidth: '672px', 
            height: '60vh',
            minHeight: '500px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* 聊天室標題欄 - 強化綠色背景，增加圓角 */}
          <div 
            className="text-white py-1 px-3 text-center flex-shrink-0 relative overflow-hidden z-10"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.5) 0%)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)',
              borderTopLeftRadius: '1rem',
              borderTopRightRadius: '1rem'
            }}
          >
            {/* 移除黑色遮罩，讓綠色更鮮明 */}
            <div className="relative z-10">
              <h2 className="text-lg font-semibold flex items-center justify-center">
                <span className="mr-2 text-lg">🤖</span>
                RAG 智能聊天助理
                <div 
                  className={`ml-2 w-2 h-2 rounded-full ${
                    systemStatus.status === 'ready' ? 'bg-green-400 animate-pulse' : 
                    systemStatus.status === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-bounce'
                  }`}
                ></div>
              </h2>
            </div>
          </div>

          {/* 訊息顯示區域 - 確保可讀性 */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 p-6 overflow-y-auto relative z-10"
            style={{ 
              background: 'rgba(248, 249, 250, 0.3)',
              scrollBehavior: 'smooth'
            }}
          >
            <div className="space-y-0">
              {messages.map(message => (
                <MessageCard key={message.id} message={message} />
              ))}
            </div>
          </div>

          {/* 輸入控制區域 - 確保在最上層 */}
          <div className="p-6 bg-white/90 backdrop-blur-md border-t-4 border-white/50 flex-shrink-0 relative z-10">
            {/* 輸入框區域 */}
            <div className="flex gap-4 items-center mb-4">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-16 py-16 border-3 border-gray-300 rounded-2xl outline-none text-gray-800 text-xl font-medium transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 disabled:bg-gray-200 disabled:text-gray-500 placeholder:text-gray-400 shadow-lg resize-none"
                placeholder="輸入您關於都市熱島效應的問題..."
                disabled={!systemStatus.ready || isLoading}
                rows={4}
                style={{ minHeight: '40px' }}
              />
              <motion.button
                whileHover={{ 
                  scale: !systemStatus.ready || isLoading ? 1 : 1.08,
                  rotate: !systemStatus.ready || isLoading ? 0 : 5
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={!systemStatus.ready || isLoading}
                className="px-8 h-full bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg transition-all duration-300 hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed min-w-[120px] shadow-lg flex items-center justify-center"
                style={{ minHeight: '70px' }}
              >
                {isLoading ? '處理中...' : '發送 🚀'}
              </motion.button>
            </div>
            
            {/* 控制按鈕區域 */}
            <div className="flex justify-center gap-4">
              
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}