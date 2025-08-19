"""
超簡化 RAG Agent - 清晰易懂的核心邏輯
"""
import os
from typing import Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from simple_vectorstore import SimpleVectorStore


class SimpleRAG:
    """簡化版 RAG 聊天機器人"""
    
    def __init__(self, google_api_key: str):
        self.api_key = google_api_key
        self.llm = None
        self.vectorstore = None
        self.chat_history = {}
        
    def load_llm(self):
        """載入語言模型"""
        try:
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=self.api_key,
                temperature=0.7
            )
            print("✅ 語言模型載入成功")
            return True
        except Exception as e:
            print(f"❌ 語言模型載入失敗: {e}")
            return False
    
    def load_vectorstore(self, path: str = "vectorstore.pkl"):
        """載入向量資料庫"""
        self.vectorstore = SimpleVectorStore()
        if self.vectorstore.load(path):
            print("✅ 向量資料庫載入成功")
            return True
        else:
            print("❌ 向量資料庫載入失敗")
            return False
    
    def search_documents(self, query: str, k: int = 3) -> str:
        """搜尋相關文檔"""
        if not self.vectorstore:
            return "沒有可用的文檔資料庫"
        
        results = self.vectorstore.search(query, k)
        
        if not results:
            return "沒有找到相關文檔"
        
        # 組合搜尋結果
        context = ""
        for i, result in enumerate(results, 1):
            context += f"文檔 {i}:\n{result['content']}\n\n"
        
        return context
    
    def generate_response(self, query: str, context: str) -> str:
        """生成回應"""
        if not self.llm:
            return "語言模型未載入"
        
        # 建立提示詞
        prompt = f"""
你是一個熱島效應的專家學者。可以根據以下提供的內容回答用戶的問題。
回答請精煉至100字內。

文檔內容：
{context}

用戶問題：{query}

如果有問到內容外的問題，可以自行在搜尋額外補充，回答範圍請限制在熱島效應相關的知識上。
如果有超過範圍或不清楚的問題請簡短回答，應答時只需要回答內容相關的回答就好，需要要有多餘的贅字或是說根據甚麼回答
請用繁體中文回答。
"""
        
        try:
            response = self.llm.invoke(prompt)
            return response.content
        except Exception as e:
            return f"生成回應時發生錯誤: {e}"
    
    def chat(self, message: str, session_id: str = "default") -> Dict:
        """主要聊天功能"""
        try:
            # 1. 搜尋相關文檔
            context = self.search_documents(message)
            
            # 2. 生成回應 
            response = self.generate_response(message, context)
            
            # 3. 儲存對話歷史（簡化版）
            if session_id not in self.chat_history:
                self.chat_history[session_id] = []
            
            self.chat_history[session_id].append({
                "user": message,
                "bot": response
            })
            
            return {
                "success": True,
                "response": response,
                "sources": len(context.split("文檔")) - 1 if context else 0
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def clear_history(self, session_id: str = "default"):
        """清除對話歷史"""
        if session_id in self.chat_history:
            del self.chat_history[session_id]
        return True
    
    def is_ready(self) -> bool:
        """檢查系統是否準備就緒"""
        return self.llm is not None and self.vectorstore is not None


# 簡單測試
if __name__ == "__main__":
    # 測試用的 API 金鑰
    api_key = os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        print("❌ 請設置 GOOGLE_API_KEY 環境變數")
        exit()
    
    # 建立 RAG 系統
    rag = SimpleRAG(api_key)
    
    # 載入模型和資料庫
    if rag.load_llm() and rag.load_vectorstore():
        print("\n🤖 RAG 聊天機器人已準備就緒！")
        print("輸入 'quit' 退出\n")
        
        while True:
            user_input = input("您: ")
            if user_input.lower() == 'quit':
                break
            
            result = rag.chat(user_input)
            if result["success"]:
                print(f"機器人: {result['response']}")
                print(f"(參考了 {result['sources']} 個文檔)\n")
            else:
                print(f"錯誤: {result['error']}\n")
    else:
        print("❌ 系統初始化失敗")