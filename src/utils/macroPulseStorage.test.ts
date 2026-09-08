import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveMacroPulseRecord,
  loadMacroPulseHistory,
  getLatestMacroPulseRecord,
  exportMacroPulseHistoryAsCsv,
  generateSampleHistoricalMacroData,
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
});
