import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveOfficialSecurityName,
  searchStockSuggestions,
  registerCustomStockName,
  clearCustomStockNames,
  getStockDictionaryStats,
  getAllStockDictionaryItems,
} from './stockNameResolver';

describe('StockNameResolver Engine (TDD Seam)', () => {
  beforeEach(() => {
    clearCustomStockNames();
  });

  describe('1. resolveOfficialSecurityName 全域名稱解析', () => {
    it('應正確解析台股官方上市、上櫃與熱門 ETF 中文名稱', () => {
      expect(resolveOfficialSecurityName('2330')).toBe('台積電');
      expect(resolveOfficialSecurityName('0050')).toBe('元大台灣50');
      expect(resolveOfficialSecurityName('00878')).toBe('國泰永續高股息');
      expect(resolveOfficialSecurityName('2454')).toBe('聯發科');
      expect(resolveOfficialSecurityName('6547')).toBe('高端疫苗');
      expect(resolveOfficialSecurityName('2755')).toBe('揚秦');
    });

    it('應正確解析美股主要指數、成分股與 ETF 繁體中文名稱', () => {
      expect(resolveOfficialSecurityName('AAPL')).toBe('蘋果');
      expect(resolveOfficialSecurityName('NVDA')).toBe('輝達');
      expect(resolveOfficialSecurityName('MSFT')).toBe('微軟');
      expect(resolveOfficialSecurityName('VOO')).toBe('Vanguard標普500 ETF');
      expect(resolveOfficialSecurityName('VT')).toBe('Vanguard全世界股票ETF');
      expect(resolveOfficialSecurityName('TLT')).toBe('iShares 20年期以上美國公債ETF');
    });

    it('應自動容錯處理大小寫與多餘空格', () => {
      expect(resolveOfficialSecurityName('  2330  ')).toBe('台積電');
      expect(resolveOfficialSecurityName('aapl')).toBe('蘋果');
      expect(resolveOfficialSecurityName(' nvda ')).toBe('輝達');
    });

    it('查無字典紀錄時應優雅退回 fallbackName 或大寫代碼', () => {
      expect(resolveOfficialSecurityName('UNKNOWN123', '自訂冷門股')).toBe('自訂冷門股');
      expect(resolveOfficialSecurityName('XYZ999')).toBe('XYZ999');
    });

    it('應支援自訂名稱覆蓋並優先於靜態字典', () => {
      expect(resolveOfficialSecurityName('2330')).toBe('台積電');
      registerCustomStockName('2330', '護國神山台積電', 'TW');
      expect(resolveOfficialSecurityName('2330')).toBe('護國神山台積電');
    });
  });

  describe('2. searchStockSuggestions 雙向模糊智慧搜尋', () => {
    it('依代碼前綴搜尋應正確回傳候選標的並依關聯度排序', () => {
      const results = searchStockSuggestions('233', 'TW', 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.symbol === '2330' && r.name === '台積電')).toBe(true);
    });

    it('依中文關鍵字搜尋台股與美股標的', () => {
      const twResults = searchStockSuggestions('台積', 'TW', 5);
      expect(twResults.length).toBeGreaterThan(0);
      expect(twResults[0].symbol).toBe('2330');

      const usResults = searchStockSuggestions('蘋果', 'US', 5);
      expect(usResults.length).toBeGreaterThan(0);
      expect(usResults[0].symbol).toBe('AAPL');
    });

    it('若輸入英文公司名，亦能精確搜尋美股標的', () => {
      const usResults = searchStockSuggestions('Tesla', 'US', 5);
      expect(usResults.length).toBeGreaterThan(0);
      expect(usResults[0].symbol).toBe('TSLA');
    });

    it('應包含使用者動態自訂或同步之標的', () => {
      registerCustomStockName('CUSTOM99', '神秘潛力股', 'TW');
      const results = searchStockSuggestions('神秘', 'TW', 5);
      expect(results.some((r) => r.symbol === 'CUSTOM99')).toBe(true);
    });
  });

  describe('3. getStockDictionaryStats 統計資訊計算', () => {
    it('應正確回傳字典總數與市場分佈', () => {
      const stats = getStockDictionaryStats();
      expect(stats.totalCount).toBeGreaterThan(600);
      expect(stats.twCount).toBeGreaterThan(50);
      expect(stats.usCount).toBeGreaterThan(500);
      expect(stats.customCount).toBe(0);

      registerCustomStockName('NEW1', '新標的1', 'TW');
      const updatedStats = getStockDictionaryStats();
      expect(updatedStats.customCount).toBe(1);

      const allItems = getAllStockDictionaryItems();
      expect(allItems.length).toBe(updatedStats.totalCount);
      expect(allItems.some((item) => item.symbol === 'NEW1')).toBe(true);
    });
  });
});
