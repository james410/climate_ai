'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import type { Feature, FeatureCollection, GeoJsonProperties, Polygon, MultiPolygon } from 'geojson';
import MapGridVisualization from '../../components/MapGridVisualization';

// === 批次地圖資料（時間模式）=== 
type CellKey = string;
const makeCellKey = (r: number, c: number) => `${r}-${c}`;

// 以 (history|prediction):(year):(month) 當快取 key
// 用 ref 是為了避免重新 render 造成 Map 重置
const timeGridCacheRef = { current: new Map<string, Map<CellKey, number>>() };
// 中央化管理未來可替換的端點路徑 —— 只改這裡就能換路徑
const VEG_FORMAP_URL = (base: string, month: number, veg01: number) =>
  `${base}/formap/NDVI/Temperature_Predicted/${veg01.toFixed(2)}/${String(month).padStart(2, '0')}`;

// 植被的批次結果快取：(month, veg01) → Map<"row-col", value>
const vegGridCacheRef = { current: new Map<string, Map<CellKey, number>>() };

/* =================== 工具 & 型別 =================== */

type GridFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties & Record<string, unknown>>;
type ColorMode = 'temperature' | 'type';

const TYPE_COLORS: Record<string, string> = {
  mountain: '#22c55e',
  coast: '#3b82f6',
  city: '#ef4444',
  suburb: '#eab308',
  default: '#9ca3af',
};
const normalizeType = (s: string) => s?.trim().toLowerCase();
const getColorForType = (t?: string) => TYPE_COLORS[normalizeType(t || '')] ?? TYPE_COLORS.default;

const HOVER_YELLOW = '#FFD54A';
const DEFAULT_STROKE = '#c9c9c9ff';
const pad2 = (n: number) => String(n).padStart(2, '0');

class NoDataError extends Error {
  constructor(msg = '查無資料') {
    super(msg);
    this.name = 'NoDataError';
  }
}

async function fetchJSON<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...init });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 404) {
      try {
        const j = JSON.parse(text);
        throw new NoDataError(j?.error || '查無資料');
      } catch {
        throw new NoDataError('查無資料');
      }
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON from server');
  }
}

async function fetchVegFormapBatch(month: number, vegPercent: number) {
  // 若你的 UI "veg" 是 0~100，保留這行；若已是 0~1，改成 const veg01 = vegPercent;
  const veg01 = Math.max(0, Math.min(1, (typeof (vegPercent as any) === 'number' ? vegPercent : 0) / 100));

  // 建議把 key 也改成 <veg01>:<MM>（與路徑一致，方便 debug）
  const cacheKey = `${veg01.toFixed(2)}:${String(month).padStart(2, '0')}`;
  const cached = vegGridCacheRef.current.get(cacheKey);
  if (cached) return cached;

  const base = getBases()[0];
  const url = VEG_FORMAP_URL(base, month, veg01); // ← 這裡自動套新路徑
  const payload = await fetchJSON<Record<string, Record<string, number | null>>>(url);

  const map = new Map<string, number>();
  for (const cStr in payload) {
    const rows = payload[cStr] || {};
    for (const rStr in rows) {
      const v = rows[rStr];
      const r = Number(rStr), c = Number(cStr);
      if (Number.isFinite(r) && Number.isFinite(c) && typeof v === 'number') {
        map.set(makeCellKey(r, c), v);
      }
    }
  }
  vegGridCacheRef.current.set(cacheKey, map);
  return map;
}



const USE_PROXY = process.env.NEXT_PUBLIC_USE_PROXY === '1';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5000';
const getBases = () => (USE_PROXY ? ['/api'] : [API_BASE]);
const to01 = (percent: number) => Math.max(0, Math.min(100, percent)) / 100;

function getFeatureId(f: GridFeature) {
  const p = (f?.properties || {}) as any;
  return p.id ?? `${p.row_id ?? 'r'}-${p.column_id ?? 'c'}`;
}

function getMonthTemp(feature: GridFeature | null, m: number): number | undefined {
  if (!feature) return undefined;
  const p = feature.properties || {};
  const key = `temp_${m}`;
  const direct = (p as any)[key];
  if (typeof direct === 'number') return direct;
  const temps = (p as any).temps;
  if (temps && typeof (temps as any)[m] === 'number') return (temps as any)[m];
  return undefined;
}

function computeMinMax(features: GridFeature[], m: number) {
  let min = Infinity, max = -Infinity;
  for (const f of features) {
    const v = getMonthTemp(f, m);
    if (typeof v === 'number') {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 0.5, max: max + 0.5 };
  return { min, max };
}

function toPercent(v: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}

function colorByPercent(p: number) {
  if (p < 25) return '#ddab17';
  if (p < 50) return '#eb7846';
  if (p < 75) return '#cd3e5d';
  return '#9f2f7c';
}

// 後端回傳
type ClimatePayload = {
  metadata?: { year?: number; month?: number; vegetation?: number };
  location?: { column_id?: number; row_id?: number; latitude?: number; longitude?: number };
  temperatures?: { current?: number; high?: number; low?: number };
  apparent_temperatures?: { current?: number; high?: number; low?: number };
  predicted_temperatures?: { current?: number; high?: number; low?: number };
} | Record<string, any>;

/* =================== 主頁面 =================== */
export default function MapSection() {
  /* --- 一律放在元件內，避免未定義就用到 --- */
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMounted(true); }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const titleOpacity = useTransform(
    scrollYProgress,
    [0.1, 0.3, 0.4, 0.6, 0.9, 1],
    [0, 1, 1, 0.8, 0.8, 0]
  );

  const titleScale = useTransform(
    scrollYProgress,
    [0.1, 0.3, 0.4, 0.6],
    [0.8, 1, 0.9, 0.9]
  );

  const descriptionOpacity = useTransform(
    scrollYProgress,
    [0.1, 0.3, 0.4, 0.5],
    [0, 1, 1, 0]
  );

  // UI 狀態
  const [mode, setMode] = useState<'population' | 'time'>('time');
  const [veg, setVeg] = useState<number>(50);
  const [month, setMonth] = useState<number>(10);
  const [pastYear, setPastYear] = useState<number>(2013);
  const [futureYear, setFutureYear] = useState<number>(2025);
  const [activeSlider, setActiveSlider] = useState<'past' | 'future'>('past');

  // 進階著色切換 & 模式
  const [enableAdvancedColor, setEnableAdvancedColor] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('type');
  const colorModeRef = useRef<ColorMode>(colorMode);
  useEffect(() => { colorModeRef.current = colorMode; applyLayerColorsRef.current(); }, [colorMode]);

  // CSV 類型表 (row-col -> type)
  const typeByCellRef = useRef<Map<string, string>>(new Map());

  // 簡化的狀態管理
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);

  // 選格子/側欄
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<GridFeature | null>(null);
  const [rowId, setRowId] = useState<number | null>(null);
  const [colId, setColId] = useState<number | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  // 拖拽功能狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 容器引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const terrainImageRef = useRef<HTMLImageElement>(null);

  // API 狀態
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<ClimatePayload | null>(null);
  const [triedUrls, setTriedUrls] = useState<string[]>([]);

  // 著色重繪的 ref
  const geoJsonDataRef = useRef<FeatureCollection | null>(null);
  const monthRef = useRef(month);
  const selectedIdRef = useRef<string | null>(null);
  const applyLayerColorsRef = useRef<() => void>(() => { });

  useEffect(() => { geoJsonDataRef.current = geoJsonData; }, [geoJsonData]);
  useEffect(() => { monthRef.current = month; applyLayerColorsRef.current(); }, [month]);
  useEffect(() => { selectedIdRef.current = selectedCellId; applyLayerColorsRef.current(); }, [selectedCellId]);
  useEffect(() => { applyLayerColorsRef.current(); }, [enableAdvancedColor]);

  // 儲存「時間模式」當前批次資料（row-col -> value）
  const timeGridRef = useRef<Map<CellKey, number> | null>(null);

  // 植被模式下，目前月+植被率的全圖資料
  const vegGridRef = useRef<Map<CellKey, number> | null>(null);


  // 讀取 mode 的最新值用（避免閉包過期）
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* --- CSV 載入（和狀態都在元件內） --- */
  useEffect(() => {
    let aborted = false;
    fetch('/data/area_types.csv')
      .then(r => r.text())
      .then(text => {
        if (aborted) return;
        const rows = parseAreaTypesCSV(text);
        const m = new Map<string, string>();
        for (const r of rows) m.set(`${r.row_id}-${r.column_id}`, r.type);
        typeByCellRef.current = m;
        if (enableAdvancedColor) applyLayerColorsRef.current();
      })
      .catch(() => { });
    return () => { aborted = true; };
  }, [enableAdvancedColor]);

  function parseAreaTypesCSV(text: string): Array<{ row_id: number; column_id: number; type: string }> {
    // 保守解析，避免 CSV 欄位缺失造成 runtime error
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idxRow = header.indexOf('row_id');
    const idxCol = header.indexOf('column_id');
    let idxType = header.indexOf('type');
    if (idxType === -1) idxType = header.indexOf('類型');

    // 若必要欄位沒找到，直接回空陣列（不丟錯）
    if (idxRow === -1 || idxCol === -1 || idxType === -1) return [];

    const out: Array<{ row_id: number; column_id: number; type: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = row.split(',');
      if (cols.length <= Math.max(idxRow, idxCol, idxType)) continue;

      const r = Number(cols[idxRow]);
      const c = Number(cols[idxCol]);
      const t = (cols[idxType] ?? '').trim();
      if (Number.isFinite(r) && Number.isFinite(c) && t) out.push({ row_id: r, column_id: c, type: t });
    }
    return out;
  }

  function getTypeForFeature(f: any): string | undefined {
    const p = (f?.properties || {}) as any;
    return typeByCellRef.current.get(`${Number(p.row_id)}-${Number(p.column_id)}`);
  }

  /* --- 簡化的透明層設定 --- */
  useEffect(() => {
    applyLayerColorsRef.current = () => {
      // 簡化的著色函數，不依賴 Leaflet
      console.log('透明層設定完成');
    };
  }, [enableAdvancedColor]);
  useEffect(() => {
    // 只有「時間模式」才抓批次
    if (mode !== 'time') {
      timeGridRef.current = null;
      applyLayerColorsRef.current();
      return;
    }

    let aborted = false;
    const y = activeSlider === 'past' ? pastYear : futureYear;
    const which: 'history' | 'prediction' = activeSlider === 'past' ? 'history' : 'prediction';

    (async () => {
      try {
        const map = await fetchTimeGridBatch(y, month, which);
        if (aborted) return;
        timeGridRef.current = map;          // 設定本月索引
        applyLayerColorsRef.current();      // 拿到資料後重繪
      } catch (e) {
        if (aborted) return;
        // 失敗時清空，走舊的 GeoJSON 欄位當後備
        timeGridRef.current = null;
        applyLayerColorsRef.current();
      }
    })();

    return () => { aborted = true; };
  }, [mode, activeSlider, pastYear, futureYear, month]);

  // —— 批次：植被模式 for-map
  // 需求：在植被模式中「點擊格子後」就不要再打 for-map 端點，只專注單格溫度
  useEffect(() => {
    if (mode !== 'population') {
      vegGridRef.current = null;            // 切離開植被模式就清空
      return;
    }
    // 一旦選中格子（sidebar 開啟中），就停止呼叫 for-map 批次端點
    if (selectedCellId) {
      vegGridRef.current = null;            // 清掉 for-map 暫存，著色回退到 GeoJSON 的後備值
      applyLayerColorsRef.current?.();      // 重繪一次以反映狀態
      return;
    }
    let aborted = false;
    (async () => {
      try {
        const map = await fetchVegFormapBatch(month, veg); // veg 若本來是 0~1，請把第二參數改成 veg*100
        if (aborted) return;
        vegGridRef.current = map;
        applyLayerColorsRef.current();      // 拿到資料後重畫一次
      } catch (e) {
        if (aborted) return;
        vegGridRef.current = null;          // 失敗就回退舊邏輯
        applyLayerColorsRef.current();
      }
    })();
    return () => { aborted = true; };
  }, [mode, month, veg, selectedCellId]);


  /* --- 載入地理資料 --- */
  useEffect(() => {
    fetch('/data/grid.geojson')
      .then(r => r.json())
      .then((geojson: FeatureCollection) => {
        setGeoJsonData(geojson);
      })
      .catch(console.error);
  }, []);


  async function fetchTimeGridBatch(y: number, m: number, which: 'history' | 'prediction') {
    const cacheKey = `${which}:${y}:${m}`;
    const cached = timeGridCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const base = getBases()[0];
    const url = `${base}/formap/Temperature/${y}/${pad2(m)}`;
    // 後端回傳格式：{ [column_id]: { [row_id]: value } }
    const payload = await fetchJSON<Record<string, Record<string, number | null>>>(url);

    const map = new Map<CellKey, number>();
    for (const cStr in payload) {
      const rows = payload[cStr] || {};
      for (const rStr in rows) {
        const v = rows[rStr];
        const r = Number(rStr), c = Number(cStr);
        if (Number.isFinite(r) && Number.isFinite(c) && typeof v === 'number') {
          map.set(makeCellKey(r, c), v);
        }
      }
    }
    timeGridCacheRef.current.set(cacheKey, map);
    return map;
  }

  /* --- API URL 候選組合 --- */
  function buildApiCandidates(): string[] {
    if (rowId == null || colId == null) return [];
    const mPadded = pad2(month), mRaw = String(month);
    const combos = [{ c: colId, r: rowId }, { c: rowId, r: colId }];

    const urls: string[] = [];
    for (const base of getBases()) {
      if (mode === 'time') {
        const y = activeSlider === 'past' ? pastYear : futureYear;
        const prefix = activeSlider === 'past' ? 'history' : 'prediction';
        for (const { c, r } of combos) {
          urls.push(`${base}/data/${y}/${mPadded}/${c}+${r}`);
          urls.push(`${base}/data/${y}/${mPadded}/${c}%2B${r}`);
          urls.push(`${base}/data/${y}/${mRaw}/${c}+${r}`);
          urls.push(`${base}/data/${y}/${mRaw}/${c}%2B${r}`);
          urls.push(`${base}/data/${prefix}/${y}/${mPadded}/${c}/${r}`);
          urls.push(`${base}/data/${prefix}/${y}/${mRaw}/${c}/${r}`);
        }
      } else {
        const v01 = to01(veg).toFixed(2);
        for (const { c, r } of combos) {
          // 固定月份 → 取 0~100% 覆蓋率整包（滑桿查表用）
          urls.push(`${base}/NDVIbycoverage/${mPadded}/${c}+${r}`);
          urls.push(`${base}/NDVIbycoverage/${mPadded}/${c}%2B${r}`);
          urls.push(`${base}/NDVIbycoverage/${mRaw}/${c}+${r}`);
          urls.push(`${base}/NDVIbycoverage/${mRaw}/${c}%2B${r}`);
          // 固定覆蓋率 → 取 1~12 月整包（切月查表用）
          urls.push(`${base}/NDVIbymonth/${v01}/${c}+${r}`);
          urls.push(`${base}/NDVIbymonth/${v01}/${c}%2B${r}`);
        }
      }
    }
    return Array.from(new Set(urls));
  }

  /* --- API 請求 --- */
  useEffect(() => {
    const candidates = buildApiCandidates();
    if (!candidates.length) {
      setApiData(null);
      setApiError(null);
      setTriedUrls([]);
      return;
    }

    let aborted = false;
    const controller = new AbortController();
    setApiLoading(true);
    setApiError(null);
    setTriedUrls(candidates);

    (async () => {
      let lastErr: any = null;
      for (const url of candidates) {
        try {
          const raw = await fetchJSON<any>(url, { signal: controller.signal });
          let data: ClimatePayload = raw;
          // --- 新增：把「整包」轉成單點，沿用既有 UI 呈現 ---
          if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const keys = Object.keys(raw);
            // A) /NDVIbycoverage：鍵像 "0.0".."1.0"
            if (keys.every(k => /^\d(\.\d)?$/.test(k))) {
              const vKey = (to01(veg)).toFixed(1); // 0.0~1.0
              const hit = raw[vKey];
              if (hit && typeof hit === 'object') {
                data = {
                  metadata: { month, vegetation: Number(vKey) },
                  predicted_temperatures: {
                    current: hit.Temperature, high: hit.High_Temp, low: hit.Low_Temp
                  }
                };
              }
            }
            // B) /NDVIbymonth：鍵像 "1".."12"
            else if (keys.every(k => /^\d+$/.test(k))) {
              const mKey = String(month);
              const hit = raw[mKey];
              if (hit && typeof hit === 'object') {
                data = {
                  metadata: { month, vegetation: to01(veg) },
                  predicted_temperatures: {
                    current: hit.Temperature, high: hit.High_Temp, low: hit.Low_Temp
                  }
                };
              }
            }
          }
          if (!aborted) { setApiData(data); setApiError(null); }
          return;
        } catch (e: any) {
          // 被中止的請求：直接結束，不更新任何狀態
          if (controller.signal.aborted) return;
          lastErr = e;
          if (!(e instanceof NoDataError) && !String(e.message || '').includes('HTTP 404')) break;
        }
      }
      if (!aborted) {
        if (lastErr instanceof NoDataError || String(lastErr?.message || '').includes('HTTP 404')) {
          setApiData(null); setApiError('查無資料');
        } else {
          setApiData(null); setApiError(lastErr?.message || '讀取失敗');
        }
      }
    })().finally(() => { if (!aborted && !controller.signal.aborted) setApiLoading(false); });

    return () => {
      aborted = true;
      controller.abort(); // 取消上一輪尚未完成的請求
    };
  }, [mode, activeSlider, pastYear, futureYear, month, veg, rowId, colId]);

  // 修正：取得完整的溫度資料 (current, high, low)
  const flaskTemps = useMemo(() => {
    const temps = apiData?.predicted_temperatures ?? apiData?.temperatures ?? apiData?.apparent_temperatures;
    return {
      current: temps?.current,
      high: temps?.high,
      low: temps?.low
    };
  }, [apiData]);

  /* =================== UI =================== */

  // 拖拽功能實現
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // 只處理左鍵
      setIsDragging(true);
      setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setDragOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setCurrentFeature(null);
    setSelectedCellId(null);
  };

  const isInView = useInView(sectionRef, { once: false });

  return (
    <section
      id="map-section"
      ref={sectionRef}
      className="relative w-full h-screen bg-black"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      {/* 標題層 - 全螢幕地圖上的浮動標題 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-6 py-3">
        <h2 className="font-mono text-4xl tracking-wider text-center leading-loose">
          Heat Island Model
        </h2>
      </div>

      {/* 左側控制面板 - 移到最上層確保清晰可見 */}
      <div className="absolute top-16 left-4 z-50 bg-black/80 backdrop-blur-md p-4 max-md:top-20 max-md:left-2 max-md:p-3 border border-cyan-400/30 shadow-lg shadow-cyan-400/20">
        <div className="flex flex-col items-center gap-4 text-content01">
          {/* 第一個模式 */}
          <button
            onClick={() => setMode('time')}
            className={`px-6 py-3 font-semibold transition-all text-content01 max-md:px-4 max-md:py-2 max-md:text-xs ${mode === 'time'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            歷史與未來<br />溫度變化
          </button>

          {/* 分隔線 */}
          <div className="w-8 h-px bg-gray-600"></div>

          {/* 第二個模式 */}
          <button
            onClick={() => setMode('population')}
            className={`px-6 py-3 font-semibold transition-all text-content01 max-md:px-4 max-md:py-2 max-md:text-xs ${mode === 'population'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            植被覆蓋率<br />影響模擬
          </button>
        </div>
      </div>
      {/* 左邊中間資訊面板 - 移到最上層確保清晰可見 */}
      <div className="absolute top-1/2 left-4 z-50 bg-black/80 backdrop-blur-md p-3 space-y-2 border border-cyan-400/30 shadow-lg shadow-cyan-400/20" style={{ transform: 'translateY(-50%)' }}>
        {/* 當前時間顯示 */}
        <div className="text-white border-b border-gray-600/50 pb-2">
          <div className="flex items-center gap-3 text-content01">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">當前時間</span>
              <div className="font-bold text-sm">
                {mode === 'time' ? (activeSlider === 'past' ? `${pastYear}` : `${futureYear}`) : '2022'} 年 {month} 月
              </div>
            </div>
            <div className="border-l border-gray-600/50 pl-2">
              <span className="text-gray-400 text-xs">
                {mode === 'time' ? (activeSlider === 'past' ? '歷史資料' : '未來預測') : '植被分析'}
              </span>
            </div>
          </div>
        </div>

        {/* 圖例區域 */}
        <div className="space-y-2">
          {/* 溫度圖例 */}
          {!enableAdvancedColor || colorMode === 'temperature' ? (
            <div className="text-white">
              <div className="text-content01 font-bold mb-1">溫度圖例 ({month}月)</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-temp-low"></div>
                  <span className="text-xs">低溫</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-temp-medium"></div>
                  <span className="text-xs">中低溫</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-temp-high"></div>
                  <span className="text-xs">中高溫</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-temp-extreme"></div>
                  <span className="text-xs">高溫</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* 類型圖例 */}
          {enableAdvancedColor && colorMode === 'type' && (
            <div className="text-white">
              <div className="text-content01 font-bold mb-1">區域類型</div>
              <div className="flex gap-2 flex-wrap text-xs">
                {(['mountain', 'coast', 'city', 'suburb'] as const).map(key => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded" style={{ background: TYPE_COLORS[key] }} />
                    <span className="capitalize text-xs">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 統一圖層容器 - 全螢幕，可拖拽，所有圖層同步移動 */}
      <div
        ref={mapContainerRef}
        className="w-full h-full relative"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* 背景地形圖層 - 確保完整顯示 */}
        <img
          ref={terrainImageRef}
          src="/images/Taipei_New_Taipei_Transparent.png"
          alt="Taipei Terrain Map"
          className="absolute w-full h-full"
          style={{
            zIndex: 1,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        />

        {/* P5.js 格子視覺化層 - 與地形圖完全同步 */}
        {geoJsonData && (
          <MapGridVisualization
            geoJsonData={geoJsonData}
            colorMode={colorMode}
            month={month}
            selectedCellId={selectedCellId}
            typeByCell={typeByCellRef.current}
            temperatureData={mode === 'time' ? timeGridRef.current : vegGridRef.current}
            map={undefined}
            dragOffset={dragOffset} // 傳遞拖拽偏移確保同步
          />
        )}

        {/* 透明互動層 - 處理格點點擊，與其他圖層完全同步 */}
        {geoJsonData && (
          <div
            className="absolute"
            style={{
              zIndex: 30,
              pointerEvents: 'all',
              cursor: 'pointer',
              // 確保互動層與其他圖層邊界完全一致
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%'
            }}
            onClick={(e) => {
              // 計算點擊位置（考慮拖拽偏移）
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left + Math.abs(dragOffset.x);
              const clickY = e.clientY - rect.top + Math.abs(dragOffset.y);

              // 轉換為地理座標（使用與其他圖層相同的轉換邏輯）
              const TPE_BOUNDS = {
                north: 25.299380,
                south: 24.666190,
                east: 122.015500,
                west: 121.297390,
              };

              const relativeX = clickX / rect.width;
              const relativeY = clickY / rect.height;

              const lng = TPE_BOUNDS.west + relativeX * (TPE_BOUNDS.east - TPE_BOUNDS.west);
              const lat = TPE_BOUNDS.north - relativeY * (TPE_BOUNDS.north - TPE_BOUNDS.south);

              // 找到點擊位置對應的格點
              const features = geoJsonData.features as GridFeature[];
              let clickedFeature: GridFeature | null = null;

              for (const feature of features) {
                const geometry = feature.geometry;
                if (geometry.type === 'Polygon') {
                  const coordinates = geometry.coordinates[0];
                  let isInside = false;

                  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
                    const [xi, yi] = coordinates[i];
                    const [xj, yj] = coordinates[j];

                    if (((yi > lat) !== (yj > lat)) &&
                        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
                      isInside = !isInside;
                    }
                  }

                  if (isInside) {
                    clickedFeature = feature;
                    break;
                  }
                }
              }

              // 如果找到格點，觸發點擊事件
              if (clickedFeature) {
                const p = (clickedFeature.properties || {}) as any;
                setRowId(Number(p.row_id ?? null));
                setColId(Number(p.column_id ?? null));
                const id = getFeatureId(clickedFeature);
                setSelectedCellId(id);
                setCurrentFeature(clickedFeature);
                setSidebarOpen(true);
              }
            }}
          />
        )}

        {/* 拖拽指示器 - 顯示當前拖拽狀態 */}
        {isDragging && (
          <div
            className="absolute top-2 left-2 bg-black/60 text-cyan-400 text-xs px-2 py-1 rounded"
            style={{ zIndex: 50 }}
          >
            拖拽中: ({Math.round(dragOffset.x)}, {Math.round(dragOffset.y)})
          </div>
        )}
      </div>

      {/* 控制面板 - 移到最上層確保清晰可見 */}
      <div className="absolute top-1/2 left-4 z-50 bg-black/80 backdrop-blur-md p-4 text-content01 border border-cyan-400/30 shadow-lg shadow-cyan-400/20" style={{ transform: 'translateY(-50%)', width: '320px', minWidth: '320px' }}>
        {mode === 'population' ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-content01 text-gray-100 font-bold">植被覆蓋率</div>
              <div className="flex items-center gap-4">
                <input type="range" min={0} max={100} step={10} value={veg}
                  onChange={(e) => setVeg(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #ffffff 0%, #A9E981 ${veg}%, #374151 ${veg}%, #374151 100%)` }} />
                <span className="text-content01 font-bold text-white min-w-[3rem]">{veg}%</span>
              </div>
            </div>

            <div className="w-full h-px bg-gray-600/70" />

            <div className="space-y-3">
              <div className="text-content01 text-gray-100 font-bold">月份</div>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={12} step={1} value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #ffffff 0%, #f59e0b ${((month - 1) / 11) * 100}%, #374151 ${((month - 1) / 11) * 100}%, #374151 100%)` }} />
                <span className="text-content01 font-bold text-white min-w-[2.5rem]">{month}月</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 歷史/未來按鈕組 */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setActiveSlider('past')}
                  className={`px-3 py-2 text-content01 font-semibold transition-all ${activeSlider === 'past' ? 'text-surface' : 'text-gray-400 hover:text-white'}`}>歷史</button>
                <button onClick={() => setActiveSlider('future')}
                  className={`px-3 py-2 text-content01 font-semibold transition-all ${activeSlider === 'future' ? 'text-accent' : 'text-gray-400 hover:text-white'}`}>未來</button>
              </div>

              {/* 年份控制 */}
              <div className="flex items-center gap-4">
                <input type="range" min={activeSlider === 'past' ? 2013 : 2025} max={activeSlider === 'past' ? 2023 : 2035} step={1}
                  value={activeSlider === 'past' ? pastYear : futureYear}
                  onChange={(e) => { const v = Number(e.target.value); activeSlider === 'past' ? setPastYear(v) : setFutureYear(v); }}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: activeSlider === 'past'
                      ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((pastYear - 2013) / 10) * 100}%, #374151 ${((pastYear - 2013) / 10) * 100}%, #374151 100%)`
                      : `linear-gradient(to right, #a855f7 0%, #a855f7 ${((futureYear - 2025) / 10) * 100}%, #374151 ${((futureYear - 2025) / 10) * 100}%, #374151 100%)`
                  }} />
                <span className={`text-content01 font-bold min-w-[3rem] ${activeSlider === 'past' ? 'text-surface' : 'text-accent'}`}>
                  {activeSlider === 'past' ? pastYear : futureYear}年
                </span>
              </div>
            </div>

            {/* 分隔線 */}
            <div className="w-full h-px bg-gray-600/70" />

            {/* 月份控制 */}
            <div className="space-y-3">
              <div className="text-content01 text-gray-100 font-bold">月份</div>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={12} step={1} value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((month - 1) / 11) * 100}%, #374151 ${((month - 1) / 11) * 100}%, #374151 100%)` }} />
                <span className="text-content01 font-bold text-white min-w-[2.5rem]">{month}月</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 側邊資訊面板（slide-out）- 移到最上層確保清晰可見 */}
      <div className={`absolute right-0 bg-black/90 backdrop-blur-md border-l border-cyan-400/50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
           style={{
             top: '50%', // 從容器高度的50%開始顯示
             width: 'min(20rem, 75vw)', // 稍微縮小寬度
             maxWidth: 'min(20rem, 75vw)',
             height: '45vh', // 設定為視窗高度的45%，比較舒適
             maxHeight: '500px', // 最大高度限制
             right: 0,
             zIndex: 9999, // 確保資訊面板在最頂層
             transform: sidebarOpen ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(100%)', // 垂直居中對齊
             boxShadow: sidebarOpen ? '0 0 30px rgba(97, 194, 194, 0.3)' : 'none' // 科技藍色陰影效果
           }}>
        <div className="p-4 sm:p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="text-lg font-bold text-cyan-400">
              {mode === 'population' ? '🌱 植樹模擬報告' : '⏰ 時間溫度預測'}
            </div>
            <button className="text-white hover:text-gray-300 text-2xl" onClick={closeSidebar} aria-label="關閉側欄">×</button>
          </div>

          {!currentFeature ? (
            <div className="text-center text-gray-400 mt-10">
              <div className="text-4xl mb-4">📍</div>
              <div className="text-lg font-bold text-cyan-400 mb-2">
                {mode === 'population' ? '植樹模擬報告' : '時間溫度預測'}
              </div>
              <div className="text-sm">點擊任一網格查看<br />詳細報告 📍</div>
            </div>
          ) : (
            <div>
              {/* 根據模式顯示不同內容結構 */}
              {mode === 'time' ? (
                /* 時間溫度預測模式結構 */
                <>
                  {/* 地理位置資訊面板 */}
                  <div className="mb-6 p-4 bg-black/40 rounded-lg border border-cyan-400/20">
                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      📍 地理位置資訊面板
                    </h4>
                    <div className="space-y-2 text-sm">
                      {currentFeature && (() => {
                        const geometry = currentFeature.geometry;
                        if (geometry.type === 'Polygon') {
                          const coordinates = geometry.coordinates[0];
                          let minLng = Infinity, maxLng = -Infinity;
                          let minLat = Infinity, maxLat = -Infinity;

                          coordinates.forEach(coord => {
                            const [lng, lat] = coord;
                            if (lng < minLng) minLng = lng;
                            if (lng > maxLng) maxLng = lng;
                            if (lat < minLat) minLat = lat;
                            if (lat > maxLat) maxLat = lat;
                          });

                          const centerLng = (minLng + maxLng) / 2;
                          const centerLat = (minLat + maxLat) / 2;
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-400">精確經緯度座標：</span>
                                <span className="text-cyan-300 font-mono">
                                  {centerLat.toFixed(6)}, {centerLng.toFixed(6)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">區域類型識別：</span>
                                <span className="text-white font-bold">都市區域</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">溫度資料顯示：</span>
                                <span className="text-yellow-300 font-bold">
                                  {flaskTemps.current ? `${flaskTemps.current.toFixed(1)}°C` : '載入中...'}
                                </span>
                              </div>
                            </>
                          );
                        }
                        return <div className="text-gray-400">無法取得地理資訊</div>;
                      })()}
                    </div>
                  </div>

                  {/* 分隔線 */}
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                    <div className="text-cyan-400 text-sm font-bold px-3 py-1 bg-cyan-400/10 rounded-full border border-cyan-400/30">
                      時間序列分析
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-cyan-400/50 to-transparent"></div>
                  </div>

                  {/* 時間序列分析內容 */}
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/10 rounded-lg border border-blue-400/20">
                      <h5 className="text-blue-400 font-bold mb-3">📈 歷史資料趨勢</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">歷史平均溫度：</span>
                          <span className="text-cyan-300 font-bold">
                            {flaskTemps.current ? `${(flaskTemps.current - 0.5).toFixed(1)}°C` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">趨勢變化：</span>
                          <span className="text-red-300 font-bold">+0.3°C (上升)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">年變化率：</span>
                          <span className="text-yellow-300 font-bold">+0.15°C/年</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-900/20 to-cyan-900/10 rounded-lg border border-purple-400/20">
                      <h5 className="text-purple-400 font-bold mb-3">🔮 未來預測數據</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">預測目標年：</span>
                          <span className="text-cyan-300 font-bold">{futureYear}年</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">預測溫度：</span>
                          <span className="text-yellow-300 font-bold">
                            {flaskTemps.current ? `${(flaskTemps.current + 0.8).toFixed(1)}°C` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">預測變化：</span>
                          <span className="text-red-300 font-bold">+0.8°C (上升)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 氣候變化指標 */}
                  <div className="p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg border border-cyan-400/30">
                    <h5 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                      🌡️ 氣候變化指標
                    </h5>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">熱浪天數增加：</span>
                        <span className="text-red-300 font-bold">+12 天/年</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">極端高溫頻率：</span>
                        <span className="text-orange-300 font-bold">+25%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">熱島效應強度：</span>
                        <span className="text-yellow-300 font-bold">中等 (3.2°C)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">建議緩解措施：</span>
                        <span className="text-green-300 font-bold">增加20%綠覆率</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* 植樹模擬報告模式結構 */
                <>
                  {/* 建築植栽模擬報告 */}
                  <div className="mb-6 p-4 bg-black/40 rounded-lg border border-cyan-400/20">
                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      🏢 建築植栽模擬報告
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">地理位置：</span>
                        <span className="text-white font-bold">台北市大安區</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">建地面積：</span>
                        <span className="text-cyan-300 font-bold">100 坪</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">建議綠覆率：</span>
                        <span className="text-green-400 font-bold">20%</span>
                      </div>
                    </div>
                  </div>

                  {/* 分隔線 */}
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent"></div>
                    <div className="text-green-400 text-sm font-bold px-3 py-1 bg-green-400/10 rounded-full border border-green-400/30">
                      植樹建議詳細內容
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-green-400/50 to-transparent"></div>
                  </div>

                  {/* 屋頂綠化建議 */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-lg border border-green-400/20">
                    <h5 className="text-green-400 font-bold mb-3 flex items-center gap-2">
                      🌱 屋頂綠化建議
                    </h5>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">面積與效益分析：</span>
                        <span className="text-cyan-300 font-bold">66 m²</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-400 to-cyan-400 h-2 rounded-full" style={{ width: '66%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">節能減碳計算：</span>
                        <span className="text-green-300 font-bold">每年省 1200 kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">熱舒適提升指標：</span>
                        <span className="text-yellow-300 font-bold">+15% (WBGT模型)</span>
                      </div>
                    </div>
                  </div>

                  {/* 綜合效益預估 */}
                  <div className="p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg border border-cyan-400/30">
                    <h5 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                      📊 綜合效益預估
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-400">年節電量</div>
                        <div className="text-green-300 font-bold">1,200 kWh</div>
                      </div>
                      <div>
                        <div className="text-gray-400">年減碳量</div>
                        <div className="text-green-300 font-bold">600 kg CO₂</div>
                      </div>
                      <div>
                        <div className="text-gray-400">熱島效應緩解</div>
                        <div className="text-cyan-300 font-bold">0.05°C 降溫</div>
                      </div>
                      <div>
                        <div className="text-gray-400">投資報酬率</div>
                        <div className="text-yellow-300 font-bold">125%</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 向下滾動提示箭頭 - 右側中央 */}
      <div className="absolute bottom-[10%] right-[10%] z-40 pointer-events-auto">
        <div className="flex flex-col items-center gap-2">
          {/* 提示文字 */}
          <motion.div
            className="text-white/80 text-base font-medium text-center"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
              Scroll Down
              <br />
              <span className="text-sm text-white/60">Click to continue</span>
            </div>
          </motion.div>

          {/* 箭頭按鈕 */}
          <motion.div
            className="w-28 h-28 flex items-center justify-center cursor-pointer"
            animate={{
              y: [-15, 15, -15],
            }}
            transition={{
              duration: 2.5,
              ease: "easeInOut",
              repeat: Infinity,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const dataSection = document.getElementById('data-section') || document.querySelector('[data-section="data"]');
              if (dataSection) {
                dataSection.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white/80 drop-shadow-lg"
            >
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        :root {
          --font-size-caption01: clamp(0.9375rem, 1.5vw, 1.125rem);
        }
        .info-sidebar {
          position: fixed;
          top: 200px;
          right: max(64px, env(safe-area-inset-right));
          width: clamp(280px, 24vw, 360px);
          height: 400px;
          box-sizing: border-box;
          border-radius: 8px;
          font-size: var(--font-size-caption01);
          transform: translateX(150%);
          transition: transform 0.3s ease;
          z-index: 1000;
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
          font-family: var(--font-mono);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }
        .info-sidebar.open { transform: translateX(0); }
        .info-sidebar.mode-population {
          background: linear-gradient(135deg, #2f4f4fa1 0%, #5aa2a2a1 50%, #1a0f19 100%);
          border: 2px solid #5aa2a2ff;
          color: #a8ffffff;
        }
        .info-sidebar.mode-time {
          background: linear-gradient(135deg, #2f4f4fa1 0%, #5aa2a2a1 50%, #1a0f19 100%);
          border: 2px solid #5aa2a2ff;
          color: #a8ffffff;
        }
        .sidebar-header {
          padding: 15px;
          border-bottom: 2px solid currentColor;
          background: rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        .sidebar-header::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, currentColor, transparent);
        }
        .sidebar-header::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, currentColor, transparent);
          opacity: 0.5;
        }
        .sidebar-title { font-size: var(--font-size-caption01); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 0 10px currentColor; }
        .close-btn { background: transparent; border: 1px solid currentColor; color: currentColor; font-size: var(--font-size-caption01); width: 28px; height: 28px; border-radius: 4px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .close-btn:hover { background: currentColor; color: #0a0e27; box-shadow: 0 0 15px currentColor; }
        .sidebar-content { padding: 15px; height: calc(100% - 70px); overflow-y: auto; scrollbar-gutter: stable both-edges; }
        .no-selection { text-align: center; font-size: var(--font-size-caption01); color: rgba(255,255,255,0.85); margin-top: 30px; }
        .section { margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
        .section-title { font-size: var(--font-size-caption01); margin-bottom: 10px; font-weight: bold; color: currentColor; text-shadow: 0 0 5px currentColor; }
        .info-grid { display: grid; gap: 6px; font-size: var(--font-size-caption01); }
        .info-grid div { color: rgba(255,255,255,0.9); }
        .info-grid strong { color: currentColor; font-weight: bold; }
        .result-display { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; font-size: var(--font-size-caption01); }
        .result-display .temp { font-size: 1.3em; font-weight: bold; margin: 8px 0; color: currentColor; text-shadow: 0 0 8px currentColor; }
        .loading { text-align: center; color: rgba(255,255,255,0.7); font-style: italic; font-size: var(--font-size-caption01); }
        .error-section { background: rgba(255,0,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,0,0,0.3); }
        .error-msg { color: #ff6b6b; font-size: var(--font-size-caption01); margin-bottom: 8px; }
        .url-details { margin-top: 8px; }
        .url-details summary { cursor: pointer; font-size: var(--font-size-caption01); color: rgba(255,255,255,0.6); margin-bottom: 5px; }
        .url-list { font-size: var(--font-size-caption01); color: rgba(255,255,255,0.5); max-height: 80px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px; }
        .url-list div { margin-bottom: 2px; word-break: break-all; }
        .api-data { font-size: var(--font-size-caption01); color: rgba(255,255,255,0.9); }
        .api-data div { margin-bottom: 6px; }
        .api-data .temp { font-size: 1.3em; font-weight: bold; color: currentColor; text-shadow: 0 0 8px currentColor; }
        
        /* 新增：溫度網格樣式 */
        .temp-grid { display: grid; gap: 8px; margin: 8px 0; }
        .temp-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid currentColor; }
        .temp-label { font-size: var(--font-size-caption01); color: rgba(255,255,255,0.8); }
        .temp-value { font-size: var(--font-size-caption01); font-weight: bold; color: currentColor; text-shadow: 0 0 5px currentColor; }
        
        .mode-info { font-size: var(--font-size-caption01); color: rgba(255,255,255,0.8); }
        .mode-info div { margin-bottom: 6px; }
        .info-text { font-style: italic; color: rgba(255,255,255,0.7); font-size: var(--font-size-caption01); }

        .bg-temp-low { background: #ddab17; }
        .bg-temp-medium { background: #eb7846; }
        .bg-temp-high { background: #cd3e5d; }
        .bg-temp-extreme { background: #9f2f7c; }

        @media (max-width: 1024px) {
          .info-sidebar {
            right: max(4vw, env(safe-area-inset-right));
            width: min(96vw, 420px);
            top: 72px;
            height: calc(100vh - 90px);
          }
        }
      `}</style>
    </section>
  );
}
