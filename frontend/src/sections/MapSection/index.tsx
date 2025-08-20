'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import type { Feature, FeatureCollection, GeoJsonProperties, Polygon, MultiPolygon } from 'geojson';
import L, { GeoJSON as LGeoJSON, LatLng, LeafletMouseEvent, Layer } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// =================== 工具 & 型別 ===================

type GridFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties & Record<string, unknown>>;

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
  if (temps && typeof temps[m] === 'number') return temps[m];
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
  if (p < 25) return '#EAB090';
  if (p < 50) return '#E27777';
  if (p < 75) return '#AE567D';
  return '#724B80';
}

// 後端回傳
type ClimatePayload = {
  metadata?: { year?: number; month?: number; vegetation?: number };
  location?: { column_id?: number; row_id?: number; latitude?: number; longitude?: number };
  temperatures?: { current?: number; high?: number; low?: number };
  apparent_temperatures?: { current?: number; high?: number; low?: number };
  predicted_temperatures?: { current?: number; high?: number; low?: number };
} | Record<string, any>;

// =================== 主頁面 ===================
export default function MapSection() {
  // 所有 Hooks 都在頂層，在任何條件性返回之前
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 即使在 SSR 階段也要調用這些 hooks
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
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

  // 地圖 & Grid
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gridLayerRef = useRef<LGeoJSON | null>(null);
  const selectionLayerRef = useRef<L.FeatureGroup | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);

  // 選格子
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

  // 著色 re-render 幫手
  const geoJsonDataRef = useRef<FeatureCollection | null>(null);
  const monthRef = useRef(month);
  const selectedIdRef = useRef<string | null>(null);
  const applyLayerColorsRef = useRef<() => void>(() => {});

  useEffect(() => { geoJsonDataRef.current = geoJsonData; }, [geoJsonData]);
  useEffect(() => { monthRef.current = month; }, [month]);
  useEffect(() => { selectedIdRef.current = selectedCellId; }, [selectedCellId]);

  // 基準（GeoJSON）
  const baseTemp = useMemo(() => getMonthTemp(currentFeature, month), [currentFeature, month]);
  const vegPredicted = useMemo(() => {
    if (typeof baseTemp !== 'number') return undefined;
    const predicted = baseTemp + (2 - 4 * (veg / 100));
    return Number.isFinite(predicted) ? Number(predicted.toFixed(1)) : undefined;
  }, [baseTemp, veg]);
  const timePredicted = useMemo(() => {
    const t = getMonthTemp(currentFeature, month);
    if (typeof t !== 'number') return undefined;
    let yearModifier = 0;
    if (activeSlider === 'past') yearModifier = ((pastYear - 2013) / 10) * 2 - 1;
    else yearModifier = 1 + ((futureYear - 2025) / 10) * 2;
    const predicted = t + yearModifier;
    return Number.isFinite(predicted) ? Number(predicted.toFixed(1)) : undefined;
  }, [currentFeature, month, pastYear, futureYear, activeSlider]);

  // 著色器：依 GeoJSON 的當月欄位上色（不覆蓋網格來源）
  useEffect(() => {
    applyLayerColorsRef.current = () => {
      const data = geoJsonDataRef.current;
      const grid = gridLayerRef.current;
      const m = monthRef.current;
      if (!data || !grid) return;
      const features = data.features as GridFeature[];
      const { min, max } = computeMinMax(features, m);
      grid.eachLayer((layer: any) => {
        const f = layer.feature as GridFeature;
        const temp = getMonthTemp(f, m);
        const hasTemp = typeof temp === 'number';
        const percent = hasTemp ? toPercent(temp as number, min, max) : undefined;
        const fillColor = hasTemp ? colorByPercent(percent as number) : 'transparent';
        const isSelected = !!(selectedIdRef.current && getFeatureId(f) === selectedIdRef.current);
        (layer as any).setStyle({
          fillColor,
          fillOpacity: hasTemp ? 0.6 : 0.1,
          color: isSelected ? 'black' : DEFAULT_STROKE,
          weight: isSelected ? 6 : 2,
        });
      });
    };
  }, []);
  useEffect(() => { applyLayerColorsRef.current(); }, [geoJsonData, month, selectedCellId]);

  // 初始化地圖 + 載入 GeoJSON
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const el = mapRef.current; if (!el) return;

    const raf = requestAnimationFrame(() => {
      if (mapInstanceRef.current || !mapRef.current) return;

      const TPE_BOUNDS = L.latLngBounds(
        [24.50, 120.85],
        [25.40, 122.35]
      );

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

      // 建立陰影層
      map.createPane('hillshadePane');
      const hp = map.getPane('hillshadePane')!;
      hp.style.zIndex = '350';
      hp.style.pointerEvents = 'none';
      hp.style.mixBlendMode = 'multiply';
      hp.style.opacity = '0.85';

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
        {
          pane: 'hillshadePane',
          attribution: 'Esri World Hillshade',
          maxZoom: 19
        }
      ).addTo(map);

      // 建立選取框 pane
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
          const { min, max } = computeMinMax(features, 1);
          const gridLayer = L.geoJSON(geojson as any, {
            style: (feature: any) => {
              const temp = getMonthTemp(feature, 1);
              if (typeof temp === 'number') {
                const percent = toPercent(temp, min, max);
                const color = colorByPercent(percent);
                return { color: '#f59e0b', weight: 2, fillColor: color, fillOpacity: 0.7 };
              }
              return { color: '#f59e0b', weight: 2, fillColor: 'transparent', fillOpacity: 0 };
            },
            onEachFeature: (feature: any, layer: any) => {
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
                } catch {}
                setSidebarOpen(true);

                selectionLayerRef.current?.clearLayers();
                L.geoJSON(lf as any, { 
                  pane: 'selectedPane', 
                  style: { 
                    color: 'black', 
                    weight: 2, 
                    fill: false, 
                    opacity: 1, 
                    interactive: false 
                  } 
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
          } catch {}
        })
        .catch(console.error);
    });

    return () => {
      cancelAnimationFrame(raf);
      const m = mapInstanceRef.current;
      if (m) {
        m.remove();
        mapInstanceRef.current = null;
      }
      gridLayerRef.current = null;
    };
  }, []);

  // ======== 產生候選 URL（同時嘗試多種路徑寫法） ========
  function buildApiCandidates(): string[] {
    if (rowId == null || colId == null) return [];
    const mPadded = pad2(month), mRaw = String(month);
    const combos = [ { c: colId, r: rowId }, { c: rowId, r: colId } ];

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

  // ======== 抓資料（逐一嘗試直到成功，404 才換下一個） ========
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
          if (!(e instanceof NoDataError) && !String(e.message||'').includes('HTTP 404')) break;
        }
      }
      if (!aborted) {
        if (lastErr instanceof NoDataError || String(lastErr?.message||'').includes('HTTP 404')) {
          setApiData(null); setApiError('查無資料');
        } else {
          setApiData(null); setApiError(lastErr?.message || '讀取失敗');
        }
      }
    })().finally(() => { if (!aborted) setApiLoading(false); });

    return () => { aborted = true; };
  }, [mode, activeSlider, pastYear, futureYear, month, veg, rowId, colId]);

  const flaskTemp = useMemo(() => (
    apiData?.predicted_temperatures?.current ??
    apiData?.temperatures?.current ??
    apiData?.apparent_temperatures?.current
  ), [apiData]);

  // =================== UI ===================
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
      className="relative overflow-hidden h-[200vh] bg-transparent"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      {/* 標題層 */}
      <div className="sticky top-0 h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
          style={{
            opacity: mounted ? titleOpacity : 0,
            scale: mounted ? titleScale : 0.8
          }}
          className="text-center px-4 w-full flex flex-col items-center justify-center"
        >
          <h2
            className="font-display text-white tracking-wider text-center"
            style={{
              fontSize: 'clamp(1.2rem, 6vw, 4rem)',
              lineHeight: '1.2'
            }}
          >
            Heat Island Model
          </h2>
          <motion.p
            className="font-sans text-gray-100 font-regular tracking-wide text-center max-w-2xl mx-auto mt-4"
            style={{
              opacity: mounted ? descriptionOpacity : 0,
              fontSize: 'clamp(0.8rem, 2vw, 1.8rem)',
              lineHeight: '1.4'
            }}
          >
            理解雙北十年的溫度脈動 ↔ 以植物為核心預測未來場景
          </motion.p>
        </motion.div>
      </div>

      {/* 模式切換 */}
      <div className="flex justify-center mb-8 gap-4">
        <button
          onClick={() => setMode('time')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${mode === 'time'
            ? 'bg-green-500 text-black'
            : 'text-gray-400 border border-gray-700 hover:text-white'
            }`}
        >
          理解雙北十年的溫度脈動
        </button>
        <button
          onClick={() => setMode('population')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${mode === 'population'
            ? 'bg-green-500 text-black'
            : 'text-gray-400 border border-gray-700 hover:text-white'
            }`}
        >
          以植物為核心預測未來場景
        </button>
      </div>

      {/* 地圖容器 */}
      <div className="relative bg-black/50 backdrop-blur-sm rounded-3xl border border-gray-800 p-8 overflow-hidden" style={{ marginTop: '2rem' }}>
        {/* 當前年月顯示 */}
        <div className="absolute top-4 left-4 z-20 bg-black/90 rounded-lg p-4 text-white border border-gray-700">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">當前時間</span>
              <div className="text-lg font-bold">
                {mode === 'time' ? (
                  activeSlider === 'past' ? `${pastYear}` : `${futureYear}`
                ) : '2022'} 年 {month} 月
              </div>
            </div>
            <div className="border-l border-gray-600 pl-4">
              <span className="text-xs text-gray-400">
                {mode === 'time' ? (
                  activeSlider === 'past' ? '📊 歷史資料' : '🔮 未來預測'
                ) : '🌱 植被分析'}
              </span>
            </div>
          </div>
        </div>

        {/* 中間控制拉桿區域 */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/90 rounded-lg p-4 text-white border border-gray-700">
          {mode === 'population' ? (
            /* 植被模式：植被覆蓋率拉桿 */
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 whitespace-nowrap">🌱 植被覆蓋率</span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={veg}
                  onChange={(e) => {
                    e.preventDefault();
                    setVeg(Number(e.target.value));
                  }}
                  className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #22c55e 0%, #22c55e ${veg}%, #374151 ${veg}%, #374151 100%)`
                  }}
                />
                <span className="text-sm font-bold text-green-400 min-w-[3rem]">{veg}%</span>
              </div>
            </div>
          ) : (
            /* 時間模式：年份和月份拉桿 */
            <div className="flex items-center gap-6">
              {/* 年份切換 */}
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveSlider('past')}
                    className={`px-2 py-1 text-xs rounded transition-all ${activeSlider === 'past'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 border border-gray-600 hover:text-white'
                      }`}
                  >
                    📊 歷史
                  </button>
                  <button
                    onClick={() => setActiveSlider('future')}
                    className={`px-2 py-1 text-xs rounded transition-all ${activeSlider === 'future'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 border border-gray-600 hover:text-white'
                      }`}
                  >
                    🔮 未來
                  </button>
                </div>

                {/* 年份拉桿 */}
                <input
                  type="range"
                  min={activeSlider === 'past' ? 2013 : 2025}
                  max={activeSlider === 'past' ? 2023 : 2035}
                  step={1}
                  value={activeSlider === 'past' ? pastYear : futureYear}
                  onChange={(e) => {
                    e.preventDefault();
                    const value = Number(e.target.value);
                    if (activeSlider === 'past') {
                      setPastYear(value);
                    } else {
                      setFutureYear(value);
                    }
                  }}
                  className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: activeSlider === 'past'
                      ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((pastYear - 2013) / 10) * 100}%, #374151 ${((pastYear - 2013) / 10) * 100}%, #374151 100%)`
                      : `linear-gradient(to right, #a855f7 0%, #a855f7 ${((futureYear - 2025) / 10) * 100}%, #374151 ${((futureYear - 2025) / 10) * 100}%, #374151 100%)`
                  }}
                />
                <span className={`text-sm font-bold min-w-[3rem] ${activeSlider === 'past' ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                  {activeSlider === 'past' ? pastYear : futureYear}年
                </span>
              </div>

              {/* 月份拉桿 */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 whitespace-nowrap">📅 月份</span>
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={month}
                  onChange={(e) => {
                    e.preventDefault();
                    setMonth(Number(e.target.value));
                  }}
                  className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((month - 1) / 11) * 100}%, #374151 ${((month - 1) / 11) * 100}%, #374151 100%)`
                  }}
                />
                <span className="text-sm font-bold text-orange-400 min-w-[2rem]">{month}月</span>
              </div>
            </div>
          )}
        </div>

        {/* 地圖容器 */}
        <div id="leaflet-map" ref={mapRef} className="w-full h-[520px] mt-[80px] rounded-2xl overflow-hidden border border-gray-800" />

        {/* 側邊資訊面板 */}
        <div className={`info-sidebar ${mode === 'population' ? 'mode-population' : 'mode-time'} ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              {mode === 'population' ? '🌱 植被溫度分析' : '⏰ 時間溫度預測'}
            </div>
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
                    <div>row_id: <strong>{rowId}</strong></div>
                    <div>column_id: <strong>{colId}</strong></div>
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
                      <div>年月: {apiData?.metadata?.year ?? '—'} / {apiData?.metadata?.month ?? '—'}</div>
                      {typeof flaskTemp === 'number' ? (
                        <div className="temp">🌡️ 溫度: <strong>{flaskTemp.toFixed(1)} °C</strong></div>
                      ) : (
                        <div>🌡️ 溫度: —</div>
                      )}
                      {mode === 'population' && (
                        <div>植被: {apiData?.metadata?.vegetation ?? '—'}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* 模式特定資訊 */}
                <div className="section">
                  <h4 className="section-title">
                    {mode === 'population' ? '🌱 植被影響' : '⏰ 時間變化'}
                  </h4>
                  <div className="mode-info">
                    {mode === 'population' ? (
                      <div>
                        <div>當前設定: {veg}% 植被覆蓋</div>
                        <div className="info-text">植被越高 → 降溫效果越明顯</div>
                      </div>
                    ) : (
                      <div>
                        <div>
                          {activeSlider === 'past' ? (
                            <span className="info-text">📊 基於 {pastYear} 年歷史資料</span>
                          ) : (
                            <span className="info-text">🔮 預測至 {futureYear} 年</span>
                          )}
                        </div>
                        <div className="info-text">
                          {activeSlider === 'past' 
                            ? '回顧過去溫度變化趨勢' 
                            : '基於氣候模型預測未來'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`
        absolute top-[45px] right-[10px] w-[320px] h-[calc(100%-100px)] rounded-lg text-xs
        transform transition-transform duration-300 ease-in-out z-[1000]
        shadow-[0_0_20px_rgba(0,212,255,0.3)] font-mono backdrop-blur-md
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-[calc(100%+35px)]'}
        ${mode === 'population'
          ? 'bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0f1419] border-2 border-[#00d4ff] text-[#00d4ff]'
          : 'bg-gradient-to-br from-[#0a0e27] via-[#2d1f3a] to-[#1a0f19] border-2 border-[#ff6b9d] text-[#ff6b9d]'
        }
        lg:right-0 lg:w-[94%]
      `}>
        <div className="
          p-[15px] border-b-2 border-current bg-white/5 flex justify-between items-center relative
          before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-current before:to-transparent
          after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-current after:to-transparent after:opacity-50
        ">
          <div className="text-sm font-bold uppercase tracking-wide text-shadow-[0_0_10px_currentColor]">
            {mode === 'population' ? '🌱 植被溫度分析' : '⏰ 時間溫度預測'}
          </div>
          <button
            className="
              bg-transparent border border-current text-current text-base w-[28px] h-[28px]
              rounded-md cursor-pointer transition-all duration-200 flex items-center justify-center
              hover:bg-current hover:text-[#0a0e27] hover:shadow-[0_0_15px_currentColor]
            "
            onClick={closeSidebar}
            aria-label="關閉側欄"
          >
            ×
          </button>
        </div>

        <div className="p-[15px] h-[calc(100%-70px)] overflow-y-auto">
          {!currentFeature && <div className="text-center text-white/85 mt-[30px] text-sm">點擊任一網格查看資料 📍</div>}

          {currentFeature && (
            <div>
              {/* 基本位置資訊 */}
              <div className="mb-5 bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="text-sm mb-2 font-bold text-current text-shadow-[0_0_5px_currentColor]">📍 位置資訊</h4>
                <div className="grid gap-1.5 text-xs">
                  <div className="text-white/90">row_id: <strong className="text-current font-bold">{rowId}</strong></div>
                  <div className="text-white/90">column_id: <strong className="text-current font-bold">{colId}</strong></div>
                  <div className="text-white/90">經緯度: {centerLL ? `${centerLL.lat.toFixed(4)}, ${centerLL.lng.toFixed(4)}` : '—'}</div>
                </div>
              </div>


              {/* Flask API 資料 */}
              <div className="mb-5 bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="text-sm mb-2 font-bold text-current text-shadow-[0_0_5px_currentColor]">🔗 溫度資訊</h4>
                {apiLoading ? (
                  <div className="text-center text-white/70 italic">讀取中…</div>
                ) : apiError ? (
                  <div className="bg-red-500/10 p-2.5 rounded-md border border-red-500/30">
                    <div className="text-red-400 text-xs mb-2">錯誤：{apiError}</div>
                    {!!triedUrls.length && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[10px] text-white/60 mb-1.5">檢視嘗試過的網址</summary>
                        <div className="text-[9px] text-white/50 max-h-20 overflow-y-auto bg-black/30 p-1.5 rounded-sm">
                          {triedUrls.slice(0, 5).map((u, i) => <div key={i} className="mb-0.5 break-all">{u}</div>)}
                          {triedUrls.length > 5 && <div>...還有 {triedUrls.length - 5} 個</div>}
                        </div>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-white/90">
                    <div className="mb-1.5">年月: {apiData?.metadata?.year ?? '—'} / {apiData?.metadata?.month ?? '—'}</div>
                    {typeof flaskTemp === 'number' ? (
                      <div className="text-lg font-bold text-current text-shadow-[0_0_8px_currentColor]">🌡️ 溫度: <strong>{flaskTemp.toFixed(1)} °C</strong></div>
                    ) : (
                      <div>🌡️ 溫度: —</div>
                    )}
                    {mode === 'population' && (
                      <div>植被: {apiData?.metadata?.vegetation ?? '—'}</div>
                    )}
                  </div>
                )}
              </div>

              {/* 模式特定資訊 */}
              <div className="mb-5 bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="text-sm mb-2 font-bold text-current text-shadow-[0_0_5px_currentColor]">
                  {mode === 'population' ? '🌱 植被影響' : '⏰ 時間變化'}
                </h4>
                <div className="text-xs text-white/80">
                  <div className="mb-1.5">
                    {mode === 'population' ? (
                      <div>當前設定: {veg}% 植被覆蓋</div>
                    ) : (
                      <div>
                        {activeSlider === 'past' ? (
                          <span className="italic text-white/70 text-[10px]">📊 基於 {pastYear} 年歷史資料</span>
                        ) : (
                          <span className="italic text-white/70 text-[10px]">🔮 預測至 {futureYear} 年</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="italic text-white/70 text-[10px]">
                    {mode === 'population' ? (
                      '植被越高 → 降溫效果越明顯'
                    ) : (
                      activeSlider === 'past'
                        ? '回顧過去溫度變化趨勢'
                        : '基於氣候模型預測未來'
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
