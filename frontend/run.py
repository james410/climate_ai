#!/usr/bin/env python3
"""
統一啟動腳本 - 同時啟動前端和後端
"""
import subprocess
import sys
import os
import time
import signal
import atexit
import shutil

class ProcessManager:
    def __init__(self):
        self.processes = []
        self.cleaned = False
    
    def add_process(self, process):
        """添加進程到管理列表"""
        self.processes.append(process)
    
    def terminate_all(self):
        """終止所有進程"""
        if self.cleaned:
            return
        
        self.cleaned = True
        print("\n🛑 正在停止所有服務...")
        for process in self.processes:
            if process.poll() is None:  # 進程還在運行
                try:
                    process.terminate()
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                except Exception as e:
                    print(f"警告: 停止進程時出錯: {e}")
        print("✅ 所有服務已停止")

def find_npm():
    """尋找 npm 執行檔"""
    # 先嘗試直接使用 npm
    npm_path = shutil.which("npm")
    if npm_path:
        return npm_path
    
    # 在 Windows 上，嘗試尋找 npm.cmd
    npm_cmd = shutil.which("npm.cmd")
    if npm_cmd:
        return npm_cmd
    
    # 嘗試常見的 Node.js 安裝路徑
    possible_paths = [
        os.path.expanduser("~\\AppData\\Roaming\\npm\\npm.cmd"),
        "C:\\Program Files\\nodejs\\npm.cmd",
        "C:\\Program Files (x86)\\nodejs\\npm.cmd"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None

def main():
    """主函數"""
    print("🚀 啟動 Climate AI 應用")
    print("=" * 40)
    print("📱 前端地址: http://localhost:3000")
    print("🔗 後端地址: http://localhost:5000")
    print("🛑 按 Ctrl+C 停止所有服務")
    print("=" * 40)
    
    pm = ProcessManager()
    
    # 註冊清理函數
    atexit.register(pm.terminate_all)
    
    try:
        # 檢查 npm 是否可用
        npm_path = find_npm()
        if not npm_path:
            print("❌ 錯誤: 找不到 npm 命令")
            print("請確保 Node.js 已正確安裝並在 PATH 中")
            return
        
        print(f"🔍 使用 npm 路徑: {npm_path}")
        
        # 啟動後端
        print("🔧 正在啟動後端服務器...")
        backend_dir = os.path.join(os.getcwd(), "frontend","Rag_Chatbot")
        
        # 檢查後端目錄和文件是否存在
        if not os.path.exists(backend_dir):
            print(f"❌ 錯誤: 找不到後端目錄: {backend_dir}")
            return
        
        chatbot_path = os.path.join(backend_dir, "CHATBOT.py")
        if not os.path.exists(chatbot_path):
            print(f"❌ 錯誤: 找不到 CHATBOT.py: {chatbot_path}")
            return
        
        backend_process = subprocess.Popen([
            sys.executable, "CHATBOT.py"
        ], cwd=backend_dir)
        pm.add_process(backend_process)
        
        # 等待後端啟動
        print("⏳ 等待後端服務器啟動...")
        backend_ready = False
        
        # 檢查後端是否啟動成功（最多等待10秒）
        for i in range(10):
            time.sleep(1)
            if backend_process.poll() is not None:
                print("❌ 後端服務器啟動失敗")
                print("請手動檢查後端錯誤")
                return
            
            # 嘗試連接後端 API 檢查是否啟動成功
            try:
                import urllib.request
                with urllib.request.urlopen('http://localhost:5001') as response:
                    if response.status == 200:
                        backend_ready = True
                        print("✅ 後端服務器啟動成功")
                        break
            except:
                continue
        
        if not backend_ready:
            print("⚠️ 無法確認後端服務器狀態，但繼續啟動前端...")
        
        # 檢查後端是否成功啟動
        if backend_process.poll() is not None:
            print("❌ 後端服務器啟動失敗")
            print("請手動檢查後端錯誤")
            return
        
        # 啟動前端
        print("🌐 正在啟動前端服務器...")
        
        # 使用 shell=True 來確保命令能正確執行
        frontend_dir = os.path.join(os.getcwd(), "frontend")
        frontend_process = subprocess.Popen([
            npm_path, "run", "dev"
        ],cwd=frontend_dir, shell=True)
        pm.add_process(frontend_process)
        
        print("\n✅ 所有服務已啟動！")
        print("🌐 正在監控服務狀態...")
        
        # 保持運行直到用戶中斷
        while True:
            time.sleep(1)
            
            # 檢查進程是否還在運行
            if backend_process.poll() is not None:
                print("❌ 後端服務器意外停止")
                print("� 請手動運行以查看錯誤: cd Rag_Chatbot && python CHATBOT.py")
                break
            if frontend_process.poll() is not None:
                print("❌ 前端服務器意外停止")
                print("� 請手動運行以查看錯誤: npm run dev")
                break
                
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"❌ 啟動過程中出現錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        pm.terminate_all()

if __name__ == "__main__":
    main()
