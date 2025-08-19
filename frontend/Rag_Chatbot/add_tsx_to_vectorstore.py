"""
專門用來添加 TypeScript React 文件到向量數據庫的腳本
"""
import os
from simple_vectorstore import SimpleVectorStore, DocumentProcessor

def add_tsx_file_to_vectorstore():
    """將 index.tsx 文件添加到向量數據庫"""
    
    # 目標文件路徑
    tsx_file_path = r"C:\Users\a0936\Desktop\Projects\AI_Project\0816_UI\climate_ai-mid_frontend\src\components\sections\EducationSection\index.tsx"
    
    print("🔄 準備添加 TypeScript React 組件到向量數據庫...")
    
    # 檢查文件是否存在
    if not os.path.exists(tsx_file_path):
        print(f"❌ 檔案不存在: {tsx_file_path}")
        return False
    
    try:
        # 初始化處理器和向量庫
        processor = DocumentProcessor()
        vectorstore = SimpleVectorStore()
        
        # 嘗試載入現有的向量庫
        vectorstore_path = "vectorstore.pkl"
        if os.path.exists(vectorstore_path):
            print("📂 載入現有向量庫...")
            vectorstore.load(vectorstore_path)
        else:
            print("🆕 建立新的向量庫...")
        
        # 處理 TSX 文件
        print(f"📄 處理檔案: {tsx_file_path}")
        
        chunks = processor.process_text_files([tsx_file_path])
        
        if chunks:
            print(f"✅ 成功分割為 {len(chunks)} 個文字塊")
            
            # 添加到向量庫
            vectorstore.add_documents(chunks)
            
            # 保存向量庫
            vectorstore.save(vectorstore_path)
            
            print("🎉 成功將 EducationSection 組件添加到向量數據庫！")
            
            # 測試搜尋功能
            print("\n🔍 測試搜尋功能...")
            test_queries = [
                "RAG 聊天機器人",
                "熱島小學堂",
                "React 組件",
                "sendMessage 函數"
            ]
            
            for query in test_queries:
                results = vectorstore.search(query, k=2)
                print(f"\n查詢: '{query}' -> 找到 {len(results)} 個相關結果")
                for i, result in enumerate(results, 1):
                    print(f"  {i}. [相似度: {result['score']:.3f}] {result['content'][:100]}...")
            
            return True
            
        else:
            print("❌ 無法處理該檔案")
            return False
            
    except Exception as e:
        print(f"❌ 處理過程中發生錯誤: {e}")
        return False

if __name__ == "__main__":
    print("🛠️  TSX 檔案向量化工具")
    print("=" * 50)
    
    success = add_tsx_file_to_vectorstore()
    
    if success:
        print("\n✅ 完成！現在你的 RAG 系統可以回答關於 EducationSection 組件的問題了")
        print("\n💡 建議測試問題:")
        print("- 這個組件有什麼功能？")
        print("- RAG 聊天機器人是如何實現的？")
        print("- 如何發送訊息給後端？")
        print("- 組件使用了哪些 React hooks？")
    else:
        print("\n❌ 處理失敗，請檢查錯誤訊息")
