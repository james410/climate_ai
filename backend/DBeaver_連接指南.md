# DBeaver MySQL 連接設定指南

## 📋 連接資訊

### 基本設定
- **連接類型**: MySQL
- **服務器主機**: `localhost`
- **端口**: `3306`
- **資料庫**: `climate_metadata`
- **用戶名**: `root`
- **密碼**: `climate123`

### 詳細設定步驟

1. **開啟 DBeaver**
   - 點擊 "新建連接" 或按 `Ctrl+Shift+N`

2. **選擇資料庫類型**
   - 選擇 "MySQL"
   - 點擊 "下一步"

3. **輸入連接資訊**
   ```
   服務器主機: localhost
   端口: 3306
   資料庫: climate_metadata
   用戶名: root
   密碼: climate123
   ```

4. **❗ 重要：設定驅動屬性（解決Public Key錯誤）**
   - 點擊 "驅動屬性" 標籤頁
   - 點擊 "+" 添加以下屬性：
     ```
     allowPublicKeyRetrieval = true
     useSSL = false
     serverTimezone = Asia/Taipei
     ```
   - 或者直接在 "連接設定" 中的URL框輸入：
     ```
     jdbc:mysql://localhost:3306/climate_metadata?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=Asia/Taipei
     ```

5. **測試連接**
   - 點擊 "測試連接" 按鈕
   - 如果顯示 "連接成功"，點擊 "確定"

6. **完成設定**
   - 點擊 "完成" 保存連接

## 📊 預期看到的表格

連接成功後，你應該會看到以下表格：

### 主要表格
1. **grid_metadata** - 網格元數據 (15筆台灣城市資料)
2. **environmental_data** - 環境數據 (21筆測試資料)
3. **prediction_requests** - 預測請求記錄
4. **system_config** - 系統配置 (5筆配置資料)

### 視圖
1. **grid_env_overview** - 網格環境概覽
2. **prediction_stats** - 預測統計

## 🔍 測試查詢

### 查看所有網格
```sql
SELECT * FROM grid_metadata ORDER BY grid_id;
```

### 查看台北市環境數據
```sql
SELECT g.region_name, e.data_date, e.temperature, e.vegetation_coverage
FROM grid_metadata g
JOIN environmental_data e ON g.grid_id = e.grid_id
WHERE g.region_name = '台北市'
ORDER BY e.data_date DESC;
```

### 查看網格概覽
```sql
SELECT * FROM grid_env_overview;
```

## 🐛 故障排除

### "Public Key Retrieval is not allowed" 錯誤

這是MySQL 8.0的安全特性，需要在DBeaver中設定允許公鑰檢索：

1. **在連接設定中添加驅動屬性**
   - 進入 "驅動屬性" 標籤
   - 添加/修改以下屬性：
     ```
     allowPublicKeyRetrieval = true
     useSSL = false
     serverTimezone = Asia/Taipei
     ```

2. **或者在連接URL中直接指定**
   ```
   jdbc:mysql://localhost:3306/climate_metadata?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=Asia/Taipei
   ```

### 連接失敗的常見原因

1. **Docker 容器未啟動**
   ```bash
   docker-compose ps
   # 檢查 climate-mysql 是否在運行
   ```

2. **MySQL 還在初始化**
   ```bash
   docker-compose logs mysql
   # 等待看到 "ready for connections" 消息
   ```

3. **端口被占用**
   ```bash
   netstat -an | findstr 3306
   # 檢查端口是否被其他服務占用
   ```

4. **防火牆問題**
   - 確保 Windows 防火牆允許端口 3306

### 解決方案

1. **重啟 MySQL 容器**
   ```bash
   docker-compose restart mysql
   ```

2. **查看 MySQL 日誌**
   ```bash
   docker-compose logs mysql
   ```

3. **手動測試連接**
   ```bash
   docker-compose exec mysql mysql -u root -p climate_metadata
   ```

## 📈 成功連接的標誌

連接成功後，你應該能看到：
- ✅ 15個網格點（台灣各城市）
- ✅ 21筆環境數據記錄
- ✅ 5個系統配置項目
- ✅ 2個查詢視圖可用

## 🔧 進階設定

### SSL 設定（如果需要）
- 在連接設定的 "SSL" 頁籤中
- 選擇 "禁用" 或 "首選"（針對本地開發）

### 編碼設定
- 確保使用 UTF-8 編碼
- MySQL 已設定為 utf8mb4 字符集
