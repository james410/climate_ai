# 🌐 API 使用指南 – 取得歷史與預測氣候資料

## 1️⃣ API 概覽

目前後端提供兩組資料查詢 API：

| API 類型 | 路徑格式                                      | 說明                                   |
|----------|---------------------------------------------|--------------------------------------|
| 歷史資料 | `/data/<year>/<month>/<column_id>+<row_id>` | 依指定年月與格點 ID 查詢歷史氣候資料       |
| NDVI預測 | `/NDVI/<month>/<vegetation>/<column_id>+<row_id>` | 依月份、植被覆蓋率與格點 ID 查詢預測氣候資料 |
| NDVI月度資料 | `/NDVIbymonth/<vegetation>/<column_id>+<row_id>` | 依植被覆蓋率與格點 ID 查詢全年溫度數據 |
| NDVI覆蓋率資料 | `/NDVIbycoverage/<month>/<column_id>+<row_id>` | 依月份與格點 ID 查詢不同植被覆蓋率的溫度數據 |
| 年度天氣狀況 | `/annual/<weather_conditions>/<year>/<column_id>+<row_id>` | 依年份與格點 ID 查詢特定天氣狀況的全年數據 |
| 年度溫度數據 | `/annual/temp/<year>/<column_id>+<row_id>` | 依年份與格點 ID 查詢所有溫度相關數據的全年資料 |
| 格點溫度地圖 | `/formap/<type>/<year>/<month>` | 依年月查詢所有格點的指定類型溫度數據 |
| NDVI溫度地圖 | `/formap/NDVI/<type>/<vegetation>/<month>` | 依月份查詢所有格點的指定類型NDVI預測溫度數據 |

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

### 取得 NDVI 月度資料

```bash
GET http://localhost:5000/NDVIbymonth/0.5/15+23
```

- 0.5 → 植被覆蓋率（0.0 ~ 1.0）
- 15 → column_id
- 23 → row_id

回應範例：

```json
{
    "1": {
        "Temperature": 25.6,
        "High_Temp": 28.5,
        "Low_Temp": 22.5
    },
    "2": {
        "Temperature": 26.1,
        "High_Temp": 29.1,
        "Low_Temp": 23.1
    },
    "3": {
        "Temperature": 27.3,
        "High_Temp": 30.2,
        "Low_Temp": 24.2
    },
    "4": {
        "Temperature": 28.0,
        "High_Temp": 31.0,
        "Low_Temp": 25.0
    },
    "5": {
        "Temperature": 29.5,
        "High_Temp": 32.5,
        "Low_Temp": 26.5
    },
    "6": {
        "Temperature": 31.2,
        "High_Temp": 34.2,
        "Low_Temp": 28.2
    },
    "7": {
        "Temperature": 32.8,
        "High_Temp": 35.8,
        "Low_Temp": 29.8
    },
    "8": {
        "Temperature": 32.1,
        "High_Temp": 35.1,
        "Low_Temp": 29.1
    },
    "9": {
        "Temperature": 30.5,
        "High_Temp": 33.5,
        "Low_Temp": 27.5
    },
    "10": {
        "Temperature": 28.8,
        "High_Temp": 31.8,
        "Low_Temp": 25.8
    },
    "11": {
        "Temperature": 26.9,
        "High_Temp": 29.9,
        "Low_Temp": 23.9
    },
    "12": {
        "Temperature": 25.2,
        "High_Temp": 28.2,
        "Low_Temp": 22.2
    }
}
```

回應數據說明：
- 鍵值（如 "1", "2", "12"）代表月份
- 每個月份包含三種溫度類型：Temperature（預測溫度）、High_Temp（最高預測溫度）、Low_Temp（最低預測溫度）

---

### 取得 NDVI 覆蓋率資料

```bash
GET http://localhost:5000/NDVIbycoverage/7/15+23
```

- 7 → 月份
- 15 → column_id
- 23 → row_id

回應範例：

```json
{
    "0.0": {
        "Temperature": 33.2,
        "High_Temp": 36.8,
        "Low_Temp": 29.6
    },
    "0.1": {
        "Temperature": 32.8,
        "High_Temp": 36.2,
        "Low_Temp": 29.4
    },
    "0.2": {
        "Temperature": 32.4,
        "High_Temp": 35.6,
        "Low_Temp": 29.2
    },
    "0.3": {
        "Temperature": 32.0,
        "High_Temp": 35.0,
        "Low_Temp": 29.0
    },
    "0.4": {
        "Temperature": 31.6,
        "High_Temp": 34.4,
        "Low_Temp": 28.8
    },
    "0.5": {
        "Temperature": 31.2,
        "High_Temp": 33.8,
        "Low_Temp": 28.6
    },
    "0.6": {
        "Temperature": 30.8,
        "High_Temp": 33.2,
        "Low_Temp": 28.4
    },
    "0.7": {
        "Temperature": 30.4,
        "High_Temp": 32.6,
        "Low_Temp": 28.2
    },
    "0.8": {
        "Temperature": 30.0,
        "High_Temp": 32.0,
        "Low_Temp": 28.0
    },
    "0.9": {
        "Temperature": 29.6,
        "High_Temp": 31.4,
        "Low_Temp": 27.8
    },
    "1.0": {
        "Temperature": 29.2,
        "High_Temp": 30.8,
        "Low_Temp": 27.6
    }
}
```

回應數據說明：
- 鍵值（如 "0.0", "0.1", "1.0"）代表植被覆蓋率
- 每個植被覆蓋率包含三種溫度類型：Temperature（預測溫度）、High_Temp（最高預測溫度）、Low_Temp（最低預測溫度）
- 系統會自動處理不精確的植被覆蓋率數值（如 0.10000001 會顯示為 0.1）

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

### NDVI溫度地圖 

```bash
GET http://localhost:5000/formap/NDVI/Temperature_Predicted/0.1/11
```

- Temperature_Predicted → 溫度類型（可選：Temperature_Predicted, High_Temp_Predicted,Low_Temp_Predicted, Apparent_Temperature, Apparent_Temperature_High, Apparent_Temperature_Low）
- 0.1 → 植被覆蓋率
- 11 → 月份

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

---

## 3️⃣ 回應資料結構說明

所有 API 回應均採用結構化 JSON 格式，主要分為以下幾個部分：

### 單點資料查詢 API 回應結構

適用於：`/data`, `/NDVI` 單點查詢

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

### 時間序列資料查詢 API 回應結構

適用於：`/NDVIbymonth`, `/NDVIbycoverage`, `/annual` 等

- 以時間或參數為鍵值的巢狀物件
- 內層包含對應的溫度或氣象數據
- 數據格式簡潔，便於時間序列圖表繪製

### 地圖資料查詢 API 回應結構

適用於：`/formap` 系列

- 雙層巢狀結構：`column_id` → `row_id` → 數值
- 適合直接用於地理網格的視覺化呈現

## 4️⃣ 注意事項

- Response 格式為結構化 JSON，便於前端處理與渲染
- 年份與月份需為數字，月份範圍為 1-12
- 植被覆蓋率範圍為 0.0-1.0，系統會自動處理不精確的浮點數（如 0.10000001 → 0.1）
- 若查無資料，會回傳 404 狀態碼與錯誤訊息
- NDVI 相關 API 會自動尋找最接近的植被覆蓋率數值
- 所有氣象資料會自動包含對應的經緯度與海拔資訊
- 新增的 `NDVIbymonth` 和 `NDVIbycoverage` API 專門用於時間序列分析和植被覆蓋率對比分析