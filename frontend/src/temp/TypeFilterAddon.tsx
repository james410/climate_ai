// src/temp/TypeFilterAddon.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Feature, Polygon, MultiPolygon, GeoJsonProperties } from 'geojson';
import type L from 'leaflet';

// 與你的 index.tsx 一致的型別
type GridFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties & Record<string, unknown>>;
type ColorMode = 'temperature' | 'type';

type Props = {
  // 這些全部從你既有的 index.tsx 傳進來
  colorModeRef: MutableRefObject<ColorMode>;
  applyLayerColorsRef: MutableRefObject<() => void>;
  gridLayerRef: MutableRefObject<L.GeoJSON | null>;
  selectedIdRef: MutableRefObject<string | null>;
  getTypeForFeature: (f: GridFeature) => string | undefined;
  normalizeType: (s: string) => string;
  getColorForType: (t?: string) => string;
  DEFAULT_STROKE: string;
};

/**
 * 臨時「僅顯示某類型」外掛：
 * - 掛載時包裝 applyLayerColorsRef.current，在類型模式下套用篩選著色
 * - 卸載時自動還原原本的 applyLayerColorsRef.current
 * - 提供一個小小下拉選單 UI（不動你原本的 UI）
 */
export default function TypeFilterAddon({
  colorModeRef,
  applyLayerColorsRef,
  gridLayerRef,
  selectedIdRef,
  getTypeForFeature,
  normalizeType,
  getColorForType,
  DEFAULT_STROKE,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const typeFilterRef = useRef<string | null>(typeFilter);
  useEffect(() => { typeFilterRef.current = typeFilter; applyLayerColorsRef.current(); }, [typeFilter]);

  // 記住原本的著色函式
  const originalApplyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!applyLayerColorsRef.current) return;

    // 保存原本函式，只包一次
    if (!originalApplyRef.current) originalApplyRef.current = applyLayerColorsRef.current;

    // 包裝：在類型模式時，改由這裡處理；否則走原本函式
    applyLayerColorsRef.current = () => {
      const originalApply = originalApplyRef.current!;
      const grid = gridLayerRef.current;

      if (colorModeRef.current !== 'type' || !grid) {
        // 非類型模式 → 用原本邏輯
        originalApply();
        return;
      }

      const filter = typeFilterRef.current && normalizeType(typeFilterRef.current);

      grid.eachLayer((layer: any) => {
        const f = layer.feature as GridFeature;
        const t = getTypeForFeature(f);
        const thisType = t ? normalizeType(t) : undefined;
        const match = !filter || (thisType === filter);

        const isSelected = !!(selectedIdRef.current && getFeatureIdSafe(f) === selectedIdRef.current);

        let fillColor = '#000000';
        let fillOpacity = 0.02; // 非目標類型 → 淡出
        if (t && match) {
          fillColor = getColorForType(t);
          fillOpacity = 0.65;
        }

        (layer as any).setStyle({
          fillColor,
          fillOpacity,
          color: isSelected ? 'black' : DEFAULT_STROKE,
          weight: isSelected ? 6 : 2,
          opacity: match ? 1 : 0.15, // 邊框也一起淡出
        });
      });
    };

    // 卸載時還原
    return () => {
      if (originalApplyRef.current) {
        applyLayerColorsRef.current = originalApplyRef.current;
      }
    };
  }, [
    applyLayerColorsRef,
    gridLayerRef,
    colorModeRef,
    selectedIdRef,
    getTypeForFeature,
    normalizeType,
    getColorForType,
    DEFAULT_STROKE,
  ]);

  return (
    <div className="inline-flex items-center gap-2 ml-2">
      <span className="text-xs text-gray-400">僅顯示：</span>
      <select
        value={typeFilter ?? ''}
        onChange={(e) => setTypeFilter(e.target.value || null)}
        className="bg-transparent border border-gray-700 rounded px-2 py-1 text-xs text-white"
      >
        <option value="">全部</option>
        <option value="mountain">mountain</option>
        <option value="coast">coast</option>
        <option value="city">city</option>
        <option value="suburb">suburb</option>
      </select>
    </div>
  );
}

// 與你 index.tsx 相容的小工具：避免依賴你檔案內部未導出的函式
function getFeatureIdSafe(f: GridFeature) {
  const p = (f?.properties || {}) as any;
  return p.id ?? `${p.row_id ?? 'r'}-${p.column_id ?? 'c'}`;
}
