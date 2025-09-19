"""
綠化面積計算工具
- 提供坪與平方公尺換算
- 提供以建案公設面積與綠覆率計算目標綠化面積
"""

from typing import Optional, Tuple, Dict

from app import db
from app.models import NDVITemp, HistoryData

PING_TO_M2 = 3.30578


def ping_to_m2(ping: Optional[float]) -> Optional[float]:
    """坪轉平方公尺，1 坪 = 3.30578 m^2。回傳四捨五入至小數點後 2 位。"""
    if ping is None:
        return None
    return round(ping * PING_TO_M2, 2)


def normalize_rate(rate: Optional[float]) -> Optional[float]:
    """
    將綠覆率正規化為 0~1：
    - None -> None
    - >1 視為百分比，如 20 -> 0.2
    - 介於 0~1 之間視為比例
    """
    if rate is None:
        return None
    if rate > 1:
        return rate / 100.0
    return rate


def compute_greening_area(
    building_area_ping: float = 1000.0,
    coverage_rate: Optional[float] = None,
) -> Tuple[Optional[float], Optional[float]]:
    """
    公式：建案公設面積(坪) × 目標綠覆率(%) = 目標綠化面積(坪)
    - coverage_rate 可為 20 或 0.2
    - 回傳 (目標綠化面積_坪, 目標綠化面積_平方公尺)
    """
    rate = normalize_rate(coverage_rate)
    if rate is None:
        return None, None
    target_ping = round(building_area_ping * rate, 2)
    return target_ping, ping_to_m2(target_ping)


def set_row_greening_area(
    row: NDVITemp,
    building_area_ping: float = 1000.0,
    coverage_rate: Optional[float] = None,
) -> None:
    """以 row 的 Vegetation_Coverage（或覆寫 coverage_rate）計算並寫回欄位（不自動 commit）。"""
    rate = row.Vegetation_Coverage if coverage_rate is None else coverage_rate
    target_ping, target_m2 = compute_greening_area(building_area_ping, rate)
    row.Greening_Area_Ping = target_ping
    row.Greening_Area_m2 = target_m2


def set_history_row_greening_area(
    row: HistoryData,
    building_area_ping: float = 1000.0,
    coverage_rate: Optional[float] = None,
) -> None:
    """以 HistoryData 的 Vegetation_Coverage（或覆寫 coverage_rate）計算並寫回欄位（不自動 commit）。"""
    rate = row.Vegetation_Coverage if coverage_rate is None else coverage_rate
    target_ping, target_m2 = compute_greening_area(building_area_ping, rate)
    row.Greening_Area_Ping = target_ping
    row.Greening_Area_m2 = target_m2


def bulk_compute_and_save(
    building_area_ping: float = 1000.0,
    coverage_rate: Optional[float] = None,
    commit: bool = True,
    filter_by: Optional[Dict] = None,
    only_missing: bool = False,
    batch_size: int = 1000,
) -> int:
    """
    批次計算並寫回 `NDVI_Temp` 的綠化面積。
    - 若 coverage_rate 為 None，使用各 row 的 Vegetation_Coverage。
    - 可用 filter_by 篩選，only_missing 僅更新尚未有結果的紀錄。
    - 預設最後會 commit。
    回傳處理筆數。
    """
    query = NDVITemp.query
    if filter_by:
        query = query.filter_by(**filter_by)
    if only_missing:
        query = query.filter((NDVITemp.Greening_Area_Ping.is_(None)) | (NDVITemp.Greening_Area_m2.is_(None)))

    processed = 0
    for row in query.yield_per(batch_size):
        set_row_greening_area(row, building_area_ping, coverage_rate)
        processed += 1

    if commit:
        db.session.commit()

    return processed


def bulk_compute_and_save_history(
    building_area_ping: float = 1000.0,
    coverage_rate: Optional[float] = None,
    commit: bool = True,
    filter_by: Optional[Dict] = None,
    only_missing: bool = False,
    batch_size: int = 1000,
) -> int:
    """
    批次計算並寫回 `history_data` 的綠化面積。
    - 若 coverage_rate 為 None，使用各 row 的 Vegetation_Coverage。
    - 可用 filter_by 篩選，only_missing 僅更新尚未有結果的記錄。
    - 預設最後會 commit。
    回傳處理筆數。
    """
    query = HistoryData.query
    if filter_by:
        query = query.filter_by(**filter_by)
    if only_missing:
        query = query.filter((HistoryData.Greening_Area_Ping.is_(None)) | (HistoryData.Greening_Area_m2.is_(None)))

    processed = 0
    for row in query.yield_per(batch_size):
        set_history_row_greening_area(row, building_area_ping, coverage_rate)
        processed += 1

    if commit:
        db.session.commit()

    return processed
