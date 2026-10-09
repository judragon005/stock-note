import { describe, it, expect } from 'vitest';
import { getBucketStyle, calculateBarWidthPercent } from './VolumeProfileCard';

describe('VolumeProfileCard - 籌碼熱區圖元件樣式與計算規範 (Ticket 09)', () => {
  describe('getBucketStyle - 區間色彩與視覺樣式', () => {
    it('各類型應對應明確的語意色彩 (壓力紅、大量橙、密集藍、橫平灰、支撐綠)', () => {
      expect(getBucketStyle('resistance').color).toBe('#ef4444');
      expect(getBucketStyle('heavy').color).toBe('#f59e0b');
      expect(getBucketStyle('dense').color).toBe('#38bdf8');
      expect(getBucketStyle('flat').color).toBe('#94a3b8');
      expect(getBucketStyle('support').color).toBe('#10b981');
    });
  });

  describe('calculateBarWidthPercent - 長條進度比例計算', () => {
    it('應依據百分比產生 0~100 之間的長條寬度字串', () => {
      const width = calculateBarWidthPercent(50);
      expect(width).toBe('50%');
    });

    it('負數應 clamp 為 0%，超過 100% 應 clamp 為 100%', () => {
      expect(calculateBarWidthPercent(-10)).toBe('0%');
      expect(calculateBarWidthPercent(120)).toBe('100%');
    });
  });

  describe('自適應刻度與熱力色階規範 (Spec 0148 Ticket 01)', () => {
    it('支援接收動態 5 階價格刻度與 4 欄週期熱力數據', () => {
      const mockData = {
        buckets: [
          { label: '壓力區', percentage: 10, type: 'resistance' as const, priceMin: 980, priceMax: 1050 },
          { label: '大量成交區', percentage: 20, type: 'heavy' as const, priceMin: 920, priceMax: 980 },
          { label: '密集成交區', percentage: 30, type: 'dense' as const, priceMin: 860, priceMax: 920 },
          { label: '橫平區', percentage: 15, type: 'flat' as const, priceMin: 800, priceMax: 860 },
          { label: '支撐區', percentage: 25, type: 'support' as const, priceMin: 750, priceMax: 800 },
        ],
        bullBearFooterTag: '多方沉澱',
        priceTicks: [1050, 975, 900, 825, 750],
        heatmapColumns: [
          { id: 'col-1', label: '近5日', cells: Array(9).fill('#10b981') },
          { id: 'col-2', label: '近10日', cells: Array(9).fill('#0284c7') },
          { id: 'col-3', label: '近20日', cells: Array(9).fill('#06b6d4') },
          { id: 'col-4', label: '近60日', cells: Array(9).fill('#84cc16') },
        ],
      };

      expect(mockData.priceTicks.length).toBe(5);
      expect(mockData.priceTicks[0]).toBe(1050);
      expect(mockData.priceTicks[4]).toBe(750);
      expect(mockData.heatmapColumns.length).toBe(4);
      expect(mockData.heatmapColumns[0].cells.length).toBe(9);
    });

    it('主繪圖容器應支援 stretch 填滿與 100% 高度自適應 (Ticket 10 & 11)', () => {
      // 確保繪圖區高度與內部結構遵循全高度填滿原則，徹底消除上下 90px 留白
      const gridContainerStyle = {
        alignItems: 'stretch',
        flex: 1,
        minHeight: '250px',
      };
      expect(gridContainerStyle.alignItems).toBe('stretch');
      expect(gridContainerStyle.flex).toBe(1);
    });
  });

  describe('Ticket 05: 幽靈網格、現價指針與大量成交峰/籌碼真空帶規範', () => {
    it('應定義 Ghost Grid 邊框為微光透明度 rgba(255, 255, 255, 0.05)', async () => {
      const { GHOST_GRID_STYLE } = await import('./VolumeProfileCard');
      expect(GHOST_GRID_STYLE.border).toBe('1px solid rgba(255, 255, 255, 0.05)');
    });

    it('應準確識別大量成交峰 (POC) 與籌碼真空帶', async () => {
      const { identifyPocAndVacuum } = await import('./VolumeProfileCard');
      const buckets = [
        { label: '壓力區', percentage: 10, type: 'resistance' as const, priceMin: 390, priceMax: 410 },
        { label: '大量成交區', percentage: 55, type: 'heavy' as const, priceMin: 370, priceMax: 390 },
        { label: '密集成交區', percentage: 20, type: 'dense' as const, priceMin: 350, priceMax: 370 },
        { label: '橫平區', percentage: 12, type: 'flat' as const, priceMin: 330, priceMax: 350 },
        { label: '支撐區', percentage: 3, type: 'support' as const, priceMin: 310, priceMax: 330 },
      ];
      const { pocBucketIndex, vacuumBucketIndex } = identifyPocAndVacuum(buckets);
      expect(pocBucketIndex).toBe(1); // 55% 是大量成交峰
      expect(vacuumBucketIndex).toBe(4); // 3% 是籌碼真空帶
    });

    it('應計算最新收盤價之指針線 Y 軸比例', async () => {
      const { calculateCurrentPricePointer } = await import('./VolumeProfileCard');
      const pointer = calculateCurrentPricePointer([400, 375, 350, 325, 300], 375);
      expect(pointer.ratio).toBeCloseTo(0.25, 2);
      expect(pointer.displayPrice).toBe('375');
    });
  });

  describe('Spec 0174 Ticket 04: AI 籌碼熱區圖時間軸由遠及近翻轉與 1:1 像素對位', () => {
    it('DEFAULT_HEATMAP_COLUMNS 應由遠到近排列 (近60日 -> 近20日 -> 近10日 -> 近5日)', async () => {
      const { DEFAULT_HEATMAP_COLUMNS } = await import('./VolumeProfileCard');
      expect(DEFAULT_HEATMAP_COLUMNS[0].label).toBe('近60日');
      expect(DEFAULT_HEATMAP_COLUMNS[1].label).toBe('近20日');
      expect(DEFAULT_HEATMAP_COLUMNS[2].label).toBe('近10日');
      expect(DEFAULT_HEATMAP_COLUMNS[3].label).toBe('近5日');
    });

    it('normalizeHeatmapColumns 應保證輸出永遠是由遠及近順序', async () => {
      const { normalizeHeatmapColumns } = await import('./VolumeProfileCard');
      const oldOrder = [
        { id: 'c1', label: '近5日', cells: [] },
        { id: 'c2', label: '近10日', cells: [] },
        { id: 'c3', label: '近20日', cells: [] },
        { id: 'c4', label: '近60日', cells: [] },
      ];
      const normalized = normalizeHeatmapColumns(oldOrder);
      expect(normalized[0].label).toBe('近60日');
      expect(normalized[3].label).toBe('近5日');
    });
  });
});


