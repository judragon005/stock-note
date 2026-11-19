import { describe, it, expect } from 'vitest';
import { calculateRiskSpider } from './riskSpiderEngine';
import { calculateDayTradeRisk } from './dayTradeRiskEngine';
import { calculateAiConfidence } from './aiConfidenceEngine';
import { calculateVwapCostStructure } from './vwapCostEngine';
import { calculateVolumeProfile } from './volumeProfileEngine';
import { calculateForecastCone } from './forecastConeEngine';
import { synthesizeMainForceVerdict } from './mainForceSemanticEngine';
import type { KlineCandleItem } from '../types/aiForceDashboard';

describe('Spec 0239 T08/T09: 子引擎雙市場量綱校準、美股總評語意與 Zero-Mock 淨化', () => {
  describe('1. riskSpiderEngine — 雙市場流動性門檻、美股微結構法人風險與空資料零造假', () => {
    it('美股日均 3,000 股低量標的應判為極高流動性風險 (>= 75)，絕不再誤得低風險 20', () => {
      const lowVolUsCandles = Array.from({ length: 10 }, () => ({
        high: 15.5,
        low: 14.5,
        close: 15,
        volume: 3000, // 3,000 股，極冷門美股
      }));

      const res = calculateRiskSpider(lowVolUsCandles, { market: 'US' });
      expect(res.liquidityRisk).toBeGreaterThanOrEqual(75);
      expect(res.liquidityRisk).not.toBe(20);
    });

    it('美股流動性風險應隨股數門檻呈現階梯遞減 (<50k 極高、50k~500k 中高、500k~2M 中低、>2M 低風險 20)', () => {
      const makeUs = (vol: number) =>
        Array.from({ length: 10 }, () => ({ high: 102, low: 98, close: 100, volume: vol }));

      const rVeryLow = calculateRiskSpider(makeUs(10_000), { market: 'US' });
      const rMidHigh = calculateRiskSpider(makeUs(200_000), { market: 'US' });
      const rMidLow = calculateRiskSpider(makeUs(1_000_000), { market: 'US' });
      const rHigh = calculateRiskSpider(makeUs(5_000_000), { market: 'US' });

      expect(rVeryLow.liquidityRisk).toBeGreaterThanOrEqual(75);
      expect(rMidHigh.liquidityRisk).toBeGreaterThan(rMidLow.liquidityRisk);
      expect(rMidLow.liquidityRisk).toBeGreaterThan(rHigh.liquidityRisk);
      expect(rHigh.liquidityRisk).toBe(20);
    });

    it('美股傳入 usMicroScore 時，institutionalRisk 應反映 clamp(100 - usMicroScore, 10, 95)', () => {
      const candles = Array.from({ length: 10 }, () => ({
        high: 105,
        low: 95,
        close: 100,
        volume: 3_000_000,
      }));

      const strongInst = calculateRiskSpider(candles, { market: 'US', usMicroScore: 90 });
      const weakInst = calculateRiskSpider(candles, { market: 'US', usMicroScore: 15 });
      const extremeStrong = calculateRiskSpider(candles, { market: 'US', usMicroScore: 99 });
      const extremeWeak = calculateRiskSpider(candles, { market: 'US', usMicroScore: 0 });

      expect(strongInst.institutionalRisk).toBe(10);
      expect(weakInst.institutionalRisk).toBe(85);
      expect(extremeStrong.institutionalRisk).toBe(10);
      expect(extremeWeak.institutionalRisk).toBe(95);
    });

    it('空 K 線或少於 2 根 K 線應回傳零造假中性基準 (全 0 / LOW)', () => {
      for (const input of [[], [{ high: 100, low: 95, close: 98, volume: 1000 }]]) {
        const res = calculateRiskSpider(input);
        expect(res).toEqual({
          liquidityRisk: 0,
          volatilityRisk: 0,
          trendRisk: 0,
          institutionalRisk: 0,
          chipRisk: 0,
          mainForceRiskLevel: 'LOW',
          mainForceRiskIndex: 0,
        });
      }
    });
  });

  describe('2. dayTradeRiskEngine — 美股無漲跌幅波動刻度、Short Float 軋空風險與空資料零造假', () => {
    it('美股模式 intradayVolatility 應依美股振幅刻度映射 (3% 約 45、6% 約 75、9.5% 不提前封頂、10%+ 才達 95)', () => {
      const makeAmp = (ampPct: number) => {
        const close = 100;
        const half = (close * ampPct) / 2;
        return [
          { open: 100, high: close + half, low: close - half, close, volume: 2_000_000 },
          { open: 100, high: close + half, low: close - half, close, volume: 2_000_000 },
        ];
      };

      const r3 = calculateDayTradeRisk(makeAmp(0.03), { market: 'US' });
      const r6 = calculateDayTradeRisk(makeAmp(0.06), { market: 'US' });
      const r95 = calculateDayTradeRisk(makeAmp(0.095), { market: 'US' });
      const r12 = calculateDayTradeRisk(makeAmp(0.12), { market: 'US' });

      expect(r3.intradayVolatility).toBeGreaterThanOrEqual(40);
      expect(r3.intradayVolatility).toBeLessThanOrEqual(50);
      expect(r6.intradayVolatility).toBeGreaterThanOrEqual(70);
      expect(r6.intradayVolatility).toBeLessThanOrEqual(80);
      expect(r95.intradayVolatility).toBeLessThan(95);
      expect(r12.intradayVolatility).toBe(95);
    });

    it('美股傳入高 shortFloatRatio 時，應顯著提高回檔/軋空風險與綜合 riskIndex', () => {
      const candles = [
        { open: 50, high: 52, low: 49, close: 51, volume: 1_500_000 },
        { open: 51, high: 53, low: 50, close: 52, volume: 1_600_000 },
      ];
      const lowShort = calculateDayTradeRisk(candles, { market: 'US', shortFloatRatio: 2 });
      const highShort = calculateDayTradeRisk(candles, { market: 'US', shortFloatRatio: 24 });

      expect(highShort.pullbackRisk).toBeGreaterThan(lowShort.pullbackRisk + 10);
      expect(highShort.riskIndex).toBeGreaterThan(lowShort.riskIndex);
    });

    it('空 K 線應回傳零造假基準 (全 0 / LOW)，不再回傳寫死 49/57/53/45/62', () => {
      const res = calculateDayTradeRisk([]);
      expect(res.abnormalSelling).toBe(0);
      expect(res.turnoverRate).toBe(0);
      expect(res.dayTradeRatio).toBe(0);
      expect(res.pullbackRisk).toBe(0);
      expect(res.intradayVolatility).toBe(0);
      expect(res.riskIndex).toBe(0);
      expect(res.riskLevel).toBe('LOW');
    });
  });

  describe('3. aiConfidenceEngine — 美股資料完整度免扣分與股數量綱門檻', () => {
    const makeUsSeries = (vol: number, count: number = 120) => {
      const candles = Array.from({ length: count }, (_, i) => ({
        open: 100 + i * 0.5,
        high: 101 + i * 0.5,
        low: 99 + i * 0.5,
        close: 100.5 + i * 0.5,
        volume: vol,
      }));
      const klineCandles: KlineCandleItem[] = candles.map((c, i) => ({
        date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
        ...c,
        ma5: c.close - 1,
        ma20: c.close - 3,
        ma60: c.close - 6,
      }));
      return { candles, klineCandles };
    };

    it('美股具備 120 根日 K 與微結構時，即使無台股三大法人資料，dataCompleteness 也不應被扣 10 分 (>= 95)', () => {
      const { candles, klineCandles } = makeUsSeries(3_000_000, 120);
      const res = calculateAiConfidence({
        candles,
        klineCandles,
        hasInstitutionalData: false,
        hasUsMicrostructure: true,
        market: 'US',
      });
      expect(res.dataCompleteness).toBeGreaterThanOrEqual(95);
    });

    it('美股 strategyApplicability 應依股數門檻評估：日均 3,000 股冷門股絕不拿 82% 高分，日均 >100 萬股拿高分', () => {
      const coldUs = makeUsSeries(3_000, 120);
      const hotUs = makeUsSeries(2_500_000, 120);

      const coldRes = calculateAiConfidence({
        candles: coldUs.candles,
        klineCandles: coldUs.klineCandles,
        hasInstitutionalData: false,
        hasUsMicrostructure: true,
        market: 'US',
      });
      const hotRes = calculateAiConfidence({
        candles: hotUs.candles,
        klineCandles: hotUs.klineCandles,
        hasInstitutionalData: false,
        hasUsMicrostructure: true,
        market: 'US',
      });

      expect(coldRes.strategyApplicability).toBeLessThanOrEqual(50);
      expect(hotRes.strategyApplicability).toBeGreaterThanOrEqual(80);
    });
  });

  describe('4. vwapCostEngine — 修正負溢位 Bug、統一四帶名稱色碼與空資料零造假', () => {
    it('極端四捨五入溢位情境 (pBreakout=51 + pTrapped=50 > 100 且 costVol=0) 下，絕不產生 -1% 負溢位且總和恆等於 100', () => {
      // 精確反例：breakoutVol=101 (50.5% -> 51), trappedVol=99 (49.5% -> 50), costVol=0
      // 舊邏輯會產生 pHeavy=-1 進而把 pCost 扣成 -1%
      const overflowCandles = [
        { high: 120, low: 120, close: 120, volume: 101 },
        { high: 80, low: 80, close: 80, volume: 99 },
      ];
      const res = calculateVwapCostStructure(overflowCandles);
      expect(res.bands.length).toBe(4);
      res.bands.forEach((b) => {
        expect(b.percentage).toBeGreaterThanOrEqual(0);
        expect(b.percentage).toBeLessThanOrEqual(100);
      });
      const total = res.bands.reduce((acc, b) => acc + b.percentage, 0);
      expect(total).toBe(100);
    });

    it('應統一四帶名稱、乖離標籤與色碼，並正確區分 <-2% 套牢區與 +2~+5% 大量成交區', () => {
      const candles = [
        { high: 110, low: 110, close: 110, volume: 1000 }, // >+5% 突破區
        { high: 103, low: 103, close: 103, volume: 1000 }, // +2~+5% 大量成交區
        { high: 100, low: 100, close: 100, volume: 1000 }, // ±2% 主力成本區
        { high: 90, low: 90, close: 90, volume: 1000 }, // <-2% 套牢區
      ];
      const res = calculateVwapCostStructure(candles);

      expect(res.bands.map((b) => ({ name: b.name, biasLabel: b.biasLabel, color: b.color }))).toEqual([
        { name: '突破區', biasLabel: '>+5%', color: '#2563eb' },
        { name: '大量成交區', biasLabel: '+2~+5%', color: '#f97316' },
        { name: '主力成本區', biasLabel: '±2%', color: '#10b981' },
        { name: '套牢區', biasLabel: '<-2%', color: '#38bdf8' },
      ]);
      // 每帶各 25%
      res.bands.forEach((b) => expect(b.percentage).toBe(25));
    });

    it('空 K 線應回傳 mainForceVwap=0、bands=[]、timeNodes=[]，絕不回傳寫死 2131 與 06/26 假日期', () => {
      const res = calculateVwapCostStructure([]);
      expect(res.mainForceVwap).toBe(0);
      expect(res.biasPercent).toBe(0);
      expect(res.bands).toEqual([]);
      expect(res.timeNodes).toEqual([]);
    });
  });

  describe('5. volumeProfileEngine — 自適應小數刻度防重複與空資料零造假', () => {
    it('低價美股 ($2.10 ~ $2.50) 應產出保留 2 位小數且嚴格遞減不重複的 5 階 priceTicks', () => {
      const pennyUsCandles = [
        { high: 2.5, low: 2.35, close: 2.45, volume: 500_000 },
        { high: 2.4, low: 2.2, close: 2.3, volume: 600_000 },
        { high: 2.3, low: 2.1, close: 2.15, volume: 700_000 },
      ];
      const res = calculateVolumeProfile(pennyUsCandles);
      expect(res.priceTicks).toBeDefined();
      expect(res.priceTicks!.length).toBe(5);

      // 驗證嚴格遞減無重複
      for (let i = 0; i < 4; i++) {
        expect(res.priceTicks![i]).toBeGreaterThan(res.priceTicks![i + 1]);
      }
      // 驗證非全整數失真 (應具小數精度)
      expect(res.priceTicks!.some((t) => !Number.isInteger(t))).toBe(true);
    });

    it('空 K 線應回傳空 buckets、priceTicks 與 heatmapColumns，不再以 2100 造假 5 桶', () => {
      const res = calculateVolumeProfile([]);
      expect(res.buckets).toEqual([]);
      expect(res.priceTicks).toEqual([]);
      expect(res.heatmapColumns).toEqual([]);
    });
  });

  describe('6. forecastConeEngine — 低價股 2 位小數精度與空資料零造假', () => {
    it('低價股 (< 20) 未來預測節點價位應保留 2 位小數 (非 toFixed(1)) 以維持精確擴散', () => {
      const lowPriceCandles = Array.from({ length: 20 }, (_, i) => ({
        close: 2.1 + i * 0.02 + (i % 2 === 0 ? 0.01 : -0.01),
      }));
      const res = calculateForecastCone(lowPriceCandles);
      expect(res.timeNodes.length).toBe(4);
      const futureNodes = res.timeNodes.slice(1);
      const t10 = res.timeNodes[3];
      expect(t10.upperPrice).toBeGreaterThan(t10.medianPrice);
      expect(t10.medianPrice).toBeGreaterThan(t10.lowerPrice);
      // 僅檢查未來節點 (3/5/10日後) 必須具備第 2 位小數精度 (舊實作 toFixed(1) 會全部截成 1 位小數)
      const futurePrices = futureNodes.flatMap((n) => [n.upperPrice, n.medianPrice, n.lowerPrice]);
      expect(futurePrices.some((p) => Math.abs(Math.round(p * 10) - p * 10) > 1e-6)).toBe(true);
    });

    it('空 K 線或不足 2 根應回傳全 0 與空 timeNodes，移除 2290 / 47/11/42 / 19.7% 假預設值', () => {
      for (const input of [[], [{ close: 150 }]]) {
        const res = calculateForecastCone(input);
        expect(res.timeNodes).toEqual([]);
        expect(res.bullishProb).toBe(0);
        expect(res.rangeProb).toBe(0);
        expect(res.bearishProb).toBe(0);
        expect(res.annualizedDriftPercent).toBe(0);
      }
    });
  });

  describe('7. mainForceSemanticEngine — 美股機構量價語意與移除寫死預設值', () => {
    it('美股模式應輸出機構量價 semanticTag 與真實機構動詞，且絕不出現「法人近 5 日合計 +0 張」或「元」', () => {
      const lockUp = synthesizeMainForceVerdict({
        market: 'US',
        usMicroScore: 78,
        vwapBiasPercent: 4.2,
        rsi: 64,
        rvol: 1.65,
      });
      expect(lockUp.primaryVerb).toBe('鎖碼推升');
      expect(lockUp.semanticTag).toBe('機構量價');
      expect(lockUp.fullVerdictText).toContain('78');
      expect(lockUp.fullVerdictText).toContain('1.65');
      expect(lockUp.fullVerdictText).toContain('+4.2%');
      expect(lockUp.fullVerdictText).not.toContain('法人近 5 日合計');
      expect(lockUp.fullVerdictText).not.toContain('張');
      expect(lockUp.fullVerdictText).not.toContain('元');

      const dipBuy = synthesizeMainForceVerdict({
        market: 'US',
        usMicroScore: 68,
        vwapBiasPercent: -1.5,
        rsi: 46,
        rvol: 1.3,
      });
      expect(dipBuy.primaryVerb).toBe('低接吸籌');
      expect(dipBuy.semanticTag).toBe('機構量價');

      const highTrim = synthesizeMainForceVerdict({
        market: 'US',
        usMicroScore: 42,
        vwapBiasPercent: 6.5,
        rsi: 72,
        rvol: 1.4,
      });
      expect(highTrim.primaryVerb).toBe('高檔調節');

      const heavySell = synthesizeMainForceVerdict({
        market: 'US',
        usMicroScore: 28,
        vwapBiasPercent: -5.2,
        rsi: 30,
        rvol: 1.8,
      });
      expect(heavySell.primaryVerb).toBe('賣壓沉重');

      const oversoldBounce = synthesizeMainForceVerdict({
        market: 'US',
        usMicroScore: 52,
        vwapBiasPercent: -4.8,
        rsi: 28,
        rvol: 1.25,
      });
      expect(oversoldBounce.primaryVerb).toBe('超跌反彈');

      const sideways = synthesizeMainForceVerdict({
        market: 'US',
        usMicroScore: 50,
        vwapBiasPercent: 0.4,
        rsi: 50,
        rvol: 0.95,
      });
      expect(sideways.primaryVerb).toBe('區間整理');
    });

    it('未傳參數時不應再使用寫死假預設值 (-64 張 / +7.5% / RSI 60)', () => {
      const res = synthesizeMainForceVerdict();
      expect(res.primaryVerb).toBe('區間整理');
      expect(res.fullVerdictText).not.toContain('-64');
      expect(res.fullVerdictText).not.toContain('+7.5%');
      expect(res.fullVerdictText).toContain('RSI 50');
    });
  });
});
