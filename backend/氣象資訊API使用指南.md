# 🌐 API 使用指南 – 取得歷史與預測氣候資料

## 1️⃣ API 概覽

目前後端提供兩組資料查詢 API：

| API 類型 | 路徑格式                                      | 說明                                   |
|----------|---------------------------------------------|--------------------------------------|
| 歷史資料 | `/data/<year>/<month>/<column_id>+<row_id>` | 依指定年月與格點 ID 查詢歷史氣候資料       |
| NDVI預測 | `/NDVI/<month>/<vegetation>/<column_id>+<row_id>` | 依月份、植被覆蓋率與格點 ID 查詢預測氣候資料 |
| 年度天氣狀況 | `/annual/<weather_conditions>/<year>/<column_id>+<row_id>` | 依年份與格點 ID 查詢特定天氣狀況的全年數據 |
| 年度溫度數據 | `/annual/temp/<year>/<column_id>+<row_id>` | 依年份與格點 ID 查詢所有溫度相關數據的全年資料 |
| 格點溫度地圖 | `/formap/<type>/<year>/<month>` | 依年月查詢所有格點的指定類型溫度數據 |

`column_id` 與 `row_id` 對應到地理網格，系統會自動提供對應的經緯度與海拔資訊。

---

## 2️⃣ 請求範例

### 取得歷史資料

```bash
GET http://localhost:5000/data/2020/7/15+23
```

- 2020 → 年份
- 7 → 月份
- 15 → column_id
- 23 → row_id

回應範例：

```json
{
  "apparent_temperatures": {
    "current": 28.5,
    "high": 31.2,
    "low": 24.5
  },
  "temperatures": {
    "current": 27.4,
    "high": 31.2,
    "low": 24.5
  },
  "weather_conditions": {
    "humidity": 78.5,
    "pressure": 1012.3,
    "rain": 128.0,
    "solar": 5.6,
    "wind": 3.4
  },
  "location": {
    "column_id": 15,
    "row_id": 23,
    "latitude": 25.1131,
    "longitude": 121.2971,
    "elevation": 68.0
  },
  "metadata": {
    "id": 12345,
    "year": 2020,
    "month": 7,
    "vegetation": 0.35,
    "water_body": 0.05
  }
}
```

---

### 取得年度天氣狀況資料

```bash
GET http://localhost:5000/annual/solar/2020/15+23
```

- solar → 天氣狀況（可選：humidity, pressure, rain, solar, wind）
- 2020 → 年份
- 15 → column_id
- 23 → row_id

回應範例：

```json
{
    "1": 5.6,
    "2": 5.8,
    "3": 6.1,
    "4": 5.9,
    "5": 5.7,
    "6": 5.5,
    "7": 5.6,
    "8": 5.8,
    "9": 5.7,
    "10": 5.4,
    "11": 5.3,
    "12": 5.2
}
```

### 取得年度溫度數據

```bash
GET http://localhost:5000/annual/temp/2020/15+23
```

- 2020 → 年份
- 15 → column_id
- 23 → row_id

回應範例：

```json
{
    "Apparent_Temperature": {
        "1": 25.6,
        "2": 26.1,
        "3": 27.3,
        ...
    },
    "Apparent_Temperature_High": {
        "1": 28.5,
        "2": 29.1,
        "3": 30.2,
        ...
    },
    "Apparent_Temperature_Low": {
        "1": 22.5,
        "2": 23.1,
        "3": 24.2,
        ...
    },
    "Temperature": {
        "1": 24.6,
        "2": 25.1,
        "3": 26.3,
        ...
    },
    "High_Temp": {
        "1": 27.5,
        "2": 28.1,
        "3": 29.2,
        ...
    },
    "Low_Temp": {
        "1": 21.5,
        "2": 22.1,
        "3": 23.2,
        ...
    }
}
```

### 取得格點溫度地圖

```bash
GET http://localhost:5000/formap/Temperature/2020/7
```

- Temperature → 溫度類型（可選：Temperature, Low_Temp, High_Temp, Apparent_Temperature, Apparent_Temperature_High, Apparent_Temperature_Low）
- 2020 → 年份
- 7 → 月份

回應範例：

```json
{
    "0": {
        "0": 25.6,
        "1": 26.1,
        "2": 27.3
    },
    "1": {
        "0": 25.8,
        "1": 26.3,
        "2": 27.5
    }
}
```

回應數據說明：
- 第一層鍵（如 "0", "1"）代表 column_id
- 第二層鍵（如 "0", "1", "2"）代表 row_id
- 數值為該格點的指定類型溫度

### 取得 NDVI 預測資料

```bash
GET http://localhost:5000/NDVI/7/0.5/15+23
```

- 7 → 月份
- 0.5 → 植被覆蓋率（0.0 ~ 1.0）
- 15 → column_id
- 23 → row_id

回應範例：

```json
{
  "apparent_temperatures": {
    "current": 28.5,
    "high": 31.2,
    "low": 24.5
  },
  "predicted_temperatures": {
    "current": 27.4,
    "high": 31.2,
    "low": 24.5
  },
  "weather_conditions": {
    "humidity": 78.5,
    "pressure": 1012.3,
    "rain": 128.0,
    "solar": 5.6,
    "wind": 3.4
  },
  "location": {
    "column_id": 15,
    "row_id": 23,
    "latitude": 25.1131,
    "longitude": 121.2971,
    "elevation": 68.0
  },
  "metadata": {
    "id": 12345,
    "month": 7,
    "vegetation": 0.5,
    "water_body": 0.05
  }
}
```

---

## 3️⃣ 回應資料結構說明

所有 API 回應均採用結構化 JSON 格式，主要分為以下幾個部分：

1. `apparent_temperatures`: 體感溫度相關數據
   - `current`: 當前體感溫度
   - `high`: 最高體感溫度
   - `low`: 最低體感溫度

2. `temperatures`/`predicted_temperatures`: 實際或預測溫度
   - `current`: 當前溫度
   - `high`: 最高溫度
   - `low`: 最低溫度

3. `weather_conditions`: 其他氣象條件
   - `humidity`: 濕度
   - `pressure`: 氣壓
   - `rain`: 降雨量
   - `solar`: 日照
   - `wind`: 風速

4. `location`: 位置資訊
   - `column_id`: 網格行編號
   - `row_id`: 網格列編號
   - `latitude`: 緯度
   - `longitude`: 經度
   - `elevation`: 海拔高度

5. `metadata`: 其他元數據
   - `id`: 資料編號
   - `year`: 年份（僅歷史資料）
   - `month`: 月份
   - `vegetation`: 植被覆蓋率
   - `water_body`: 水體覆蓋率

## 4️⃣ 注意事項

- Response 格式為結構化 JSON，便於前端處理與渲染
- 年份與月份需為數字，月份範圍為 1-12
- 植被覆蓋率範圍為 0.0-1.0
- 若查無資料，會回傳 404 狀態碼與錯誤訊息
- API 預設無分頁功能，單次請求只會返回單一格點的資料
- 所有氣象資料會自動包含對應的經緯度與海拔資訊  

