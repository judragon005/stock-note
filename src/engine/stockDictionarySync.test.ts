import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncOfficialTaiwanStockList, isValidTaiwanSecurity } from './stockDictionarySync';
import { getStockDictionaryStats, clearCustomStockNames } from './stockNameResolver';

describe('StockDictionarySync Engine (TDD Seam)', () => {
  beforeEach(() => {
    clearCustomStockNames();
    vi.restoreAllMocks();
  });

  describe('1. isValidTaiwanSecurity 權證與合規標的過濾', () => {
    it('應允許合法股票、ETF、特別股與興櫃標的', () => {
      expect(isValidTaiwanSecurity('2330', '台積電')).toBe(true);
      expect(isValidTaiwanSecurity('6547', '高端疫苗')).toBe(true);
      expect(isValidTaiwanSecurity('0050', '元大台灣50')).toBe(true);
      expect(isValidTaiwanSecurity('00878', '國泰永續高股息')).toBe(true);
      expect(isValidTaiwanSecurity('00679B', '元大美債20年')).toBe(true);
      expect(isValidTaiwanSecurity('2881A', '富邦特')).toBe(true);
      expect(isValidTaiwanSecurity('7700', '興櫃生技')).toBe(true);
      expect(isValidTaiwanSecurity('020000', '富邦特選大股東ETN')).toBe(true);
    });

    it('應精確排除認購售權證、牛熊證與可轉債', () => {
      // 6 碼以 03~08 或 7 開頭之權證
      expect(isValidTaiwanSecurity('712345', '元大3A')).toBe(false);
      expect(isValidTaiwanSecurity('081234', '國泰41')).toBe(false);
      expect(isValidTaiwanSecurity('03123P', '凱基42')).toBe(false);
      // 名稱含購/售/牛/熊/展延
      expect(isValidTaiwanSecurity('123456', '元大3A購01')).toBe(false);
      expect(isValidTaiwanSecurity('123456', '富邦42牛01')).toBe(false);
      expect(isValidTaiwanSecurity('123456', '國泰41售02')).toBe(false);
      expect(isValidTaiwanSecurity('123456', '展延群益3B')).toBe(false);
      // 5 碼可轉債
      expect(isValidTaiwanSecurity('23301', '台積電一')).toBe(false);
      expect(isValidTaiwanSecurity('65472', '高端疫苗二')).toBe(false);
    });
  });

  describe('2. syncOfficialTaiwanStockList 批次同步', () => {
    it('成功自 TWSE 與 TPEx 模擬 API 抓取資料並過濾權證後批次同步至本地字典', async () => {
      const mockTwseData = [
        { Code: '2330', Name: '台積電' },
        { Code: '2454', Name: '聯發科' },
        { Code: '712345', Name: '台積元大3A購01' }, // 應被過濾
        { Code: '9999', Name: '全新上市股' },
      ];
      const mockTpexData = [
        { SecId: '6547', CompanyName: '高端疫苗' },
        { SecId: '081234', CompanyName: '高端國泰41售02' }, // 應被過濾
        { SecId: '8888', CompanyName: '全新上櫃股' },
      ];

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('twse')) {
          return mockTwseData;
        }
        if (url.includes('tpex')) {
          return mockTpexData;
        }
        return [];
      });

      const result = await syncOfficialTaiwanStockList(mockFetch);

      expect(result.success).toBe(true);
      expect(result.twseCount).toBe(3); // 2330, 2454, 9999
      expect(result.tpexCount).toBe(2); // 6547, 8888
      expect(result.totalSynced).toBe(5);

      const stats = getStockDictionaryStats();
      expect(stats.customCount).toBe(5);
    });

    it('當外部 API 拋出異常時，應安全捕獲錯誤並回傳失敗原因，不導致主系統崩潰', async () => {
      const mockFaultyFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await syncOfficialTaiwanStockList(mockFaultyFetch);

      expect(result.success).toBe(false);
      expect(result.totalSynced).toBe(0);
      expect(result.error).toBeDefined();
    });
  });
});
