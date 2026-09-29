import { VolumeProfileData, VolumeProfileBucket } from '../types/aiForceDashboard';

export interface CandleLike {
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BUCKET_DEFINITIONS: {
  type: VolumeProfileBucket['type'];
  label: string;
}[] = [
  { type: 'resistance', label: '壓力區' },
  { type: 'heavy', label: '大量成交區' },
  { type: 'dense', label: '密集成交區' },
  { type: 'flat', label: '橫平區' },
  { type: 'support', label: '支撐區' },
];

/**
 * 依據歷史 K 線與成交量計算 Volume Profile (籌碼成交量價位分佈)
 */
export function calculateVolumeProfile(
  candles: CandleLike[],
  defaultBasePrice: number = 2100
): VolumeProfileData {
  if (!candles || candles.length === 0) {
    const step = defaultBasePrice * 0.04;
    const defaultBuckets: VolumeProfileBucket[] = BUCKET_DEFINITIONS.map((def, idx) => ({
      label: def.label,
      type: def.type,
      priceMax: Number((defaultBasePrice + (3 - idx) * step).toFixed(2)),
      priceMin: Number((defaultBasePrice + (2 - idx) * step).toFixed(2)),
      percentage: 20,
    }));
    return {
      buckets: defaultBuckets,
      bullBearFooterTag: '多空平衡',
    };
  }

  // 1. 找出極值
  let maxHigh = -Infinity;
  let minLow = Infinity;
  candles.forEach((c) => {
    if (c.high > maxHigh) maxHigh = c.high;
    if (c.low < minLow) minLow = c.low;
  });

  // 邊界防禦：若價格平盤或異常
  if (!isFinite(maxHigh) || !isFinite(minLow) || maxHigh <= minLow) {
    const center = isFinite(maxHigh) && maxHigh > 0 ? maxHigh : defaultBasePrice;
    maxHigh = center * 1.05;
    minLow = center * 0.95;
  }

  const span = maxHigh - minLow;
  const bucketCount = 5;
  const bucketSpan = span / bucketCount;

  // 建立 5 個桶的價格區間（由高至低排列：index 0 為最高價區）
  const bucketBounds = BUCKET_DEFINITIONS.map((def, idx) => {
    // idx 0: [minLow + 4*step, maxHigh]
    // idx 4: [minLow, minLow + step]
    const pMin = minLow + (bucketCount - 1 - idx) * bucketSpan;
    const pMax = idx === 0 ? maxHigh : pMin + bucketSpan;
    return {
      ...def,
      priceMin: Number(pMin.toFixed(2)),
      priceMax: Number(pMax.toFixed(2)),
      volumeSum: 0,
    };
  });

  // 2. 將每根 K 棒的成交量依照價格交集分配到各桶中
  candles.forEach((c) => {
    const candleSpan = Math.max(0.01, c.high - c.low);
    const cHigh = c.high;
    const cLow = c.low;

    bucketBounds.forEach((b) => {
      // 計算交集
      const overlapStart = Math.max(b.priceMin, cLow);
      const overlapEnd = Math.min(b.priceMax, cHigh);
      if (overlapEnd > overlapStart) {
        const weight = (overlapEnd - overlapStart) / candleSpan;
        b.volumeSum += c.volume * Math.min(1, Math.max(0, weight));
      } else if (cHigh === cLow && cHigh >= b.priceMin && cHigh <= b.priceMax) {
        b.volumeSum += c.volume;
      }
    });
  });

  // 3. 計算各桶佔比並確保總和 100%
  const totalVolume = bucketBounds.reduce((acc, b) => acc + b.volumeSum, 0);

  let remainingPercent = 100;
  const buckets: VolumeProfileBucket[] = bucketBounds.map((b, idx) => {
    let pct = 0;
    if (totalVolume > 0) {
      pct = Math.round((b.volumeSum / totalVolume) * 100);
    } else {
      pct = 20;
    }
    // 防止超出
    if (idx === bucketBounds.length - 1) {
      pct = remainingPercent;
    } else {
      pct = Math.min(remainingPercent, Math.max(0, pct));
      remainingPercent -= pct;
    }

    return {
      label: b.label,
      type: b.type,
      priceMin: b.priceMin,
      priceMax: b.priceMax,
      percentage: pct,
    };
  });

  // 4. 計算多空底部分析標籤
  // 找出 POC (成交量佔比最大之桶)
  const maxBucket = [...buckets].sort((a, b) => b.percentage - a.percentage)[0];
  const latestClose = candles[candles.length - 1]?.close ?? defaultBasePrice;
  let bullBearFooterTag = '多空均衡';

  if (latestClose > (maxBucket.priceMin + maxBucket.priceMax) / 2) {
    bullBearFooterTag = '多方籌碼沉澱，強勢結構';
  } else {
    bullBearFooterTag = '高檔籌碼沉重，承壓震盪';
  }

  // 5. 自適應 Y 軸 5 階價格刻度 (由大到小)
  const tickStep = span / 4;
  const priceTicks = [
    Math.round(maxHigh),
    Math.round(maxHigh - tickStep),
    Math.round(maxHigh - tickStep * 2),
    Math.round(maxHigh - tickStep * 3),
    Math.round(minLow),
  ];

  // 6. 計算 4 欄週期熱力矩陣 (近5日、近10日、近20日、近60日)，每欄 9 格由高至低
  const periods: { id: string; label: string; count: number }[] = [
    { id: 'col-1', label: '近5日', count: 5 },
    { id: 'col-2', label: '近10日', count: 10 },
    { id: 'col-3', label: '近20日', count: 20 },
    { id: 'col-4', label: '近60日', count: 60 },
  ];

  const cellCount = 9;
  const cellSpan = span / cellCount;

  const getHeatmapColor = (ratio: number): string => {
    if (ratio <= 0.05) return '#0f172a';
    if (ratio <= 0.2) return '#1e293b';
    if (ratio <= 0.35) return '#1e3a8a';
    if (ratio <= 0.5) return '#0284c7';
    if (ratio <= 0.65) return '#06b6d4';
    if (ratio <= 0.8) return '#10b981';
    if (ratio <= 0.9) return '#84cc16';
    return '#fbbf24';
  };

  const heatmapColumns = periods.map((p) => {
    const subCandles = candles.slice(-p.count);
    const cellVols = new Array(cellCount).fill(0);

    subCandles.forEach((c) => {
      const cSpan = Math.max(0.01, c.high - c.low);
      for (let k = 0; k < cellCount; k++) {
        const topP = maxHigh - k * cellSpan;
        const botP = topP - cellSpan;
        const overlapStart = Math.max(botP, c.low);
        const overlapEnd = Math.min(topP, c.high);
        if (overlapEnd > overlapStart) {
          const w = (overlapEnd - overlapStart) / cSpan;
          cellVols[k] += c.volume * w;
        } else if (c.high === c.low && c.high >= botP && c.high <= topP) {
          cellVols[k] += c.volume;
        }
      }
    });

    const maxCellVol = Math.max(1, ...cellVols);
    const cells = cellVols.map((v) => getHeatmapColor(v / maxCellVol));

    return {
      id: p.id,
      label: p.label,
      cells,
    };
  });

  return {
    buckets,
    bullBearFooterTag,
    priceTicks,
    heatmapColumns,
  };
}

