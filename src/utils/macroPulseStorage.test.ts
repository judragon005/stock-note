import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveMacroPulseRecord,
  loadMacroPulseHistory,
  getLatestMacroPulseRecord,
  exportMacroPulseHistoryAsCsv,
  generateSampleHistoricalMacroData,
  isSameDayCacheValid,
  sanitizeMacroRecord,
  mergeMacroSnapshot,
  loadMacroPinnedStrategies,
  saveMacroPinnedStrategy,
  removeMacroPinnedStrategy,
  parseMacroLoopbackJson,
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

  it('Zero-Mock 政策：當無任何歷史時，generateSampleHistoricalMacroData 絕不偽造正弦波假歷史資料', () => {
    const result = generateSampleHistoricalMacroData();
    const history = loadMacroPulseHistory();
    expect(history).toEqual([]);
    expect(result).toEqual([]);
  });

  describe('Ticket 08 & Spec 0209: 24H 當日快取鎖定與舊版 Schema 自動升級清洗', () => {
    it('isSameDayCacheValid 應正確判別同日有效與跨日過期', () => {
      const now = new Date('2026-10-17T14:30:00Z').getTime();
      const sameDayEarlier = new Date('2026-10-17T02:15:00Z').getTime();
      const yesterday = new Date('2026-10-16T23:59:59Z').getTime();

      expect(isSameDayCacheValid(sameDayEarlier, now)).toBe(true);
      expect(isSameDayCacheValid(yesterday, now)).toBe(false);
      expect(isSameDayCacheValid(0, now)).toBe(false);
    });

    it('sanitizeMacroRecord 應補齊所有缺少的新增法人金絲雀欄位，黃金預設值升級為 3350.0，並完整保留 0209 跨市場與廣度欄位', () => {
      const legacyRawRecord: Partial<MacroIndicatorSnapshot> = {
        date: '2025-01-01',
        us10y: 3.5,
        us2y: 3.8,
        vix: 15.0,
        soxIndex: 5200.5,
        soxBias20Ma: 2.4,
        soxAbove20Ma: true,
        tsmAdrPrice: 195.5,
        tsmAdrPremiumPercent: 6.2,
        twMarketBreadth: {
          advancingCount: 610,
          decliningCount: 320,
          unchangedCount: 80,
          pctAbove20MA: 64.5,
          breadthRegime: 'BROAD_RALLY',
        },
        sourceStatus: 'LIVE',
      };

      const clean = sanitizeMacroRecord(legacyRawRecord);
      expect(clean.goldPrice).toBe(3350.0);
      expect(clean.creditSpreadOAS).toBeDefined();
      expect(clean.cdsInsuranceIndex).toBeDefined();
      expect(clean.cdsRiskLevel).toBe('LOW');
      expect(clean.twFuturesNetOi).toBeDefined();
      expect(clean.twMarginMaintenance).toBeDefined();
      expect(clean.twFuturesRiskLevel).toBe('NEUTRAL');
      expect(clean.twMarginRiskLevel).toBe('SAFE');
      expect(clean.yieldSpread).toBe(-0.3); // 自動依 3.5 - 3.8 補齊
      expect(clean.isYieldInverted).toBe(true);
      expect(clean.soxIndex).toBe(5200.5);
      expect(clean.soxBias20Ma).toBe(2.4);
      expect(clean.soxAbove20Ma).toBe(true);
      expect(clean.tsmAdrPrice).toBe(195.5);
      expect(clean.tsmAdrPremiumPercent).toBe(6.2);
      expect(clean.twMarketBreadth?.breadthRegime).toBe('BROAD_RALLY');
      expect(clean.sourceStatus).toBe('LIVE');
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
      expect(loaded[0].goldPrice).toBe(3350.0);
    });

    it('sanitizeMacroRecord 應能防禦行情物件污染，自動解包 .price 純數值 (避免 React child 崩潰)', () => {
      const poisonedRawRecord: any = {
        date: '2026-10-31',
        dxy: { symbol: 'DX-Y.NYB', price: 104.25, prevClose: 104.1 },
        vix: { symbol: '^VIX', price: 18.75 },
        goldPrice: { symbol: 'GC=F', price: 3410.5 },
        oilPrice: { symbol: 'CL=F', price: 72.3 },
        usdToTwd: { symbol: 'TWD=X', price: 32.12 },
      };

      const clean = sanitizeMacroRecord(poisonedRawRecord);
      expect(clean.dxy).toBe(104.25);
      expect(typeof clean.dxy).toBe('number');
      expect(clean.vix).toBe(18.75);
      expect(typeof clean.vix).toBe('number');
      expect(clean.goldPrice).toBe(3410.5);
      expect(typeof clean.goldPrice).toBe('number');
      expect(clean.oilPrice).toBe(72.3);
      expect(typeof clean.oilPrice).toBe('number');
      expect(clean.usdToTwd).toBe(32.12);
      expect(typeof clean.usdToTwd).toBe('number');
    });
  });

  describe('Spec 0235 Ticket 01: 統一宏觀數據海關正規化器 (Dual-Schema Normalizer)', () => {
    it('應將後端 /api/market/macro 真實鍵名無損映射為前端欄位，不退回寫死常數', () => {
      const clean = sanitizeMacroRecord({
        date: '2026-11-18',
        treasuryYield10y: 4.42,
        treasuryYield2y: 4.11,
        riskFreeRate3m: 4.05,
        yieldSpread10y2y: 0.31,
        cnnFearGreedScore: 22,
        creditSpreadOas: 4.8,
        cccSpreadOas: 9.6,
        igSpreadOas: 1.1,
        breakeven10y: 2.35,
        initialClaims: 231000,
        usOrdersMinusInvSpread: -1.8,
        soxClose: 5123.4,
        taiexClose: 22876.5,
        sp500Close: 5980.1,
        nasdaqClose: 19234.7,
      } as any);

      expect(clean.us10y).toBe(4.42);
      expect(clean.us2y).toBe(4.11);
      expect(clean.us3m).toBe(4.05);
      expect(clean.yieldSpread).toBe(0.31);
      expect(clean.fearAndGreedIndex).toBe(22);
      expect(clean.creditSpreadOAS).toBe(4.8);
      expect(clean.cccSpreadOAS).toBe(9.6);
      expect(clean.igSpreadOAS).toBe(1.1);
      expect(clean.breakeven10y).toBe(2.35);
      expect(clean.initialClaims).toBe(231000);
      expect(clean.usOrdersMinusInvSpread).toBe(-1.8);
      expect(clean.soxIndex).toBe(5123.4);
      expect(clean.taiexIndex).toBe(22876.5);
      expect(clean.sp500Index).toBe(5980.1);
      expect(clean.nasdaqIndex).toBe(19234.7);
    });

    it('應依最新數值動態重算 vixLevel 與 fearAndGreedLevel，不沿用過期等級', () => {
      const clean = sanitizeMacroRecord({
        vix: 34.2,
        vixLevel: 'NORMAL',
        cnnFearGreedScore: 18,
        fearAndGreedLevel: 'GREED',
      } as any);
      expect(clean.vixLevel).toBe('PANIC');
      expect(clean.fearAndGreedLevel).toBe('EXTREME_FEAR');
    });

    it('黃金價格 2,600 USD/oz 合理區間應保留，僅 <= 500 之異常值退回預設', () => {
      expect(sanitizeMacroRecord({ goldPrice: 2600 }).goldPrice).toBe(2600);
      expect(sanitizeMacroRecord({ goldPrice: 120 }).goldPrice).toBe(3350);
    });

    it('mergeMacroSnapshot：遠端欄位 null/undefined 時保留既有指數報價，有值者覆寫並重算利差', () => {
      const prev = sanitizeMacroRecord({
        us10y: 4.3,
        us2y: 4.0,
        soxIndex: 5000,
        taiexIndex: 22000,
        sp500Index: 5900,
        nasdaqIndex: 19000,
      });
      const merged = mergeMacroSnapshot(prev, {
        treasuryYield10y: 4.5,
        soxClose: null,
        taiexClose: undefined,
        sp500Close: null,
      });
      expect(merged.us10y).toBe(4.5);
      expect(merged.us2y).toBe(4.0);
      expect(merged.yieldSpread).toBe(0.5);
      expect(merged.soxIndex).toBe(5000);
      expect(merged.taiexIndex).toBe(22000);
      expect(merged.sp500Index).toBe(5900);
      expect(merged.nasdaqIndex).toBe(19000);
    });

    it('應支援 SQLite snake_case 鍵名映射', () => {
      const clean = sanitizeMacroRecord({
        treasury_yield_10y: 4.2,
        treasury_yield_2y: 4.0,
        cnn_fear_greed_score: 80,
        credit_spread_oas: 3.1,
        ccc_spread_oas: 8.2,
        tw_foreign_futures_oi: -32000,
        tw_margin_maintenance_ratio: 158.5,
      } as any);
      expect(clean.us10y).toBe(4.2);
      expect(clean.us2y).toBe(4.0);
      expect(clean.fearAndGreedIndex).toBe(80);
      expect(clean.creditSpreadOAS).toBe(3.1);
      expect(clean.cccSpreadOAS).toBe(8.2);
      expect(clean.twFuturesNetOi).toBe(-32000);
      expect(clean.twMarginMaintenance).toBe(158.5);
    });
  });

  describe('Ticket 10: 外部 AI 宏觀戰略釘選與 Loopback JSON 解析 (Macro Strategy Pins)', () => {
    it('應能儲存、按模型名稱去重覆蓋並移除 AI 戰略釘選', () => {
      expect(loadMacroPinnedStrategies()).toEqual([]);

      const list1 = saveMacroPinnedStrategy({
        aiModel: 'Claude 3.5 Sonnet',
        recommendedEquityCapPercent: 60,
        soxSupportLevel: 4950,
        taiexSupportLevel: 22300,
        tacticalSummary: '費半月線有守，拉回分批承接',
      });
      expect(list1).toHaveLength(1);
      expect(list1[0].aiModel).toBe('Claude 3.5 Sonnet');
      expect(list1[0].recommendedEquityCapPercent).toBe(60);
      expect(list1[0].expiresAt).toBeDefined();

      // 同一模型再次釘選應覆蓋舊紀錄
      const list2 = saveMacroPinnedStrategy({
        aiModel: '  claude 3.5 sonnet ',
        recommendedEquityCapPercent: 55,
        tacticalSummary: 'CPI 前夕收斂水位至 55%',
      });
      expect(list2).toHaveLength(1);
      expect(list2[0].recommendedEquityCapPercent).toBe(55);

      // 不同模型應並存
      const list3 = saveMacroPinnedStrategy({
        aiModel: 'ChatGPT-4o',
        recommendedEquityCapPercent: 65,
        tacticalSummary: '多頭排列續抱',
      });
      expect(list3).toHaveLength(2);

      // 移除指定 ID
      const remaining = removeMacroPinnedStrategy(list3[0].id);
      expect(remaining).toHaveLength(1);
    });

    it('parseMacroLoopbackJson 應能從外部 LLM Markdown 回覆中提取戰略釘選 JSON', () => {
      const llmReply = `
這是根據您提供的投資組合與宏觀指標所做的 CRO 深度診斷：
1. 目前費半站在 20MA 之上...
\`\`\`json
{
  "aiModel": "Claude 3.5 Sonnet",
  "recommendedEquityCapPercent": 62,
  "soxSupportLevel": 5050,
  "taiexSupportLevel": 22800,
  "tacticalSummary": "費半守穩月線且 ADR 溢價，維持 62% 持股順勢操作"
}
\`\`\`
`;
      const parsed = parseMacroLoopbackJson(llmReply);
      expect(parsed).not.toBeNull();
      expect(parsed?.aiModel).toBe('Claude 3.5 Sonnet');
      expect(parsed?.recommendedEquityCapPercent).toBe(62);
      expect(parsed?.soxSupportLevel).toBe(5050);
      expect(parsed?.taiexSupportLevel).toBe(22800);
      expect(parsed?.tacticalSummary).toContain('維持 62% 持股');

      expect(parseMacroLoopbackJson('完全沒有 JSON 的一般文字回覆')).toBeNull();
    });
  });
});
