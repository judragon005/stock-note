import { describe, it, expect } from 'vitest';
import {
  isFinancialIndustry,
  isCyclicalIndustry,
  resolveIndustryAttribute,
  getCashConversionCycleLabel,
  CYCLICAL_INDUSTRY_ALERT_TEXT,
  FINANCIALS_EXEMPTION_NOTE,
} from './industryGate';

describe('Industry Gate & Cyclical Guard Engine (TDD Seam)', () => {
  describe('1. 金融保險業判定與指標豁免閘門 (isFinancialIndustry)', () => {
    it('應能依據台股 28XX 代碼準確識別金控股與銀行保險股', () => {
      expect(isFinancialIndustry('2881')).toBe(true); // 富邦金
      expect(isFinancialIndustry('2882')).toBe(true); // 國泰金
      expect(isFinancialIndustry('2891')).toBe(true); // 中信金
      expect(isFinancialIndustry('2886')).toBe(true); // 兆豐金
      expect(isFinancialIndustry('2834')).toBe(true); // 臺企銀
    });

    it('應能依據美股代碼與產業領域 (Sector/Industry) 準確識別金融機構', () => {
      expect(isFinancialIndustry('JPM')).toBe(true);  // JPMorgan Chase
      expect(isFinancialIndustry('BAC')).toBe(true);  // Bank of America
      expect(isFinancialIndustry('BRK.B')).toBe(true);// Berkshire Hathaway
      expect(isFinancialIndustry('C')).toBe(true);    // Citigroup
      expect(isFinancialIndustry('GS')).toBe(true);   // Goldman Sachs
      expect(isFinancialIndustry('MS')).toBe(true);   // Morgan Stanley

      // 依賴 sector 參數判定
      expect(isFinancialIndustry('XYZ', 'Financial Services')).toBe(true);
      expect(isFinancialIndustry('ABC', 'Banking')).toBe(true);
      expect(isFinancialIndustry('DEF', 'Insurance')).toBe(true);
    });

    it('非金融業標的絕不應被誤判為金融業', () => {
      expect(isFinancialIndustry('2330')).toBe(false); // 台積電 (半導體)
      expect(isFinancialIndustry('2454')).toBe(false); // 聯發科 (IC 設計)
      expect(isFinancialIndustry('2603')).toBe(false); // 長榮 (航運)
      expect(isFinancialIndustry('AAPL')).toBe(false); // Apple
      expect(isFinancialIndustry('NVDA')).toBe(false); // NVIDIA
      expect(isFinancialIndustry('TSLA', 'Consumer Cyclical')).toBe(false);
    });

    it('金融業應回傳專屬豁免備註', () => {
      expect(FINANCIALS_EXEMPTION_NOTE).toContain('存款負債結構豁免');
    });
  });

  describe('2. 強週期景氣循環類股判定與高點警語 (isCyclicalIndustry)', () => {
    it('應能準確識別台股航運、鋼鐵、塑化與記憶體等強週期族群', () => {
      // 航運三雄
      expect(isCyclicalIndustry('2603')).toBe(true); // 長榮
      expect(isCyclicalIndustry('2609')).toBe(true); // 陽明
      expect(isCyclicalIndustry('2615')).toBe(true); // 萬海

      // 鋼鐵族群 (20XX)
      expect(isCyclicalIndustry('2002')).toBe(true); // 中鋼
      expect(isCyclicalIndustry('2014')).toBe(true); // 中鴻

      // 塑化族群 (13XX)
      expect(isCyclicalIndustry('1301')).toBe(true); // 台塑
      expect(isCyclicalIndustry('1303')).toBe(true); // 南亞

      // 記憶體
      expect(isCyclicalIndustry('2408')).toBe(true); // 南亞科
      expect(isCyclicalIndustry('2344')).toBe(true); // 華邦電
    });

    it('應能識別美股強週期航運、原物料與半導體週期標的', () => {
      expect(isCyclicalIndustry('ZIM')).toBe(true); // ZIM Integrated Shipping
      expect(isCyclicalIndustry('CLF')).toBe(true); // Cleveland-Cliffs (鋼鐵)
      expect(isCyclicalIndustry('MU')).toBe(true);  // Micron Technology (記憶體)
      expect(isCyclicalIndustry('MOS')).toBe(true); // Mosaic (肥料原物料)

      expect(isCyclicalIndustry('SOME_STOCK', 'Basic Materials')).toBe(true);
      expect(isCyclicalIndustry('SOME_SHIP', 'Marine Shipping')).toBe(true);
    });

    it('非強週期股不應觸發循環標記', () => {
      expect(isCyclicalIndustry('2330')).toBe(false); // 台積電 (先進製程定價權強)
      expect(isCyclicalIndustry('AAPL')).toBe(false); // Apple
      expect(isCyclicalIndustry('MSFT')).toBe(false); // Microsoft
    });

    it('強週期股應提供專屬高點反轉警語文字', () => {
      expect(CYCLICAL_INDUSTRY_ALERT_TEXT).toContain('景氣循環提醒');
      expect(CYCLICAL_INDUSTRY_ALERT_TEXT).toContain('勿將單季高獲利盲目年化');
    });
  });

  describe('3. 綜合屬性解析 (resolveIndustryAttribute)', () => {
    it('中信金應解析為 FINANCIALS 屬性', () => {
      expect(resolveIndustryAttribute('2891')).toBe('FINANCIALS');
    });

    it('長榮海運應解析為 CYCLICAL 屬性', () => {
      expect(resolveIndustryAttribute('2603')).toBe('CYCLICAL');
    });

    it('台積電與蘋果應解析為 STANDARD 屬性', () => {
      expect(resolveIndustryAttribute('2330')).toBe('STANDARD');
      expect(resolveIndustryAttribute('AAPL')).toBe('STANDARD');
    });

    it('應能正確解析現金轉換週期 CCC 標籤', () => {
      expect(getCashConversionCycleLabel(20)).toBeTruthy();
      expect(getCashConversionCycleLabel(120)).toBeTruthy();
    });
  });
});
