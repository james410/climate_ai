# Climate AI - 氣候預測系統

## 📋 專案概述

Climate AI 是一個基於 Flask 的氣候數據分析和預測系統，結合機器學習技術預測台灣各地區的氣候變化。

## 🏗️ 技術棧

- **後端**: Flask + SQLAlchemy
- **資料庫**: MySQL 8.0 (Docker)
- **前端**: HTML + Bootstrap (模板引擎)
- **容器化**: Docker + Docker Compose
- **依賴管理**: pip + requirements.txt

## 🚀 快速開始

### 1. 克隆專案
```bash
git clone https://github.com/LeoEarnest/climate_ai.git
cd climate_ai
```

### 2. 啟動 Docker 服務
```bash
cd MYSQL
docker-compose up -d
```

### 3. 驗證服務狀態
```bash
docker ps
# 確認 climate-mysql-645 和 climate-flask 都在運行
```

### 4. 訪問應用
- **Web 應用**: http://localhost:5000
- **資料庫**: localhost:3306 (climate_metadata)

## 📊 資料庫結構

### 主要表格
- `grid_metadata` - 網格座標和地區資訊
- `environmental_data` - 環境數據 (溫度、濕度、降雨等)
- `model_predictions` - AI 模型預測結果

### 測試數據
包含台灣 5 個主要城市的測試數據：
- 台北市、高雄市、台中市、台南市、新竹市

## 🔧 開發環境設定

### DBeaver 資料庫連接
詳見 [`DBeaver_連接指南.md`](./DBeaver_連接指南.md)

**連接資訊**:
- Host: `localhost:3306`
- Database: `climate_metadata`
- Username: `root`
- Password: `climate123`

### 依賴套件
```bash
pip install -r requirements.txt
```

主要依賴：
- Flask==2.3.3
- Flask-SQLAlchemy==3.0.5
- PyMySQL==1.1.0
- Flask-Login==0.6.2

## 📁 專案結構

```
climate_ai/
├── app/                          # Flask 應用主體
│   ├── __init__.py
│   ├── models.py                 # 資料庫模型
│   ├── templates/                # 前端模板
│   └── [功能模組]/
├── MYSQL/
│   ├── docker-compose.yml        # Docker 編排配置
│   └── init.sql                  # 資料庫初始化腳本
├── requirements.txt              # Python 依賴
├── run.py                       # 應用入口點
├── config.py                    # 應用配置
└── README.md                    # 專案說明
```

## 🎯 功能模組

- `login/` - 用戶認證系統
- `main/` - 主頁面和導航
- `climate_class/` - 氣候分類功能
- `predict_climate_variable/` - 氣候變數預測
- `predict_future_climate/` - 未來氣候預測

## 🔍 使用說明

1. **啟動系統**: `cd MYSQL && docker-compose up -d`
2. **訪問應用**: 開啟瀏覽器前往 http://localhost:5000
3. **查看資料**: 使用 DBeaver 連接 MySQL 檢視數據
4. **停止系統**: `docker-compose down`

## 📈 專案狀態

目前狀態詳見 [`項目狀態.md`](./項目狀態.md)

- ✅ 資料庫結構完成
- ✅ Docker 容器化完成
- ✅ 測試數據就緒
- 🔄 Flask 路由開發中
- 🔄 機器學習模型整合中

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📝 授權

此專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 🆘 支援

如有問題請查看：
- [`DBeaver_連接指南.md`](./DBeaver_連接指南.md) - 資料庫連接問題
- [`項目狀態.md`](./項目狀態.md) - 專案當前狀態
- GitHub Issues - 回報 Bug 或功能請求