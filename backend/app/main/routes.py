from flask import render_template, jsonify
from app.main import bp
from app import db
from app.models import HistoryData, NDVITemp, IndexTable
from sqlalchemy import func

@bp.route('/')
@bp.route('/index')
def index():
    return render_template('index.html', title='主頁')


@bp.route('/NDVI/<int:month>/<path:veg>/<string:colrow>', methods=['GET'])
def get_ndvi_data(month, veg, colrow):
    try:
        # 檢查 vegetation_coverage 是否為有效的浮點數
        try:
            vegetation_coverage = float(veg)
        except ValueError:
            return jsonify({"error": "Invalid vegetation coverage value 植被覆蓋率格式無效"}), 400

        # 檢查 column_id+row_id 格式
        if '+' not in colrow:
            return jsonify({"error": "Invalid format, expected column_id+row_id 無效格式，請輸入column ID+row ID"}), 400

        column_id_str, row_id_str = colrow.split('+', 1)
        try:
            column_id = int(column_id_str)
            row_id = int(row_id_str)
        except ValueError:
            return jsonify({"error": "Invalid column_id or row_id format 無效的行列格式"}), 400

        # 查詢 NDVITemp 資料，按照植被覆蓋率的差異排序
        # 先找完全匹配的資料
        record = NDVITemp.query.filter_by(
            Month=month,
            column_id=column_id,
            row_id=row_id,
            Vegetation_Coverage=vegetation_coverage
        ).first()
        
        if not record:
            # 如果沒有完全匹配的，找最接近的植被覆蓋率
            record = NDVITemp.query.filter_by(
                Month=month,
                column_id=column_id,
                row_id=row_id
            ).order_by(
                func.abs(NDVITemp.Vegetation_Coverage - vegetation_coverage)
            ).first()
        
        if not record:
            return jsonify({
                "error": "Data not found 查無資料"
            }), 404

        # 建立結構化的 payload
        # 先獲取 index_ref 的資訊
        coordinates = {}
        try:
            if getattr(record, "index_ref", None):
                coordinates = {
                    "latitude": record.index_ref.new_LAT,
                    "longitude": record.index_ref.new_LON,
                    "elevation": record.index_ref.Elevation
                }
            else:
                # 後備方案：以 col/row 明確查一次
                idx = IndexTable.query.filter_by(column_id=record.column_id, row_id=record.row_id).first()
                if idx:
                    coordinates = {
                        "latitude": idx.new_LAT,
                        "longitude": idx.new_LON,
                        "elevation": idx.Elevation
                    }
        except Exception:
            pass

        payload = {
            "apparent_temperatures": {
                "current": getattr(record, "Apparent_Temperature"),
                "high": getattr(record, "Apparent_Temperature_High"),
                "low": getattr(record, "Apparent_Temperature_Low")
            },
            "predicted_temperatures": {
                "current": getattr(record, "Temperature_Predicted"),
                "high": getattr(record, "High_Temp_Predicted"),
                "low": getattr(record, "Low_Temp_Predicted")
            },
            "weather_conditions": {
                "humidity": getattr(record, "Humidity"),
                "pressure": getattr(record, "Pressure"),
                "rain": getattr(record, "Rain"),
                "solar": getattr(record, "Solar"),
                "wind": getattr(record, "Wind")
            },
            "location": {
                "column_id": getattr(record, "column_id"),
                "row_id": getattr(record, "row_id"),
                **coordinates
            },
            "metadata": {
                "id": getattr(record, "id"),
                "month": getattr(record, "Month"),
                "vegetation": round(float(getattr(record, "Vegetation_Coverage")), 1) if getattr(record, "Vegetation_Coverage") is not None else None,
                "water_body": getattr(record, "Water_Body_Coverage")
            }
        }

        return jsonify(payload)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/annual/<string:weather_conditions>/<int:year>/<string:colrow>', methods=['GET'])
def get_yearly_weather_data(weather_conditions, year, colrow):
    try:
        # 檢查天氣條件是否有效
        valid_conditions = ["humidity", "pressure", "rain", "solar", "wind"]
        if weather_conditions not in valid_conditions:
            return jsonify({"error": f"Invalid weather condition. Must be one of: {', '.join(valid_conditions)}"}), 400

        # 檢查 column_id+row_id 格式
        if '+' not in colrow:
            return jsonify({"error": "Invalid format, expected column_id+row_id 無效格式，請輸入column ID+row ID"}), 400

        column_id_str, row_id_str = colrow.split('+', 1)
        try:
            column_id = int(column_id_str)
            row_id = int(row_id_str)
        except ValueError:
            return jsonify({"error": "Invalid column_id or row_id format 無效的行列格式"}), 400

        # 查詢指定年份的所有月份數據
        records = HistoryData.query.filter_by(
            Year=year,
            column_id=column_id,
            row_id=row_id
        ).order_by(HistoryData.Month).all()

        if not records:
            return jsonify({"error": "Data not found 查無資料"}), 404

        # 建立回應數據
        result = {}
        for record in records:
            # 將每個月的指定氣象條件數據加入結果中
            result[str(record.Month)] = getattr(record, weather_conditions.capitalize())

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/annual/temp/<int:year>/<string:colrow>', methods=['GET'])
def get_yearly_temperature_data(year, colrow):
    try:
        # 檢查 column_id+row_id 格式
        if '+' not in colrow:
            return jsonify({"error": "Invalid format, expected column_id+row_id 無效格式，請輸入column ID+row ID"}), 400

        column_id_str, row_id_str = colrow.split('+', 1)
        try:
            column_id = int(column_id_str)
            row_id = int(row_id_str)
        except ValueError:
            return jsonify({"error": "Invalid column_id or row_id format 無效的行列格式"}), 400

        # 查詢指定年份的所有月份數據
        records = HistoryData.query.filter_by(
            Year=year,
            column_id=column_id,
            row_id=row_id
        ).order_by(HistoryData.Month).all()

        if not records:
            return jsonify({"error": "Data not found 查無資料"}), 404

        # 建立回應數據
        result = {
            "Apparent_Temperature": {},
            "Apparent_Temperature_High": {},
            "Apparent_Temperature_Low": {},
            "Temperature": {},
            "High_Temp": {},
            "Low_Temp": {}
        }

        # 對每個月的數據進行處理
        for record in records:
            month_str = str(record.Month)
            # 體感溫度數據
            result["Apparent_Temperature"][month_str] = record.Apparent_Temperature
            result["Apparent_Temperature_High"][month_str] = record.Apparent_Temperature_High
            result["Apparent_Temperature_Low"][month_str] = record.Apparent_Temperature_Low
            # 實際溫度數據
            result["Temperature"][month_str] = record.Temperature
            result["High_Temp"][month_str] = record.High_Temp
            result["Low_Temp"][month_str] = record.Low_Temp

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/formap/<string:type>/<int:year>/<int:month>', methods=['GET'])
def get_temperature_map(type, year, month):
    try:
        # 檢查溫度類型是否有效
        valid_types = [
            "Temperature",
            "Low_Temp",
            "High_Temp",
            "Apparent_Temperature",
            "Apparent_Temperature_High",
            "Apparent_Temperature_Low"
        ]
        if type not in valid_types:
            return jsonify({
                "error": f"Invalid temperature type. Must be one of: {', '.join(valid_types)}"
            }), 400

        # 查詢指定年月的所有網格數據
        records = HistoryData.query.filter_by(
            Year=year,
            Month=month
        ).order_by(HistoryData.column_id, HistoryData.row_id).all()

        if not records:
            return jsonify({"error": "Data not found 查無資料"}), 404

        # 建立回應數據
        result = {}
        for record in records:
            col_key = str(record.column_id)
            if col_key not in result:
                result[col_key] = {}
            # 使用動態的溫度類型
            result[col_key][str(record.row_id)] = getattr(record, type)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/data/<int:year>/<int:month>/<string:colrow>', methods=['GET'])
def get_data(year, month, colrow):
    try:
        # 固定使用 HistoryData
        model = HistoryData
        year_field = "Year"
        month_field = "Month"

        # 檢查 column_id+row_id 格式
        if '+' not in colrow:
            return jsonify({"error": "Invalid format, expected column_id+row_id 無效格式，請輸入column ID+row ID"}), 400

        column_id_str, row_id_str = colrow.split('+', 1)
        column_id = int(column_id_str)
        row_id = int(row_id_str)

        # 查詢資料
        filter_args = {
            year_field: year,
            month_field: month,
            "column_id": column_id,
            "row_id": row_id
        }
        record = model.query.filter_by(**filter_args).first()

        if not record:
            return jsonify({"error": "Data not found 查無資料"}), 404

        # 先獲取 index_ref 的資訊
        coordinates = {}
        try:
            if getattr(record, "index_ref", None):
                coordinates = {
                    "latitude": record.index_ref.new_LAT,
                    "longitude": record.index_ref.new_LON,
                    "elevation": record.index_ref.Elevation
                }
            else:
                # 後備方案：以 col/row 明確查一次
                idx = IndexTable.query.filter_by(column_id=record.column_id, row_id=record.row_id).first()
                if idx:
                    coordinates = {
                        "latitude": idx.new_LAT,
                        "longitude": idx.new_LON,
                        "elevation": idx.Elevation
                    }
        except Exception:
            pass

        # 建立結構化的 payload
        payload = {
            "apparent_temperatures": {
                "current": getattr(record, "Apparent_Temperature"),
                "high": getattr(record, "Apparent_Temperature_High"),
                "low": getattr(record, "Apparent_Temperature_Low")
            },
            "temperatures": {
                "current": getattr(record, "Temperature"),
                "high": getattr(record, "High_Temp"),
                "low": getattr(record, "Low_Temp")
            },
            "weather_conditions": {
                "humidity": getattr(record, "Humidity"),
                "pressure": getattr(record, "Pressure"),
                "rain": getattr(record, "Rain"),
                "solar": getattr(record, "Solar"),
                "wind": getattr(record, "Wind")
            },
            "location": {
                "column_id": getattr(record, "column_id"),
                "row_id": getattr(record, "row_id"),
                **coordinates
            },
            "metadata": {
                "id": getattr(record, "id"),
                "year": getattr(record, "Year"),
                "month": getattr(record, "Month"),
                "vegetation": getattr(record, "Vegetation_Coverage"),
                "water_body": getattr(record, "Water_Body_Coverage")
            }
        }

        return jsonify(payload)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


