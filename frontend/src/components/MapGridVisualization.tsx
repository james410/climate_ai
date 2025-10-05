'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';
import L from 'leaflet';
import type { Feature, FeatureCollection, GeoJsonProperties, Polygon, MultiPolygon } from 'geojson';

type GridFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties & Record<string, unknown>>;

interface MapGridVisualizationProps {
  geoJsonData: FeatureCollection | null;
  colorMode: 'temperature' | 'type';
  month: number;
  selectedCellId: string | null;
  typeByCell: Map<string, string>;
  temperatureData?: Map<string, number> | null;
  map?: L.Map; // 新增：傳入地圖實例以獲取縮放資訊
  dragOffset?: { x: number; y: number }; // 新增：拖拽偏移同步
  onCellClick?: (feature: GridFeature, screenPosition: { x: number; y: number }) => void;
  onCellHover?: (feature: GridFeature | null) => void;
}

interface GridPoint {
  x: number;
  y: number;
  row: number;
  col: number;
  feature: GridFeature;
}

interface GradientInfo {
  gradient: CanvasGradient;
  centerX: number;
  centerY: number;
  radius: number;
}

interface GrowingBranch {
  id: string;
  x: number;
  y: number;
  startY: number;
  currentY: number;
  targetY: number;
  opacity: number;
  isFalling: boolean;
  fallSpeed: number;
  branchLength: number;
  branchWidth: number;
  color: string;
  createdTime: number;
}

export default function MapGridVisualization({
  geoJsonData,
  colorMode,
  month,
  selectedCellId,
  typeByCell,
  temperatureData,
  map,
  dragOffset,
  onCellClick,
  onCellHover,
}: MapGridVisualizationProps) {
  const sketchRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const gridPointsRef = useRef<GridPoint[]>([]);
  const gradientsRef = useRef<GradientInfo[]>([]);
  const noiseZsRef = useRef<number[]>([]);
  const growingBranchesRef = useRef<GrowingBranch[]>([]);

  // 將地理座標轉換為螢幕座標的函數 - 精確對齊地形圖，考慮拖拽偏移
  const geoToScreen = (lng: number, lat: number, dragOffset?: { x: number; y: number }) => {
    const container = sketchRef.current?.parentElement;
    if (!container) return { x: 0, y: 0 };

    const containerRect = container.getBoundingClientRect();
    const { width, height } = containerRect;

    // 使用與MapSection完全相同的台北地區邊界座標
    const TPE_BOUNDS = {
      north: 25.299380,
      south: 24.666190,
      east: 122.015500,
      west: 121.297390,
    };

    // 精確的線性轉換 - 與地形圖圖片像素完全對應
    const x = ((lng - TPE_BOUNDS.west) / (TPE_BOUNDS.east - TPE_BOUNDS.west)) * width;
    const y = ((TPE_BOUNDS.north - lat) / (TPE_BOUNDS.north - TPE_BOUNDS.south)) * height;

    // 應用拖拽偏移，讓P5動畫與其他圖層同步移動
    const adjustedX = x + (dragOffset?.x || 0);
    const adjustedY = y + (dragOffset?.y || 0);

    return { x: adjustedX, y: adjustedY };
  };

  // 將顏色轉換為漸變 - 使用HeroSection Three.js配色系統
  const createGradientFromColor = (p: p5, color: string, centerX: number, centerY: number, radius: number) => {
    const gradient = p.drawingContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    const hexColor = color.startsWith('#') ? color : '#' + color;

    // HeroSection Three.js配色系統：青藍色、粉紅色、米色
    const heroColors = {
      primary: '#61c2c2',    // 青藍色 (主要色)
      secondary: '#d18b8b',  // 粉紅色 (次要色)
      accent: '#faebd7'      // 米色 (強調色)
    };

    // 根據顏色決定漸層方向 - 使用HeroSection的溫和漸層
    let startColor, endColor;
    if (hexColor.includes('22c55e') || hexColor.includes('3b82f6')) {
      // 低溫區域：青藍色漸層到米色
      startColor = heroColors.primary + '95';
      endColor = heroColors.accent + '40';
    } else if (hexColor.includes('eab308')) {
      // 中溫區域：青藍色到粉紅色漸層
      startColor = heroColors.primary + '90';
      endColor = heroColors.secondary + '35';
    } else if (hexColor.includes('ef4444') || hexColor.includes('9f2f7c')) {
      // 高溫區域：粉紅色到米色漸層
      startColor = heroColors.secondary + '85';
      endColor = heroColors.accent + '30';
    } else {
      // 預設漸層：青藍色到米色
      startColor = heroColors.primary + '90';
      endColor = heroColors.accent + '35';
    }

    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    return gradient;
  };

  // 獲取特徵的顏色
  const getFeatureColor = (feature: GridFeature): string => {
    const rowId = (feature.properties as any)?.row_id;
    const colId = (feature.properties as any)?.column_id;
    const key = rowId && colId ? `${rowId}-${colId}` : '';

    if (colorMode === 'type') {
      if (key) {
        const type = typeByCell.get(key);
        const typeColors: Record<string, string> = {
          mountain: '#22c55e',
          coast: '#3b82f6',
          city: '#ef4444',
          suburb: '#eab308',
        };
        return typeColors[type || 'default'] || '#9ca3af';
      }
      return '#9ca3af';
    } else {
      // 溫度顏色
      if (key && temperatureData) {
        const temp = temperatureData.get(key);
        if (typeof temp === 'number') {
          const percent = Math.max(0, Math.min(100, ((temp - 15) / 20) * 100));
          if (percent < 25) return '#ddab17';
          if (percent < 50) return '#eb7846';
          if (percent < 75) return '#cd3e5d';
          return '#9f2f7c';
        }
      }
      return '#9ca3af';
    }
  };

  // 產生雜訊圓形 - 優化計算效能
  const noisyCircle = (p: p5, radius: number, noiseZ: number) => {
    const vertices = 36; // 減少頂點數量從 72 到 36
    p.beginShape();
    for (let i = 0; i < vertices; i++) {
      const angle = (i / vertices) * p.TWO_PI;
      const noiseValue = p.noise(p.cos(angle) * 0.5 + noiseZ, p.sin(angle) * 0.5 + noiseZ);
      const r = radius + noiseValue * 15 - 7.5; // 減少雜訊強度
      const x = p.cos(angle) * r;
      const y = p.sin(angle) * r;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);
  };

  // 繪製科技感流線脈衝標記
  const drawTechPulsingMarkers = (p: p5, gridPoints: GridPoint[], time: number) => {
    // 只選擇約15%的網格點顯示科技脈衝標記
    const markerCount = Math.floor(gridPoints.length * 0.15);

    for (let i = 0; i < markerCount; i++) {
      const pointIndex = i * 7; // 每7個點選擇一個，創造更有節奏的分佈
      if (pointIndex >= gridPoints.length) break;

      const point = gridPoints[pointIndex];

      // 使用更平滑的脈衝函數 - 科技感曲線
      const smoothPulse = (p.sin(time * 1.5 + i * 0.6) + 1) * 0.5; // 更平滑的脈衝
      const techCurve = p.pow(smoothPulse, 2) * (3 - 2 * smoothPulse); // 緩動曲線

      // 科技感大小變化 - 更細膩的縮放
      const baseSize = 4;
      const maxExpansion = 12;
      const size = baseSize + techCurve * maxExpansion;

      // 科技藍色漸層透明度
      const alpha = Math.floor(techCurve * 120 + 80); // 80-200透明度

      p.push();
      p.translate(point.x, point.y);

      // 內圈 - HeroSection青藍色高亮核心
      p.fill(97, 194, 194, alpha * 1.8); // 青藍色 #61c2c2 高亮
      p.noStroke();
      p.ellipse(0, 0, size * 0.5, size * 0.5);

      // 中圈 - 粉紅色溫和光暈
      p.fill(209, 139, 139, alpha * 0.9); // 粉紅色 #d18b8b 光暈
      p.ellipse(0, 0, size * 0.8, size * 0.8);

      // 外圈 - 米色柔和光環
      p.fill(250, 235, 215, alpha * 0.4); // 米色 #faebd7 微光
      p.ellipse(0, 0, size * 1.2, size * 1.2);

      // 最外圈 - 極淡的青藍色擴散效果
      p.fill(97, 194, 194, alpha * 0.2); // 青藍色擴散
      p.ellipse(0, 0, size * 1.6, size * 1.6);

      p.pop();
    }
  };

  // 繪製持續的隨機動畫效果 - 只選擇約30%的網格點進行動畫
  const drawContinuousAnimation = (p: p5, gridPoints: GridPoint[], time: number) => {
    // 只選擇部分網格點進行動畫（約30%的網格點）
    const animatedCount = Math.floor(gridPoints.length * 0.3);
    const stepSize = Math.floor(gridPoints.length / animatedCount);

    p.noFill();

    for (let i = 0; i < animatedCount; i++) {
      const pointIndex = i * stepSize;
      if (pointIndex >= gridPoints.length) break;

      const point = gridPoints[pointIndex];

      // 每個動畫點都有獨立的開始時間，創造持續效果
      const baseTime = time + i * 0.5; // 每個點延遲0.5秒開始
      const cycle = baseTime % (p.TWO_PI * 2);
      const progress = Math.max(0, Math.min(1, (cycle / p.TWO_PI))); // 0到1的進度

      if (progress > 0 && progress < 1) { // 只在生長階段顯示
        p.push();
        p.translate(point.x, point.y);

        // 根據動畫進度決定顏色和透明度
        const intensity = progress; // 0到1的強度
        const alpha = Math.floor(intensity * 180 + 75); // 75-255的透明度

        // 使用HeroSection Three.js配色系統
        const colorIndex = i % 3;
        switch (colorIndex) {
          case 0:
            p.stroke(97, 194, 194, alpha); // 青藍色 #61c2c2
            break;
          case 1:
            p.stroke(209, 139, 139, alpha); // 粉紅色 #d18b8b
            break;
          case 2:
            p.stroke(250, 235, 215, alpha); // 米色 #faebd7
            break;
        }

        p.strokeWeight(3 + intensity * 2); // 線條寬度隨進度增加 3-5px

        // 繪製主線條
        const lineLength = progress * 45; // 最多45像素長
        p.line(0, 0, 0, -lineLength);

        // 添加動態側枝
        if (progress > 0.4) {
          const sideBranchProgress = (progress - 0.4) / 0.6; // 側枝生長進度
          const sideBranchLength = sideBranchProgress * 15;

          p.push();
          p.rotate(p.sin(baseTime * 2) * 0.8); // 擺動效果
          p.line(0, -lineLength * 0.3, sideBranchLength, -lineLength * 0.3);
          p.pop();
        }

        p.pop();
      }
    }
  };



  // 創建一個引用來存儲當前的拖拽偏移，讓內部函數可以訪問
  const dragOffsetRef = useRef(dragOffset || { x: 0, y: 0 });

  useEffect(() => {
    dragOffsetRef.current = dragOffset || { x: 0, y: 0 };
  }, [dragOffset]);

  useEffect(() => {
    if (!sketchRef.current || !geoJsonData) return;

    const sketch = (p: p5) => {
      let gridPoints: GridPoint[] = [];
      let gradients: GradientInfo[] = [];
      let noiseZs: number[] = [];
      let growingBranches: GrowingBranch[] = [];
      let lastBranchCreation = 0;
      let lastDragOffset = { x: 0, y: 0 }; // 追蹤拖拽偏移變化

      // 計算網格點座標的函數 - 在繪圖循環中調用以應用最新拖拽偏移
      const calculateGridPoints = (currentDragOffset?: { x: number; y: number }) => {
        const features = geoJsonData.features as GridFeature[];
        const newGridPoints: GridPoint[] = [];
        const newGradients: GradientInfo[] = [];
        const newNoiseZs: number[] = [];

        features.forEach((feature, index) => {
          const geometry = feature.geometry;
          if (geometry.type === 'Polygon') {
            const coordinates = geometry.coordinates[0];

            // 計算多邊形的邊界範圍來確定中心點
            let minLng = Infinity, maxLng = -Infinity;
            let minLat = Infinity, maxLat = -Infinity;

            coordinates.forEach(coord => {
              const [lng, lat] = coord;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            });

            // 使用邊界中心點作為格點位置
            const centroidLng = (minLng + maxLng) / 2;
            const centroidLat = (minLat + maxLat) / 2;

            // 在繪圖循環中應用最新的拖拽偏移
            const screenPos = geoToScreen(centroidLng, centroidLat, currentDragOffset);

            newGridPoints.push({
              x: screenPos.x,
              y: screenPos.y,
              row: (feature.properties as any)?.row_id || index,
              col: (feature.properties as any)?.column_id || index,
              feature,
            });

            const color = getFeatureColor(feature);
            const gradient = createGradientFromColor(p, color, screenPos.x, screenPos.y, 50);
            if (gradient) {
              newGradients.push({
                gradient,
                centerX: screenPos.x,
                centerY: screenPos.y,
                radius: 50,
              });
            }

            newNoiseZs.push(p.random(100, 500));
          }
        });

        return { newGridPoints, newGradients, newNoiseZs };
      };

      p.setup = () => {
        const container = sketchRef.current?.parentElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        p.createCanvas(containerRect.width, containerRect.height);

        // 初始化網格點（使用空的拖拽偏移）
        const initialData = calculateGridPoints();
        gridPoints = initialData.newGridPoints;
        gradients = initialData.newGradients;
        noiseZs = initialData.newNoiseZs;

        gridPointsRef.current = gridPoints;
        gradientsRef.current = gradients;
        noiseZsRef.current = noiseZs;
      };

      // 更新並繪製生長線條 (優化版本)
      const updateAndDrawBranches = (time: number, zoomMultiplier: number) => {
        // 降低創建頻率來減少性能負擔，每1秒創建一次
        if (p.frameCount - lastBranchCreation > 60 && gridPoints.length > 0) {
          // 創建單一線條來測試基本功能
          const randomIndex = Math.floor(p.random(gridPoints.length));
          const randomPoint = gridPoints[randomIndex];
          const randomGradient = gradients[randomIndex];

          if (randomPoint && randomGradient) {
            const branchLength = 50; // 固定長度，更簡單
            const branchWidth = 4; // 固定寬度

            // 根據區域顏色決定線條顏色
            let branchColor = '#22d3ee'; // 預設青藍色
            if (randomGradient.gradient.toString().includes('f59e0b')) {
              branchColor = '#f59e0b'; // 琥珀色
            } else if (randomGradient.gradient.toString().includes('ef4444')) {
              branchColor = '#ef4444'; // 紅色
            }

            const newBranch: GrowingBranch = {
              id: `branch_${p.frameCount}_${Math.random()}`,
              x: randomPoint.x,
              y: randomPoint.y,
              startY: randomPoint.y,
              currentY: randomPoint.y,
              targetY: randomPoint.y - branchLength,
              opacity: 200, // 高透明度確保可見
              isFalling: false,
              fallSpeed: 1, // 固定掉落速度
              branchLength: branchLength,
              branchWidth: branchWidth,
              color: branchColor,
              createdTime: p.frameCount,
            };

            growingBranches.push(newBranch);
          }
          lastBranchCreation = p.frameCount;
        }

        // 更新現有線條狀態
        for (let i = growingBranches.length - 1; i >= 0; i--) {
          const branch = growingBranches[i];

          if (!branch.isFalling) {
            // 生長階段：向上生長並增加透明度
            const growProgress = (p.frameCount - branch.createdTime) / 60; // 生長1秒
            branch.currentY = p.lerp(branch.startY, branch.targetY, Math.min(growProgress, 1));
            branch.opacity = Math.min(growProgress * 255, 255);

            // 當達到目標位置時開始掉落
            if (branch.currentY <= branch.targetY) {
              branch.isFalling = true;
            }
          } else {
            // 掉落階段：向下掉落並逐漸消失
            branch.currentY += branch.fallSpeed;
            branch.opacity -= 2; // 逐漸變透明

            // 當完全消失時移除線條
            if (branch.opacity <= 0) {
              growingBranches.splice(i, 1);
              continue;
            }
          }

          // 繪製線條 (簡化並增強可見度)
          p.push();
          p.translate(branch.x, branch.y);

          // 使用固定高透明度確保可見
          const alpha = Math.max(150, branch.opacity);
          const alphaHex = p.floor(alpha).toString(16).padStart(2, '0');

          p.stroke(branch.color + alphaHex);
          p.strokeWeight(4 * zoomMultiplier); // 更粗的線條
          p.noFill();

          // 繪製主線條 (從起點到當前位置)
          const lineLength = Math.abs(branch.startY - branch.currentY);
          p.line(0, 0, 0, -lineLength);

          // 添加側枝效果 (簡化版)
          if (p.frameCount % 8 < 4) { // 更頻繁的側枝
            p.push();
            p.rotate(p.sin(time * 2 + i) * 0.8); // 更明顯的擺動效果
            p.line(0, -lineLength * 0.4, 12, -lineLength * 0.4);
            p.pop();
          }

          p.pop();
        }
      };

      p.draw = () => {
        // 完全透明背景，讓地形圖清晰可見
        p.clear();
        p.noStroke();

        // 根據地圖縮放級別計算圓形大小 - 精確匹配地形圖網格
        const zoom = map ? map.getZoom() : 10;
        const zoomMultiplier = Math.max(0.2, Math.min(1.2, zoom / 20));
        const currentRadius = 8 * zoomMultiplier;

        // 增強時間變數，讓動畫更快更明顯
        const time = p.frameCount * 0.06;

        // === 實時座標同步系統 ===
        // 檢查拖拽偏移是否有變化
        const currentDragOffset = dragOffsetRef.current;

        // 如果拖拽偏移發生變化，重新計算網格點座標
        if (currentDragOffset.x !== lastDragOffset.x || currentDragOffset.y !== lastDragOffset.y) {
          const updatedData = calculateGridPoints(currentDragOffset);
          gridPoints = updatedData.newGridPoints;
          gradients = updatedData.newGradients;
          noiseZs = updatedData.newNoiseZs;
          lastDragOffset = currentDragOffset;

          // 更新引用
          gridPointsRef.current = gridPoints;
          gradientsRef.current = gradients;
          noiseZsRef.current = noiseZs;
        }

        // === 多重動畫效果確保可見度 ===

        // 1. 繪製科技感流線脈衝標記 - 青藍色科技光暈效果
        drawTechPulsingMarkers(p, gridPoints, time);

        // 2. 繪製持續的隨機動畫 - 只選擇約30%的網格點進行動畫
        drawContinuousAnimation(p, gridPoints, time);

        // 3. 繪製傳統的網格圓形（保留原有功能）
        for (let i = 0; i < gridPoints.length; i++) {
          const point = gridPoints[i];
          const gradientInfo = gradients[i];

          if (!gradientInfo) continue;

          p.push();
          p.drawingContext.fillStyle = gradientInfo.gradient;
          p.translate(point.x, point.y);

          // 增強雜訊計算 - 多層雜訊讓轉動更明顯
          const noiseValue1 = p.noise(
            point.y * 0.008 + time,
            point.x * 0.008 + time * 0.7,
            time
          );
          const noiseValue2 = p.noise(
            point.y * 0.012 - time * 0.5,
            point.x * 0.012 + time * 0.3,
            time * 1.3
          );

          // 結合兩個雜訊值創造更複雜的轉動效果
          const combinedNoise = (noiseValue1 + noiseValue2) * 0.5;
          p.rotate(combinedNoise * p.TWO_PI);

          // 主圓形 - 增強動態變化讓轉動更明顯
          const dynamicRadius = currentRadius + combinedNoise * 8 - 4;
          noisyCircle(p, dynamicRadius, noiseZs[i]);

          // 內圈動態邊框 - 精確匹配地形圖網格
          p.noFill();
          p.stroke(255, 180 + combinedNoise * 70);
          p.strokeWeight(1 * zoomMultiplier);
          noisyCircle(p, dynamicRadius + 0.5 * zoomMultiplier, noiseZs[i] + 10);

          // 外圈動態邊框 - 精確匹配地形圖網格
          p.stroke(255, 100 + combinedNoise * 60);
          p.strokeWeight(0.5 * zoomMultiplier);
          noisyCircle(p, dynamicRadius + 2 * zoomMultiplier, noiseZs[i] + 20);

          p.pop();
        }

        // 4. 繪製複雜的生長線條動畫（原有系統）
        updateAndDrawBranches(time, zoomMultiplier);

        // 增強調試信息：顯示拖拽同步狀態
        if (p.frameCount % 60 === 0) {
          console.log('MapGridVisualization Debug:', {
            frameCount: p.frameCount,
            gridPointsCount: gridPoints.length,
            branchesCount: growingBranches.length,
            zoomMultiplier,
            time: time.toFixed(2),
            canvasSize: `${p.width}x${p.height}`,
            dragOffset: currentDragOffset,
            lastDragOffset: lastDragOffset,
            isSynchronized: JSON.stringify(currentDragOffset) === JSON.stringify(lastDragOffset)
          });
        }
      };

      p.windowResized = () => {
        const container = sketchRef.current?.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          p.resizeCanvas(containerRect.width, containerRect.height);
        }
      };
    };

    p5InstanceRef.current = new p5(sketch, sketchRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [geoJsonData, colorMode, month, typeByCell, temperatureData]);

  return (
    <div
      ref={sketchRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 25,
        // 確保P5動畫不會溢出到其他section
        contain: 'layout style paint',
        // 限制在父容器範圍內
        maxWidth: '100%',
        maxHeight: '100%',
        overflow: 'hidden'
      }}
    />
  );
}
