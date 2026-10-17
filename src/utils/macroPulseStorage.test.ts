import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveMacroPulseRecord,
  loadMacroPulseHistory,
  getLatestMacroPulseRecord,
  exportMacroPulseHistoryAsCsv,
  generateSampleHistoricalMacroData,
  isSameDayCacheValid,
  sanitizeMacroRecord,
} from './macroPulseStorage';


import { MacroIndicatorSnapshot } from '../types/macro';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('macroPulseStorage (市場四柱在地持久化與歷史資料庫)', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
  });

  const mockSnapshot: MacroIndicatorSnapshot = {
    date: '2026-09-08',
    us10y: 3.85,
    us2y: 3.98,
    yieldSpread: -0.13,
    isYieldInverted: true,
    vix: 19.4,
    vixLevel: 'NORMAL',
    fearAndGreedIndex: 48,
    fearAndGreedLevel: 'NEUTRAL',
    goldPrice: 2515.2,
    oilPrice: 73.8,
    dxy: 101.4,
    usdToTwd: 32.15,
    usM2GrowthYoY: 2.3,
    twM2GrowthYoY: 5.6,
    updatedAt: 1788850000000,
  };

  it('應能儲存當日市場四柱快照並正確讀取', () => {
    saveMacroPulseRecord(mockSnapshot);
    const history = loadMacroPulseHistory();
    expect(history.length).toBe(1);
    expect(history[0].date).toBe('2026-09-08');
    expect(history[0].goldPrice).toBe(2515.2);

    const latest = getLatestMacroPulseRecord();
    expect(latest).not.toBeNull();
    expect(latest?.vix).toBe(19.4);
  });

  it('重複儲存相同日期的快照應執行覆蓋更新 (去重保障)', () => {
    saveMacroPulseRecord(mockSnapshot);
    saveMacroPulseRecord({
      ...mockSnapshot,
      goldPrice: 2520.0,
    });

    const history = loadMacroPulseHistory();
    expect(history.length).toBe(1);
    expect(history[0].goldPrice).toBe(2520.0);
  });

  it('應能匯出格式正確的 CSV 字串供資料分析', () => {
    saveMacroPulseRecord(mockSnapshot);
    const csv = exportMacroPulseHistoryAsCsv();
    expect(csv).toContain('日期,10Y美債(%),2Y美債(%)');
    expect(csv).toContain('2026-09-08');
    expect(csv).toContain('2515.2');
  });

  it('當無任何歷史時，應能平滑初始化樣例歷史資料', () => {
    generateSampleHistoricalMacroData();
    const history = loadMacroPulseHistory();
    expect(history.length).toBeGreaterThanOrEqual(10);
    expect(history[0].us10y).toBeGreaterThan(0);
  });

  describe('Ticket 08: 24H 當日快取鎖定與舊版 Schema 自動升級清洗', () => {
    it('isSameDayCacheValid 應正確判別同日有效與跨日過期', () => {
      const now = new Date('2026-10-17T14:30:00Z').getTime();
      const sameDayEarlier = new Date('2026-10-17T02:15:00Z').getTime();
      const yesterday = new Date('2026-10-16T23:59:59Z').getTime();

      expect(isSameDayCacheValid(sameDayEarlier, now)).toBe(true);
      expect(isSameDayCacheValid(yesterday, now)).toBe(false);
      expect(isSameDayCacheValid(0, now)).toBe(false);
    });

    it('sanitizeMacroRecord 應補齊所有缺少的新增法人金絲雀欄位，杜絕 undefined', () => {
      const legacyRawRecord: Partial<MacroIndicatorSnapshot> = {
        date: '2025-01-01',
        us10y: 3.5,
        us2y: 3.8,
        vix: 15.0,
      };

      const clean = sanitizeMacroRecord(legacyRawRecord);
      expect(clean.creditSpreadOAS).toBeDefined();
      expect(clean.cdsInsuranceIndex).toBeDefined();
      expect(clean.cdsRiskLevel).toBe('LOW');
      expect(clean.twFuturesNetOi).toBeDefined();
      expect(clean.twMarginMaintenance).toBeDefined();
      expect(clean.twFuturesRiskLevel).toBe('NEUTRAL');
      expect(clean.twMarginRiskLevel).toBe('SAFE');
      expect(clean.yieldSpread).toBe(-0.3); // 自動依 3.5 - 3.8 補齊
      expect(clean.isYieldInverted).toBe(true);
    });

    it('loadMacroPulseHistory 應自動清洗存於 LocalStorage 的舊版不相容記錄', () => {
      const legacyJson = JSON.stringify([
        {
          date: '2025-01-01',
          us10y: 4.0,
          us2y: 4.2,
          vix: 16.0,
          // 故意缺少所有 0193 新欄位
        },
      ]);
      localStorage.setItem('STOCK_TRACKER_MACRO_PULSE_HISTORY_V1', legacyJson);

      const loaded = loadMacroPulseHistory();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].creditSpreadOAS).toBe(3.5);
      expect(loaded[0].twFuturesRiskLevel).toBe('NEUTRAL');
      expect(loaded[0].cdsRiskLevel).toBe('LOW');
    });
  });
});

