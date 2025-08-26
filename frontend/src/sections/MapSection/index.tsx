'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import type { Feature, FeatureCollection, GeoJsonProperties, Polygon, MultiPolygon } from 'geojson';
import L, { GeoJSON as LGeoJSON, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

async function fetchJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
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

  // Leaflet/GeoJSON
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gridLayerRef = useRef<LGeoJSON | null>(null);
  const selectionLayerRef = useRef<L.FeatureGroup | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);

  // 選格子/側欄
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<GridFeature | null>(null);
  const [centerLL, setCenterLL] = useState<LatLng | null>(null);
  const [rowId, setRowId] = useState<number | null>(null);
  const [colId, setColId] = useState<number | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

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

  /* --- GeoJSON 畫面上色：預設 i.tsx 色塊；開啟「著色功能」才覆蓋 --- */
  useEffect(() => {
    applyLayerColorsRef.current = () => {
      const data = geoJsonDataRef.current;
      const grid = gridLayerRef.current;
      const m = monthRef.current;
      if (!data || !grid) return;

      const features = data.features as GridFeature[];

      // ---- A) 取得每個格子的值（時間模式優先用 DB 批次）----
      const dbMap = timeGridRef.current; // 只有時間模式才會被設定
      const getValueForFeature = (f: GridFeature): number | undefined => {
        // 1) 若是時間模式且 DB 有資料 → 直接用 DB 值
        if (modeRef.current === 'time' && dbMap) {
          const p: any = f.properties || {};
          const key = makeCellKey(Number(p.row_id), Number(p.column_id));
          const v = dbMap.get(key);
          if (typeof v === 'number') return v;
        }
        // 2) 後備：使用 GeoJSON 內建欄位（舊機制）
        return getMonthTemp(f, m);
      };

      // ---- B) 計算 min/max 作為顏色標準化依據 ----
      const valuesForRange: number[] = [];
      for (const f of features) {
        const v = getValueForFeature(f);
        if (typeof v === 'number') valuesForRange.push(v);
      }
      const min = valuesForRange.length ? Math.min(...valuesForRange) : 0;
      const max = valuesForRange.length ? Math.max(...valuesForRange) : 1;
      const safeMin = (min === max) ? (min - 0.5) : min;
      const safeMax = (min === max) ? (max + 0.5) : max;

      // ---- C) 逐格著色（其餘互動/進階著色完全保留）----
      grid.eachLayer((layer: any) => {
        const f = layer.feature as GridFeature;
        const isSelected = !!(selectedIdRef.current && getFeatureId(f) === selectedIdRef.current);

        const v = getValueForFeature(f);
        const hasVal = typeof v === 'number';
        const percent = hasVal ? toPercent(v as number, safeMin, safeMax) : undefined;

        let fillColor = hasVal ? colorByPercent(percent as number) : 'transparent';
        let fillOpacity = hasVal ? 0.6 : 0.1;

        if (enableAdvancedColor) {
          if (colorModeRef.current === 'type') {
            const t = getTypeForFeature(f);
            if (t) { fillColor = getColorForType(t); fillOpacity = 0.65; }
            else { fillColor = 'transparent'; fillOpacity = 0.1; }
          } else if (colorModeRef.current === 'temperature') {
            if (hasVal) { fillColor = colorByPercent(percent as number); fillOpacity = 0.6; }
            else { fillColor = 'transparent'; fillOpacity = 0.1; }
          }
        }

        (layer as any).setStyle({
          fillColor,
          fillOpacity,
          color: isSelected ? 'black' : DEFAULT_STROKE,
          weight: isSelected ? 6 : 2,
        });
      });
    };
  }, [enableAdvancedColor]); // 只關心開關本身；其餘用 ref 取最新值
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

  useEffect(() => {
    if (mode !== 'population') {
      vegGridRef.current = null;            // 切離開植被模式就清空
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
  }, [mode, month, veg]);


  /* --- 初始化地圖 --- */
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const el = mapRef.current; if (!el) return;

    const raf = requestAnimationFrame(() => {
      if (mapInstanceRef.current || !mapRef.current) return;

      const TPE_BOUNDS = L.latLngBounds([24.50, 120.85], [25.40, 122.35]);

      const map = L.map(el, {
        center: [25.0200, 121.5845], zoom: 12, minZoom: 9,
        maxBounds: TPE_BOUNDS.pad(0.02),
        maxBoundsViscosity: 1.0,
        worldCopyJump: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;

      // 陰影層
      map.createPane('hillshadePane');
      const hp = map.getPane('hillshadePane')!;
      hp.style.zIndex = '350';
      hp.style.pointerEvents = 'none';
      hp.style.mixBlendMode = 'multiply';
      hp.style.opacity = '0.85';

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
        { pane: 'hillshadePane', attribution: 'Esri World Hillshade', maxZoom: 19 }
      ).addTo(map);

      // 選取框 pane
      map.createPane('selectedPane');
      const sp = map.getPane('selectedPane')!;
      sp.style.zIndex = '1000';
      sp.style.pointerEvents = 'none';
      selectionLayerRef.current = L.featureGroup([], { pane: 'selectedPane' }).addTo(map);

      fetch('/data/grid.geojson')
        .then(r => r.json())
        .then((geojson: FeatureCollection) => {
          setGeoJsonData(geojson);
          const features = geojson.features as GridFeature[];
          const { min, max } = computeMinMax(features, 10); // 使用初始月份10
          const gridLayer = L.geoJSON(geojson as any, {
            // 初始就顯示溫度顏色塗層
            style: (feature: any) => {
              const temp = getMonthTemp(feature, 10); // 使用初始月份10
              if (typeof temp === 'number') {
                const percent = toPercent(temp, min, max);
                const color = colorByPercent(percent);
                return { color: DEFAULT_STROKE, weight: 2, fillColor: color, fillOpacity: 0.6 };
              }
              return { color: DEFAULT_STROKE, weight: 2, fillColor: 'transparent', fillOpacity: 0 };
            },
            onEachFeature: (feature: any, layer: any) => {
              // 不顯示 Type tooltip（避免 "Type: city" 之類的字）
              try { /* intentionally no tooltip */ } catch { }

              layer.on('click', (e: any) => {
                const lf = e.target?.feature as GridFeature; if (!lf) return;
                const p = (lf.properties || {}) as any;
                setRowId(Number(p.row_id ?? null));
                setColId(Number(p.column_id ?? null));
                const id = getFeatureId(lf);
                setSelectedCellId(id);
                setCurrentFeature(lf);
                try {
                  const b = e.target.getBounds?.();
                  if (b) {
                    setCenterLL(b.getCenter());
                    map.fitBounds(b, { maxZoom: 14, animate: true });
                  }
                } catch { }
                setSidebarOpen(true);

                selectionLayerRef.current?.clearLayers();
                L.geoJSON(lf as any, {
                  pane: 'selectedPane',
                  style: { color: 'black', weight: 2, fill: false, opacity: 1, interactive: false }
                }).addTo(selectionLayerRef.current!);
                applyLayerColorsRef.current();
              });

              layer.on('mouseover', (e: any) => {
                const lf = layer.feature as GridFeature;
                const fid = getFeatureId(lf);
                if (selectedIdRef.current && fid === selectedIdRef.current) return;
                (e.target as L.Path).setStyle({ fillColor: HOVER_YELLOW, fillOpacity: 0.9 });
              });
              layer.on('mouseout', () => { applyLayerColorsRef.current(); });
            },
          }).addTo(map);
          gridLayerRef.current = gridLayer;
          applyLayerColorsRef.current();
          try {
            const b = gridLayer.getBounds();
            if (b.isValid()) {
              map.fitBounds(b, { padding: [10, 10] });
              map.panBy([-200, 0]);
            }
          } catch { }
        })
        .catch(console.error);
    });

    return () => {
      cancelAnimationFrame(raf);
      const m = mapInstanceRef.current;
      if (m) { m.remove(); mapInstanceRef.current = null; }
      gridLayerRef.current = null;
    };
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
          urls.push(`${base}/NDVI/${mPadded}/${v01}/${c}+${r}`);
          urls.push(`${base}/NDVI/${mPadded}/${v01}/${c}%2B${r}`);
          urls.push(`${base}/NDVI/${mRaw}/${v01}/${c}+${r}`);
          urls.push(`${base}/NDVI/${mRaw}/${v01}/${c}%2B${r}`);
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
    setApiLoading(true);
    setApiError(null);
    setTriedUrls(candidates);

    (async () => {
      let lastErr: any = null;
      for (const url of candidates) {
        try {
          const data = await fetchJSON<ClimatePayload>(url);
          if (!aborted) { setApiData(data); setApiError(null); }
          return;
        } catch (e: any) {
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
    })().finally(() => { if (!aborted) setApiLoading(false); });

    return () => { aborted = true; };
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

  const closeSidebar = () => {
    setSidebarOpen(false);
    setCurrentFeature(null);
    setCenterLL(null);
    selectionLayerRef.current?.clearLayers();
    setSelectedCellId(null);
  };

  const isInView = useInView(sectionRef, { once: false });

  return (
    <section
      id="map-section"
      ref={sectionRef}
      className="relative overflow-hidden h-[100vh] bg-transparent"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      {/* 標題層 - 使用 index.tsx 格式 */}
      <div className="sticky top-0 m-screen flex items-center justify-center ">
        
          <h2
            className="font-mono text-text-primary tracking-wider text-center text-title01 leading-loose"
          >
            Heat Island Model
          </h2>
      </div>

      {/* 模式切換 + 著色功能 */}
      <div className="flex justify-center text-content01 mb-8 gap-4 px-4 max-md:flex-col max-md:items-center max-md:gap-3">
        <button
          onClick={() => setMode('time')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all max-md:w-full max-md:max-w-sm ${mode === 'time'
            ? 'bg-surface text-white'
            : 'text-gray-400 text-content01 border border-gray-700 hover:text-white'
            }`}
        >
          歷史與預測溫度模型
        </button>
        <button
          onClick={() => setMode('population')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all max-md:w-full max-md:max-w-sm ${mode === 'population'
            ? 'bg-surface text-white'
            : 'text-gray-400 text-content01 border border-gray-700 hover:text-white'
            }`}
        >
          植被覆蓋率推導模型
        </button>

        {/* 新增：著色功能開關（預設關閉） */}
        <button
          onClick={() => {
            setEnableAdvancedColor(v => {
              const next = !v;
              // 開啟時固定採用「類型」著色，關閉則回原本溫度色塊
              if (next) {
                setColorMode('type');
                colorModeRef.current = 'type';
              }
              return next;
            });
            setTimeout(() => applyLayerColorsRef.current(), 0); // 立即重繪
          }}
          className={`px-4 py-2 rounded-lg text-content01 font-semibold transition-all max-md:w-full max-md:max-w-sm ${enableAdvancedColor ? 'bg-cyan-500 text-black' : 'text-gray-300 border border-gray-700 hover:text-white'}`}
          title="按一下切換到 index.tsx 的著色功能；再按回到原本色塊"
        >
          代表性分區重點展示
        </button>

      </div>
      {/* 當前年月顯示（移到黑色容器上方） */}
      <div className="absolute top-32 right-16 z-10  rounded-lg p-4 text-white border border-gray-700" >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-caption01 text-gray-400">當前時間</span>
            <div className="text- font-bold">
              {mode === 'time' ? (activeSlider === 'past' ? `${pastYear}` : `${futureYear}`) : '2022'} 年 {month} 月
            </div>
          </div>
          <div className="border-l border-gray-600 pl-4">
            <span className="text-caption01 text-gray-400">
              {mode === 'time' ? (activeSlider === 'past' ? '歷史資料' : '未來預測') : ' 植被分析'}
            </span>
          </div>
        </div>
      </div>
     {/* 溫度圖例 - 常駐顯示，只有類型模式時才被類型圖例取代 */}
        {!enableAdvancedColor || colorMode === 'temperature' ? (
          <div className="absolute top-1 left-4 z-[10]  rounded-lg px-3 py-3 text-white border border-gray-700">
            <div className="flex flex-col gap-3">
              <span className="font-bold text-l">溫度圖例 ({month}月)</span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-temp-low"></div>
                  <span className="text-caption01">低溫</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-temp-medium"></div>
                  <span className="text-caption01">中低溫</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-temp-high"></div>
                  <span className="text-caption01">中高溫</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-temp-extreme"></div>
                  <span className="text-caption01">高溫</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 類型圖例 - 只有開啟進階著色且為類型模式時顯示 */}
        {enableAdvancedColor && colorMode === 'type' && (
          <div className="absolute top-4 right-4 z-[15] bg-black/85 rounded-lg p-3 text-white border border-gray-700">
            <div className="text-caption01 mb-2">類型</div>
            <div className="flex gap-4 flex-wrap">
              {(['mountain', 'coast', 'city', 'suburb'] as const).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: TYPE_COLORS[key] }} />
                  <span className="text-caption01 capitalize">{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      {/* 地圖容器卡片 */}
  <div className="relative bg-black/50 backdrop-blur-sm rounded-3xl border border-gray-800 p-8 overflow-hidden bg-image-custom" style={{ marginTop: '2rem' }}>

{/* 中間控制拉桿區域（修改後的佈局） */}
<div className="absolute top-4 right-16 z-10 bg-blue-100/30 rounded-lg p-4 text-white-100  border-blue-300 max-md:relative max-md:right-auto max-md:mt-4 max-md:mx-4" style={{ width: '360px', minWidth: '360px' ,}}>
  {mode === 'population' ? (
    <div className="flex flex-col items-start gap-6 max-md:gap-3">
      <div className="flex-col gap-4 max-md:w-full max-md:flex-col max-md:gap-2">
        <span className="text-caption01 text-gray-100 font-bold whitespace-nowrap">植被覆蓋率</span>
        <div className="flex-col gap-3 max-md:w-full max-md:justify-between">
          <input type="range" min={0} max={100} step={10} value={veg}
            onChange={(e) => setVeg(Number(e.target.value))}
            className="w-56 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer max-md:flex-1"
            style={{ background: `linear-gradient(to right, #ffffff 0%, #A9E981 ${veg}%, #374151 ${veg}%, #374151 100%)` }} />
          <span className="text-caption01 font-bold text-white min-w-[3rem]">{veg}%</span>
        </div>
      </div>
      <div className="h-6 w-px bg-gray-600/70 max-md:h-px max-md:w-6" />
      <div className="flex-col gap-3 max-md:w-full max-md:flex-col max-md:gap-2">
        <span className="text-caption01 text-gray-100 font-bold whitespace-nowrap">月份</span>
         <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <input type="range" min={1} max={12} step={1} value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-56 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer max-md:flex-1"
            style={{ background: `linear-gradient(to right, #ffffff 0%, #f59e0b ${((month - 1) / 11) * 100}%, #374151 ${((month - 1) / 11) * 100}%, #374151 100%)` }} />
          <span className="text-caption01 font-bold text-white min-w-[2rem]">{month}月</span>
        </div>
      </div>
    </div>
  ) : (
    /* 修改後的時間模式佈局 - 將月份移到歷史/未來按鈕下方 */
    <div className="flex flex-col items-start gap-4 max-md:gap-3">
      {/* 歷史/未來按鈕組 */}
      <div className="flex flex-col gap-3 max-md:w-full">
        <div className="flex gap-2">
          <button onClick={() => setActiveSlider('past')}
            className={`px-2 py-1 text-caption01 rounded transition-all shadow-lg ${activeSlider === 'past' ? 'bg-blue-500  text-white shadow-blue-500/100' : 'text-gray-100 border border-gray-600 hover:text-white'}`}>歷史</button>
          <button onClick={() => setActiveSlider('future')}
            className={`px-2 py-1 text-caption01 rounded transition-all ${activeSlider === 'future' ? 'bg-green-700 text-white' : 'text-gray-100 border border-gray-600 hover:text-white'}`}>未來</button>
        </div>
        
        {/* 年份控制 */}
        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <input type="range" min={activeSlider === 'past' ? 2013 : 2025} max={activeSlider === 'past' ? 2023 : 2035} step={1}
            value={activeSlider === 'past' ? pastYear : futureYear}
            onChange={(e) => { const v = Number(e.target.value); activeSlider === 'past' ? setPastYear(v) : setFutureYear(v); }}
            className="w-56 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer max-md:flex-1"
            style={{
              background: activeSlider === 'past'
                ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((pastYear - 2013) / 10) * 100}%, #374151 ${((pastYear - 2013) / 10) * 100}%, #374151 100%)`
                : `linear-gradient(to right, #a855f7 0%, #a855f7 ${((futureYear - 2025) / 10) * 100}%, #374151 ${((futureYear - 2025) / 10) * 100}%, #374151 100%)`
            }} />
          <span className={`text-caption01 font-bold min-w-[3rem] ${activeSlider === 'past' ? 'text-blue-400' : 'text-green-700'}`}>{activeSlider === 'past' ? pastYear : futureYear}年</span>
        </div>
      </div>

      {/* 分隔線 */}
      <div className="h-px w-full bg-gray-600/70" />

      {/* 月份控制 - 移到這裡 */}
      <div className="flex flex-col gap-3 max-md:w-full">
        <span className="text-m text-gray-100 whitespace-nowrap">月份</span>
        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <input type="range" min={1} max={12} step={1} value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-56 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer max-md:flex-1"
            style={{ background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((month - 1) / 11) * 100}%, #374151 ${((month - 1) / 11) * 100}%, #374151 100%)` }} />
          <span className="text-caption01 font-bold text-white-400 min-w-[2rem]">{month}月</span>
        </div>
      </div>
    </div>
  )}
</div>

        {/* 方案 1: 減少寬度和邊距，與儀表板保持距離 */}
        <div
          id="leaflet-map"
          ref={mapRef}
          className="w-3/4 mt-4 mr-12 rounded-2xl overflow-hidden border border-gray-800 max-md:mt-2 max-md:w-full max-md:mr-0 mx-auto ml-8"
          style={{ height: 'clamp(400px, 60vh, 600px)' }}
        />

        {/* 側邊資訊面板（fixed） */}
        <div className={`info-sidebar ${mode === 'population' ? 'mode-population' : 'mode-time'} ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">{mode === 'population' ? '植被溫度分析' : '時間溫度預測'}</div>
            <button className="close-btn" onClick={closeSidebar} aria-label="關閉側欄">×</button>
          </div>

          <div className="sidebar-content">
            {!currentFeature && <div className="no-selection">點擊任一網格查看資料 📍</div>}

            {currentFeature && (
              <div>
                {/* 基本位置資訊 */}
                <div className="section">
                  <h4 className="section-title">📍 位置資訊</h4>
                  <div className="info-grid">
                    <div>經緯度: {centerLL ? `${centerLL.lat.toFixed(4)}, ${centerLL.lng.toFixed(4)}` : '—'}</div>
                  </div>
                </div>

                {/* Flask API 資料 */}
                <div className="section">
                  <h4 className="section-title">🔗 溫度資訊</h4>
                  {apiLoading ? (
                    <div className="loading">讀取中…</div>
                  ) : apiError ? (
                    <div className="error-section">
                      <div className="error-msg">錯誤：{apiError}</div>
                      {!!triedUrls.length && (
                        <details className="url-details">
                          <summary>檢視嘗試過的網址</summary>
                          <div className="url-list">
                            {triedUrls.slice(0, 5).map((u, i) => <div key={i}>{u}</div>)}
                            {triedUrls.length > 5 && <div>...還有 {triedUrls.length - 5} 個</div>}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="api-data">
                      <div>年月: {mode === 'population' ? '2022' : (apiData?.metadata?.year ?? '—')} / {apiData?.metadata?.month ?? '—'}</div>

                      {/* 顯示三個溫度值 */}
                      <div className="temp-grid">
                        <div className="temp-item">
                          <span className="temp-label">🌡️ 平均溫度:</span>
                          <span className="temp-value">{typeof flaskTemps.current === 'number' ? `${flaskTemps.current.toFixed(1)} °C` : '—'}</span>
                        </div>
                        <div className="temp-item">
                          <span className="temp-label">🔥 最高溫度:</span>
                          <span className="temp-value">{typeof flaskTemps.high === 'number' ? `${flaskTemps.high.toFixed(1)} °C` : '—'}</span>
                        </div>
                        <div className="temp-item">
                          <span className="temp-label">❄️ 最低溫度:</span>
                          <span className="temp-value">{typeof flaskTemps.low === 'number' ? `${flaskTemps.low.toFixed(1)} °C` : '—'}</span>
                        </div>
                      </div>

                      {mode === 'population' && (<div>植被: {apiData?.metadata?.vegetation ?? '—'}</div>)}
                    </div>
                  )}
                </div>

                {/* 模式特定資訊（描述保留） */}
                <div className="section">
                  <h4 className="section-title">{mode === 'population' ? '🌱 植被影響' : '⏰ 時間變化'}</h4>
                  <div className="mode-info">
                    {mode === 'population' ? (
                      <div>
                        <div>當前設定: {veg}% 植被覆蓋</div>
                        <div className="info-text">植被越高 → 降溫效果越明顯</div>
                      </div>
                    ) : (
                      <div>
                        <div>{activeSlider === 'past' ? (<span className="info-text">📊 基於 {pastYear} 年歷史資料</span>) : (<span className="info-text">🔮 預測至 {futureYear} 年</span>)}</div>
                        <div className="info-text">{activeSlider === 'past' ? '回顧過去溫度變化趨勢' : '基於氣候模型預測未來'}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-image-custom {
          background-image: url('/images/09.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .info-sidebar {
          position: fixed;
          top: 200px;
          right: max(64px, env(safe-area-inset-right));
          width: clamp(280px, 24vw, 360px);
          height: 400px;
          box-sizing: border-box;
          border-radius: 8px;
          font-size: 12px;
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
        .sidebar-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 0 10px currentColor; }
        .close-btn { background: transparent; border: 1px solid currentColor; color: currentColor; font-size: 16px; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .close-btn:hover { background: currentColor; color: #0a0e27; box-shadow: 0 0 15px currentColor; }
        .sidebar-content { padding: 15px; height: calc(100% - 70px); overflow-y: auto; scrollbar-gutter: stable both-edges; }
        .no-selection { text-align: center; font-size: 14px; color: rgba(255,255,255,0.85); margin-top: 30px; }
        .section { margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
        .section-title { font-size: 13px; margin-bottom: 10px; font-weight: bold; color: currentColor; text-shadow: 0 0 5px currentColor; }
        .info-grid { display: grid; gap: 6px; font-size: 11px; }
        .info-grid div { color: rgba(255,255,255,0.9); }
        .info-grid strong { color: currentColor; font-weight: bold; }
        .result-display { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; font-size: 11px; }
        .result-display .temp { font-size: 1.3em; font-weight: bold; margin: 8px 0; color: currentColor; text-shadow: 0 0 8px currentColor; }
        .loading { text-align: center; color: rgba(255,255,255,0.7); font-style: italic; }
        .error-section { background: rgba(255,0,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,0,0,0.3); }
        .error-msg { color: #ff6b6b; font-size: 11px; margin-bottom: 8px; }
        .url-details { margin-top: 8px; }
        .url-details summary { cursor: pointer; font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 5px; }
        .url-list { font-size: 9px; color: rgba(255,255,255,0.5); max-height: 80px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px; }
        .url-list div { margin-bottom: 2px; word-break: break-all; }
        .api-data { font-size: 11px; color: rgba(255,255,255,0.9); }
        .api-data div { margin-bottom: 6px; }
        .api-data .temp { font-size: 1.3em; font-weight: bold; color: currentColor; text-shadow: 0 0 8px currentColor; }
        
        /* 新增：溫度網格樣式 */
        .temp-grid { display: grid; gap: 8px; margin: 8px 0; }
        .temp-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid currentColor; }
        .temp-label { font-size: 15px; color: rgba(255,255,255,0.8); }
        .temp-value { font-size: 11px; font-weight: bold; color: currentColor; text-shadow: 0 0 5px currentColor; }
        
        .mode-info { font-size: 11px; color: rgba(255,255,255,0.8); }
        .mode-info div { margin-bottom: 6px; }
        .info-text { font-style: italic; color: rgba(255,255,255,0.7); font-size: 10px; }

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
