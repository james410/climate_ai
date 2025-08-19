'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import type { Feature, FeatureCollection, GeoJsonProperties, Polygon, MultiPolygon } from 'geojson';
import L, { GeoJSON as LGeoJSON, LatLng, LeafletMouseEvent, Layer } from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ✅ 新增：給每個格子一個穩定 ID（優先用 properties.id，否則用 row_id-column_id）
function getFeatureId(f: GridFeature) {
  const p = (f?.properties || {}) as any;
  return p.id ?? `${p.row_id ?? 'r'}-${p.column_id ?? 'c'}`;
}

// ✅ 新增：樣式常數
const HOVER_YELLOW = '#FFD54A'; // 滑鼠移入用的顏色
const DEFAULT_STROKE = '#c9c9c9ff'; // 一般邊框色
// 顏色定義
// ====== Add: helpers for temp → percentile → color ======
function toMonthTemp(feature: GridFeature, m: number): number | undefined {
  return getMonthTemp(feature, m);
}
function computeMinMax(features: GridFeature[], m: number) {
  let min = Infinity, max = -Infinity;
  for (const f of features) {
    const v = toMonthTemp(f, m);
    if (typeof v === 'number') {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 0.5, max: max + 0.5 }; // 避免除以 0
  return { min, max };
}
function toPercent(v: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}
function colorByPercent(p: number) {
  // 低 → 高：0—24 / 25—49 / 50—74 / 75—100
  if (p < 25) return '#EAB090';   // 淺桃橘
  if (p < 50) return '#E27777';   // 葡萄柚橙
  if (p < 75) return '#AE567D';   // 玫瑰紅
  return '#724B80';               // 深紫
}

// ========== Types ==========
type GridFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties & Record<string, unknown>>;

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

export default function MapSection() {
  // ✅ 所有 Hooks 都在頂層，在任何條件性返回之前
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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
    [0.8, 1, 0.3, 0.3]
  );

  const titleX = useTransform(
    scrollYProgress,
    [0.1, 0.4, 0.6],
    [0, 0, 350]
  );

  const titleY = useTransform(
    scrollYProgress,
    [0.1, 0.4, 0.6],
    [0, 0, -280]
  );

  const descriptionOpacity = useTransform(
    scrollYProgress,
    [0.1, 0.3, 0.4, 0.5],
    [0, 1, 1, 0]
  );


  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  // ✅ 新增：用 ref 同步最新的 selectedCellId，避免事件閉包讀到舊值



  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedCellId;
  }, [selectedCellId]);

  // 放「選取的黑色外框」的圖層
  const selectionLayerRef = useRef<L.FeatureGroup | null>(null);


  // ===== UI State =====
  const [mode, setMode] = useState<'population' | 'time'>('time');
  const [veg, setVeg] = useState<number>(50);
  const [month, setMonth] = useState<number>(1);
  const [pastYear, setPastYear] = useState<number>(2013);
  const [futureYear, setFutureYear] = useState<number>(2025);
  const [activeSlider, setActiveSlider] = useState<'past' | 'future'>('past');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [currentFeature, setCurrentFeature] = useState<GridFeature | null>(null);
  const [hintHidden, setHintHidden] = useState<boolean>(false);
  const [centerLL, setCenterLL] = useState<LatLng | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);

  // 讓事件處理器永遠讀到「最新的月份、資料、選取狀態」
  const monthRef = useRef(month);
  useEffect(() => { monthRef.current = month; }, [month]);

  const geoJsonDataRef = useRef<FeatureCollection | null>(null);
  useEffect(() => { geoJsonDataRef.current = geoJsonData; }, [geoJsonData]);


  // ===== Effects / visibility =====
  //const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false });

  // ===== Leaflet Refs =====
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gridLayerRef = useRef<LGeoJSON | null>(null);

  // ===== Derived values =====
  const baseTemp = useMemo(() => getMonthTemp(currentFeature, month), [currentFeature, month]);
  const vegPredicted = useMemo(() => {
    if (typeof baseTemp !== 'number') return undefined;
    // 簡單示意：植被越高 -> 降溫（±2°C 範圍）
    const predicted = baseTemp + (2 - 4 * (veg / 100));
    return Number.isFinite(predicted) ? Number(predicted.toFixed(1)) : undefined;
  }, [baseTemp, veg]);
  const timePredicted = useMemo(() => {
    const t = getMonthTemp(currentFeature, month);
    if (typeof t !== 'number') return undefined;

    // 根據選擇的時間範圍計算預測溫度
    let yearModifier = 0;
    if (activeSlider === 'past') {
      // 過去年份：2013-2023，溫度變化 -1°C 到 +1°C
      yearModifier = ((pastYear - 2013) / 10) * 2 - 1; // 線性變化 -1°C 到 +1°C
    } else {
      // 未來年份：2025-2035，溫度上升 +1°C 到 +3°C
      yearModifier = 1 + ((futureYear - 2025) / 10) * 2; // 線性變化 +1°C 到 +3°C
    }

    const predicted = t + yearModifier;
    return Number.isFinite(predicted) ? Number(predicted.toFixed(1)) : undefined;
  }, [currentFeature, month, pastYear, futureYear, activeSlider]);

  // ===== 計算溫度範圍並更新圖層顏色 =====
  const updateLayerColors = useMemo(() => {
    if (!geoJsonData || !gridLayerRef.current) return;

    const features = geoJsonData.features as GridFeature[];
    const { min, max } = computeMinMax(features, month);

    gridLayerRef.current.eachLayer((layer: any) => {
      const feature = layer.feature as GridFeature;
      const temp = toMonthTemp(feature, month);

      if (typeof temp === 'number') {
        const percent = toPercent(temp, min, max);
        const color = colorByPercent(percent);

        layer.setStyle({
          color: '#f59e0b',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.7
        });
      } else {
        // 沒有溫度資料的格子設為透明
        layer.setStyle({
          color: '#f59e0b',
          weight: 2,
          fillColor: 'transparent',
          fillOpacity: 0
        });
      }
    });
  }, [geoJsonData, month]);

  // 執行顏色更新
  useEffect(() => {
    //applyLayerColors(); // ✅ 真的呼叫
    applyLayerColorsRef.current();
  }, [geoJsonData, month, selectedCellId]);

  // 提供給事件回調呼叫的「最新」上色函式

  const applyLayerColorsRef = useRef<() => void>(() => { });
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
        const temp = toMonthTemp(f, m);
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
  });




  const openSidebar = () => {
    setSidebarOpen(true);
    setHintHidden(true);
  };
  const closeSidebar = () => {
    setSidebarOpen(false);
    setCurrentFeature(null);
    setCenterLL(null);
    setHintHidden(false);

    selectionLayerRef.current?.clearLayers(); // 移除黑色外框
    setSelectedCellId(null);
  };

  // ===== Init Leaflet map / load GeoJSON =====
  useEffect(() => {
    if (mapInstanceRef.current) return;        // 保險：已建就不再建
    const el = mapRef.current;
    if (!el) return;                           // 容器尚未掛載

    // 延後到下一個 frame，確保 DOM/尺寸都 ready
    const raf = requestAnimationFrame(() => {
      // 二次檢查（避免在 raf 期間被卸載）
      if (mapInstanceRef.current || !mapRef.current) return;


      const TPE_BOUNDS = L.latLngBounds(
        [24.50, 120.85], // 南西角 (lat, lng)
        [25.40, 122.35]  // 北東角
      );

      const map = L.map(el, {
        center: [25.0200, 121.5845], zoom: 12, minZoom: 9, maxBounds: TPE_BOUNDS.pad(0.02), // 可平移範圍（pad 讓邊界稍微寬一點點）
        maxBoundsViscosity: 1.0,         // 黏性=1 會像碰到牆壁一樣推不出去
        worldCopyJump: false
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);


      mapInstanceRef.current = map;

      // === ➊ 建立一個 pane 專放陰影，放在底圖上方、圖層上方之下 ===
      map.createPane('hillshadePane');
      const hp = map.getPane('hillshadePane')!;
      hp.style.zIndex = '350';                // tilePane(200) < 這個(350) < overlayPane(400)
      hp.style.pointerEvents = 'none';        // 不擋滑鼠
      hp.style.mixBlendMode = 'multiply';     // 與底圖相乘，像真實陰影
      hp.style.opacity = '0.85';

      // === ➋ 加入 Esri 世界陰影瓦片（免運算、立刻可用）===
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
        {
          pane: 'hillshadePane',
          attribution: 'Esri World Hillshade',
          maxZoom: 19
        }
      ).addTo(map);

      // 建立一個最高層的 pane 專門放選取框
      map.createPane('selectedPane');
      const sp = map.getPane('selectedPane')!;
      sp.style.zIndex = '1000';           // 比 overlayPane(400) 高很多
      sp.style.pointerEvents = 'none';    // 不攔截滑鼠事件

      // 建立一個 FeatureGroup 來放「黑色外框」，掛在 selectedPane
      selectionLayerRef.current = L.featureGroup([], { pane: 'selectedPane' }).addTo(map);

      fetch('/data/grid.geojson')
        .then(r => r.json())
        .then((geojson: FeatureCollection) => {
          setGeoJsonData(geojson); // 儲存 GeoJSON 資料

          const features = geojson.features as GridFeature[];
          const { min, max } = computeMinMax(features, 1); // 預設使用第1個月

          const gridLayer = L.geoJSON(geojson as any, {
            style: (feature: any) => {
              const temp = toMonthTemp(feature, 1); // 預設使用第1個月

              if (typeof temp === 'number') {
                const percent = toPercent(temp, min, max);
                const color = colorByPercent(percent);

                return {
                  color: '#f59e0b',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.7
                };
              } else {
                return {
                  color: '#f59e0b',
                  weight: 2,
                  fillColor: 'transparent',
                  fillOpacity: 0
                };
              }
            },
            onEachFeature: (feature: any, layer: any) => {

              layer.on('click', (e: any) => {
                const lf = e.target?.feature;
                if (!lf) return;
                // ✅ 新增：記錄目前選取的格子 ID
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
                openSidebar();

                // 1) 清掉上一個選取框
                selectionLayerRef.current?.clearLayers();

                // 2) 以同一個 feature 畫「只有外框」的圖層到 selectedPane
                L.geoJSON(lf as any, {
                  pane: 'selectedPane',
                  style: {
                    color: 'black',
                    weight: 2,
                    fill: false,         // 很重要：不要填色，避免遮住底下配色
                    fillOpacity: 0,
                    opacity: 1,
                    interactive: false,  // 不吃事件，滑鼠事件仍由底層格子處理
                  },
                }).addTo(selectionLayerRef.current!);

              });

              // ✅ 新增：點擊時設定選取的格子 ID（不取代你原本 click，而是再加一個）
              layer.on('click', () => {
                try {
                  const fid = getFeatureId(layer.feature as GridFeature);
                  setSelectedCellId(fid);
                } catch { }
                applyLayerColorsRef.current();; // 立刻反映黑框
              });
              // ✅ 新增：當滑出圖層時，用集中樣式函式把狀態拉回一致（避免 hover 留色）
              layer.on('mouseout', () => {
                applyLayerColorsRef.current();;
              });

              // ✅ 新增：若滑入的是已選取的格子，維持選取樣式（避免被 hover 覆蓋）
              layer.on('mouseover', (e: L.LeafletMouseEvent) => {
                const f = layer.feature as GridFeature;
                const fid = getFeatureId(layer.feature as GridFeature);

                if (selectedIdRef.current && fid === selectedIdRef.current) {
                  applyLayerColorsRef.current();; // 保險：確保樣式一致
                  return;
                }

                // 其他格：臨時填黃（只改這一層，不動全域 state）
                (e.target as L.Path).setStyle({
                  fillColor: HOVER_YELLOW,
                  fillOpacity: 0.9,
                  // 邊框維持原本橘色與粗細，避免干擾你已設計的視覺
                  // 若想強一點，也可在此暫時加 weight: 3
                });

              });

            },

          }).addTo(map);

          gridLayerRef.current = gridLayer;
          applyLayerColorsRef.current();; // ✅ 新增：地圖載好後先套一次樣式
          try {
            const b = gridLayer.getBounds();
            if (b.isValid()) map.fitBounds(b, { padding: [10, 10] });
            map.panBy([-200, 0]); // 向左平移 100 像素
          } catch { }
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

  return (
    <section ref={sectionRef} className="min-h-screen py-12 px-6 bg-gray-900 relative">
      <div className="max-w-7xl mx-auto">
        {/* 標題（保留原有進場特效） */}
        {/* <div className="sticky top-0 h-screen flex items-center justify-center"> */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-black text-white mb-4">Heat Island 熱島效應</h2>
          <p className="text-xl text-gray-400">Live Monitoring 即時監測</p>
        </motion.div>
        {/* </div> */}

        {/* 模式切換（保留樣式，替換為兩種模式） */}
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

          {/* 溫度圖例 - 橫向布局 */}
          <div className="absolute top-4 right-4 z-10 bg-black/80 rounded-lg px-4 py-3 text-white text-xs">
            <div className="flex items-center gap-4">
              <span className="font-bold">溫度圖例 ({month}月)</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EAB090' }}></div>
                  <span className="text-xs">低溫</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E27777' }}></div>
                  <span className="text-xs">中低溫</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#AE567D' }}></div>
                  <span className="text-xs">中高溫</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#724B80' }}></div>
                  <span className="text-xs">高溫</span>
                </div>
              </div>
            </div>
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
              {!currentFeature && <div className="no-selection">點擊任一網格查看資料 🔍</div>}

              {currentFeature && mode === 'population' && (
                <div id="populationContent">
                  <h4 className="section-title">🌱 植被覆蓋率 → 溫度</h4>
                  <div className="control-group">
                    <label htmlFor="vegSlider">植被覆蓋率（%）：</label>
                    <div className="slider-container">
                      <input
                        id="vegSlider"
                        type="range"
                        className="slider"
                        min={0}
                        max={100}
                        step={1}
                        value={veg}

                        onChange={(e) => {
                          e.preventDefault();
                          setVeg(Number(e.target.value));
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                      />
                      <div className="slider-value">{veg}%</div>
                    </div>
                  </div>
                  <div className="result-display">
                    <div>
                      格子中心：
                      <span>{centerLL ? centerLL.lat.toFixed(4) : '--'}</span>,
                      <span> {centerLL ? centerLL.lng.toFixed(4) : '--'}</span>
                    </div>
                    <div>
                      當月溫度：<span>{typeof baseTemp === 'number' ? baseTemp.toFixed(1) : '--'}</span> °C
                    </div>
                    <div className="temp">🌡️ 預測溫度：<span>{vegPredicted ?? '--'}</span> °C</div>
                  </div>
                </div>
              )}

              {currentFeature && mode === 'time' && (
                <div id="timeContent">
                  <h4 className="section-title">⏰ 時間 → 未來溫度</h4>

                  {/* 月份選擇 */}
                  <div className="control-group">
                    <label htmlFor="timeSlider">月份（1~12）：</label>
                    <div className="slider-container">
                      <input
                        id="timeSlider"
                        type="range"
                        className="slider"
                        min={1}
                        max={12}
                        step={1}
                        value={month}

                        onChange={(e) => {
                          e.preventDefault();
                          setMonth(Number(e.target.value));
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                      />
                      <div className="slider-value">當前：<span>{month}</span> 月</div>
                    </div>
                  </div>

                  {/* 年份範圍選擇 */}
                  <div className="year-selector">
                    <h5 className="year-title">選擇年份範圍：</h5>

                    {/* 過去年份 2013-2023 */}
                    <div className="year-option">
                      <div className="radio-container">
                        <input
                          type="radio"
                          id="pastRange"
                          name="yearRange"
                          checked={activeSlider === 'past'}
                          onChange={() => setActiveSlider('past')}
                          className="radio-input"
                        />
                        <label htmlFor="pastRange" className="radio-label">
                          📊 歷史資料 (2013-2023)
                        </label>
                      </div>
                      <div className="slider-container">
                        <input
                          type="range"
                          className={`slider ${activeSlider !== 'past' ? 'disabled' : ''}`}
                          min={2013}
                          max={2023}
                          step={1}
                          value={pastYear}
                          onChange={(e) => {
                            e.preventDefault();
                            if (activeSlider === 'past') {
                              setPastYear(Number(e.target.value));
                            }
                          }}
                          onMouseDown={(e) => {
                            if (activeSlider !== 'past') {
                              e.preventDefault();
                            }
                          }}

                          disabled={activeSlider !== 'past'}
                        />
                        <div className="slider-value">
                          {activeSlider === 'past' ? pastYear : '---'} 年
                        </div>
                      </div>
                    </div>

                    {/* 未來年份 2025-2035 */}
                    <div className="year-option">
                      <div className="radio-container">
                        <input
                          type="radio"
                          id="futureRange"
                          name="yearRange"
                          checked={activeSlider === 'future'}
                          onChange={() => setActiveSlider('future')}
                          className="radio-input"
                        />
                        <label htmlFor="futureRange" className="radio-label">
                          🔮 未來預測 (2025-2035)
                        </label>
                      </div>
                      <div className="slider-container">
                        <input
                          type="range"
                          className={`slider ${activeSlider !== 'future' ? 'disabled' : ''}`}
                          min={2025}
                          max={2035}
                          step={1}
                          value={futureYear}
                          onChange={(e) => {
                            e.preventDefault();
                            if (activeSlider === 'future') {
                              setFutureYear(Number(e.target.value));
                            }
                          }}
                          onMouseDown={(e) => {
                            if (activeSlider !== 'future') {
                              e.preventDefault();
                            }
                          }}

                          disabled={activeSlider !== 'future'}
                        />
                        <div className="slider-value">
                          {activeSlider === 'future' ? futureYear : '---'} 年
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="result-display">
                    <div>
                      格子中心：
                      <span>{centerLL ? centerLL.lat.toFixed(4) : '--'}</span>,
                      <span> {centerLL ? centerLL.lng.toFixed(4) : '--'}</span>
                    </div>
                    {/* <div>
                      基準溫度：<span>{typeof baseTemp === 'number' ? baseTemp.toFixed(1) : '--'}</span> °C
                    </div> */}
                    <div className="temp">🌡️ 溫度：<span>{timePredicted ?? '--'}</span> °C</div>
                    <div className="year-info">
                      {activeSlider === 'past' ? (
                        <span className="info-text">📊 基於 {pastYear} 年歷史資料</span>
                      ) : (
                        <span className="info-text">🔮 預測至 {futureYear} 年</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .info-sidebar { 
          position: absolute; 
          top: 45px; 
          right: 10px; 
          width: 320px; 
          height: calc(100% - 100px); 
          border-radius: 8px; 
          font-size: 12px; 
          transform: translateX(calc(100% + 35px)); 
          transition: transform 0.3s ease; 
          z-index: 1000; 
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.3); 
          font-family: 'Courier New', monospace; 
          backdrop-filter: blur(10px); 
        }
        .info-sidebar.open { 
          transform: translateX(0); 
        }
        .info-sidebar.mode-population { 
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%); 
          border: 2px solid #00d4ff; 
          color: #00d4ff; 
        }
        .info-sidebar.mode-time { 
          background: linear-gradient(135deg, #0a0e27 0%, #2d1f3a 50%, #1a0f19 100%); 
          border: 2px solid #ff6b9d; 
          color: #ff6b9d; 
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
          top: 0; 
          left: 0; 
          right: 0; 
          height: 2px; 
          background: linear-gradient(90deg, transparent, currentColor, transparent); 
        }
        .sidebar-header::after { 
          content: ''; 
          position: absolute; 
          bottom: 0; 
          left: 0; 
          right: 0; 
          height: 1px; 
          background: linear-gradient(90deg, transparent, currentColor, transparent); 
          opacity: 0.5; 
        }
        .sidebar-title { 
          font-size: 14px; 
          font-weight: bold; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
          text-shadow: 0 0 10px currentColor; 
        }
        .close-btn { 
          background: transparent; 
          border: 1px solid currentColor; 
          color: currentColor; 
          font-size: 16px; 
          width: 28px; 
          height: 28px; 
          border-radius: 4px; 
          cursor: pointer; 
          transition: all 0.2s; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }
        .close-btn:hover { 
          background: currentColor; 
          color: #0a0e27; 
          box-shadow: 0 0 15px currentColor; 
        }
        .sidebar-content { 
          padding: 15px; 
          height: calc(100% - 70px); 
          overflow-y: auto; 
        }
        .no-selection { 
          text-align: center; 
          font-size: 14px; 
          color: rgba(255,255,255,0.85); 
          margin-top: 30px; 
        }
        .section-title {
          font-size: 13px;
          margin-bottom: 15px;
          font-weight: bold;
        }
        .control-group { 
          margin: 12px 0; 
          background: rgba(255,255,255,0.1); 
          padding: 10px; 
          border-radius: 8px; 
        }
        .control-group label { 
          display: block; 
          margin-bottom: 8px; 
          font-weight: bold; 
          font-size: 11px; 
        }
        .slider-container { 
          margin: 8px 0; 
        }
        .slider { 
          width: 100%; 
          height: 6px; 
          border-radius: 3px; 
          background: rgba(255,255,255,0.3); 
          outline: none; 
          -webkit-appearance: none; 
        }
        .slider::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          appearance: none; 
          width: 16px; 
          height: 16px; 
          border-radius: 50%; 
          background: white; 
          cursor: pointer; 
          box-shadow: 0 1px 4px rgba(0,0,0,0.2); 
        }
        .slider-value { 
          text-align: center; 
          font-size: 14px; 
          font-weight: bold; 
          margin-top: 8px; 
          background: rgba(255,255,255,0.2); 
          padding: 6px; 
          border-radius: 4px; 
        }
        .result-display { 
          background: rgba(255,255,255,0.1); 
          padding: 10px; 
          border-radius: 8px; 
          margin-top: 12px; 
          text-align: center; 
        }
        .result-display .temp { 
          font-size: 1.5em; 
          font-weight: bold; 
          margin: 8px 0; 
        }
        .year-selector {
          background: rgba(255,255,255,0.05);
          padding: 12px;
          border-radius: 8px;
          margin: 12px 0;
        }
        .year-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.9);
        }
        .year-option {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(255,255,255,0.03);
          border-radius: 6px;
        }
        .radio-container {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
        }
        .radio-input {
          margin-right: 8px;
          transform: scale(1.2);
          accent-color: currentColor;
        }
        .radio-label {
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
        }
        .slider.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .slider.disabled::-webkit-slider-thumb {
          cursor: not-allowed;
          background: #666;
        }
        .year-info {
          margin-top: 8px;
          text-align: center;
        }
        .info-text {
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          font-style: italic;
        }

        @media (max-width: 1024px) {
          .info-sidebar { 
            right: 0; 
            width: 94%; 
          }
        }
      `}</style>
    </section>
  );
}