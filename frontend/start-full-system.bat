@echo off
REM Climate AI 環境監測系統啟動腳本
REM 自動啟動 Flask 後端和 Next.js 前端

echo ===============================================================
echo 🌿 Climate AI 環境監測系統啟動中...
echo ===============================================================

REM 檢查 Python 是否安裝
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 未安裝或未添加到 PATH
    echo 請先安裝 Python 3.8+ 並添加到系統 PATH
    pause
    exit /b 1
)

REM 檢查 Node.js 是否安裝
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安裝或未添加到 PATH  
    echo 請先安裝 Node.js 18+ 並添加到系統 PATH
    pause
    exit /b 1
)

echo ✅ 環境檢查通過

REM 安裝 Flask 後端依賴
echo.
echo 📦 安裝 Flask 後端依賴...
pip install -r requirements_flask.txt
if errorlevel 1 (
    echo ⚠️ Flask 依賴安裝可能有問題，但將繼續執行...
)

REM 安裝前端依賴（如果需要）
echo.
echo 📦 檢查前端依賴...
if not exist "node_modules" (
    echo 安裝前端依賴...
    npm install
)

REM 詢問是否初始化數據庫
echo.
set /p init_db="🗄️ 是否需要初始化數據庫？(y/N): "
if /i "%init_db%"=="y" (
    echo 初始化數據庫...
    python init_database.py
    if errorlevel 1 (
        echo ⚠️ 數據庫初始化失敗，將使用模擬數據
    )
)

echo.
echo 🚀 啟動服務...

REM 在新窗口啟動 Flask 後端
start "Flask Backend" cmd /k "python route.py"

REM 等待後端啟動
echo ⏳ 等待後端服務啟動...
timeout /t 3 >nul

REM 在新窗口啟動 Next.js 前端
start "Next.js Frontend" cmd /k "npm run dev"

echo.
echo ===============================================================
echo ✅ 系統啟動完成！
echo ===============================================================
echo 🌐 前端地址: http://localhost:3000
echo 📊 後端 API: http://localhost:5001  
echo ===============================================================
echo 💡 提示：
echo   • 關閉此窗口不會停止服務
echo   • 要停止服務請關閉對應的命令窗口
echo   • 或使用 Ctrl+C 停止各個服務
echo ===============================================================

pause
