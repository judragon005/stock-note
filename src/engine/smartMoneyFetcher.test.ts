import { describe, it, expect, vi } from 'vitest';
import {
  parseTwseT86Report,
  parseTpexInstitutionalReport,
  toRocDateString,
  getLatestTradingDateString,
  fetchTwseInstitutionalReport,
  fetchTwseInstitutionalReportDetailed,
  fetchRecentTwseReports,
  isInstitutionalReportComplete,
  fetchWithRetry,
  fetchUsMarketRealData,
} from './smartMoneyFetcher';
import * as db from '../utils/db';

describe('smartMoneyFetcher (籌碼資料管線與解析)', () => {
  describe('parseTwseT86Report (TWSE T86 官方日報 JSON 解析器)', () => {
    it('資料為空或非 OK 狀態時返回空物件', () => {
      expect(parseTwseT86Report(null)).toEqual({});
      expect(parseTwseT86Report({ stat: '很抱歉，沒有符合條件的資料!' })).toEqual({});
      expect(parseTwseT86Report({ stat: 'OK', data: [] })).toEqual({});
    });

    it('正確解析證交所 T86 表格，去除逗號並將股數換算為整數', () => {
      const mockTwseJson = {
        stat: 'OK',
        date: '20260904',
        data: [
          [
            '2330', // 證券代號
            '台積電', // 證券名稱
            '25,412,000', // 外陸資買進股數
            '15,210,000', // 外陸資賣出股數
            '10,202,000', // 外陸資買賣超股數
            '0', // 外資自營商買進
            '0', // 外資自營商賣出
            '0',
            '3,500,000', // 投信買進股數
            '500,000', // 投信賣出股數
            '3,000,000', // 投信買賣超股數
            '1,200,000', // 自營商買賣超股數
          ],
          [
            '0050',
            '元大台灣50',
            '5,000,000',
            '8,000,000',
            '-3,000,000',
            '0',
            '0',
            '0',
            '1,000,000',
            '200,000',
            '800,000',
            '500,000',
          ],
        ],
      };

      const result = parseTwseT86Report(mockTwseJson);
      expect(result['2330']).toBeDefined();
      const tsmc = result['2330'];
      expect(tsmc.symbol).toBe('2330');
      expect(tsmc.name).toBe('台積電');
      // 股數換算為張數 (除以 1000)
      expect(tsmc.foreignBuyShares).toBe(25412);
      expect(tsmc.foreignSellShares).toBe(15210);
      expect(tsmc.foreignNetShares).toBe(10202);
      expect(tsmc.trustBuyShares).toBe(3500);
      expect(tsmc.trustSellShares).toBe(500);
      expect(tsmc.trustNetShares).toBe(3000);
      expect(tsmc.dealerNetShares).toBe(1200);

      expect(result['0050']).toBeDefined();
      expect(result['0050'].foreignNetShares).toBe(-3000);
      expect(result['0050'].trustNetShares).toBe(800);
    });
  });

  describe('getLatestTradingDateString (取得最新可能交易日 YYYYMMDD)', () => {
    it('回傳 8 碼日期字串且格式正確', () => {
      const dateStr = getLatestTradingDateString(new Date('2026-09-07T16:00:00+08:00'));
      expect(dateStr).toMatch(/^\d{8}$/);
      expect(dateStr).toBe('20260907');
    });

    it('遇週日自動往前推算至週五', () => {
      const sunday = new Date('2026-09-06T12:00:00+08:00'); // 週日
      const dateStr = getLatestTradingDateString(sunday);
      expect(dateStr).toBe('20260904'); // 週五
    });

    it('遇週一早上盤前 (15:00 前) 自動推算至上一週五', () => {
      const mondayMorning = new Date('2026-09-07T10:00:00+08:00'); // 週一 10:00
      const dateStr = getLatestTradingDateString(mondayMorning);
      expect(dateStr).toBe('20260904'); // 週五
    });
  });

  describe('fetchTwseInstitutionalReport (網路請求與容錯降級)', () => {
    it('成功時正確呼叫 customFetch 並回傳解析結果', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        stat: 'OK',
        date: '20260904',
        data: [
          ['2330', '台積電', '10,000,000', '5,000,000', '5,000,000', '0', '0', '0', '1,000,000', '0', '1,000,000', '0'],
        ],
      });

      const report = await fetchTwseInstitutionalReport('20260904', mockFetch);
      expect(mockFetch).toHaveBeenCalled();
      expect(report['2330']).toBeDefined();
      expect(report['2330'].foreignNetShares).toBe(5000);
    });

    it('當日無資料 (非交易日) 時自動往前搜尋前一日直至成功', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((_url: string) => {
        callCount++;
        if (callCount === 1) {
          // 第一次查詢回傳非交易日
          return Promise.resolve({ stat: '很抱歉，沒有符合條件的資料!' });
        }
        // 第二次查詢成功
        return Promise.resolve({
          stat: 'OK',
          date: '20260903',
          data: [
            ['2330', '台積電', '2,000,000', '1,000,000', '1,000,000', '0', '0', '0', '500,000', '0', '500,000', '0'],
          ],
        });
      });

      const report = await fetchTwseInstitutionalReport('20260904', mockFetch, 2);
      expect(callCount).toBe(2);
      expect(report['2330']).toBeDefined();
    });

    it('支援 forceRefresh 參數，略過快取直接重新拉取', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        stat: 'OK',
        date: '20260904',
        data: [
          ['2330', '台積電', '1,000,000', '0', '1,000,000', '0', '0', '0', '0', '0', '0', '0'],
        ],
      });

      const report = await fetchTwseInstitutionalReport('20260904', mockFetch, 1, true);
      expect(mockFetch).toHaveBeenCalled();
      expect(report['2330']).toBeDefined();
    });
  });

  describe('fetchRecentTwseReports (增量獲取並持久化歷史交易日日報)', () => {
    it('能依序向前拉取多個有效交易日並按日期升冪排序', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        const match = url.match(/date=(\d{8})/);
        const date = match ? match[1] : '20260904';
        return Promise.resolve({
          stat: 'OK',
          date,
          data: [
            ['2330', '台積電', '10,000,000', '5,000,000', '5,000,000', '0', '0', '0', '1,000,000', '0', '1,000,000', '0'],
          ],
        });
      });

      const reports = await fetchRecentTwseReports(2, '20260904', mockFetch);
      expect(reports).toHaveLength(2);
      // 由舊到新排序 (例如 20260903, 20260904)
      expect(Number(reports[0].date)).toBeLessThan(Number(reports[1].date));
      expect(reports[0].data['2330']).toBeDefined();
    });
  });

  describe('parseTpexInstitutionalReport (TPEx 櫃買中心上櫃三大法人日報解析器)', () => {
    it('資料為空或異常時安全回傳空物件', () => {
      expect(parseTpexInstitutionalReport(null)).toEqual({});
      expect(parseTpexInstitutionalReport({ aaData: [] })).toEqual({});
      expect(parseTpexInstitutionalReport({ tables: [{ data: [] }] })).toEqual({});
    });

    it('正確解析 TPEx 官方最新 tables[0].data 24 欄格式，換算 8299 群聯真實三大法人張數', () => {
      // 模擬 TPEx 官方 3itrade_hedge_result.php 真實資料結構
      const mockOfficialTpexJson = {
        columnNum: 25,
        tables: [
          {
            title: '三大法人買賣明細資訊',
            date: '115/09/04',
            fields: [
              '代號', '名稱',
              '買進股數', '賣出股數', '買賣超股數', // 2..4: 外資及陸資(不含自營)
              '買進股數', '賣出股數', '買賣超股數', // 5..7: 外資自營商
              '買進股數', '賣出股數', '買賣超股數', // 8..10: 外資及陸資合計
              '買進股數', '賣出股數', '買賣超股數', // 11..13: 投信
              '買進股數', '賣出股數', '買賣超股數', // 14..16: 自營商(自行買賣)
              '買進股數', '賣出股數', '買賣超股數', // 17..19: 自營商(避險)
              '買進股數', '賣出股數', '買賣超股數', // 20..22: 自營商合計
              '三大法人買賣超股數合計',             // 23
            ],
            data: [
              [
                '8299', '群聯',
                '1,177,091', '1,054,951', '122,140', // 2..4
                '0', '0', '0',                       // 5..7
                '1,177,091', '1,054,951', '122,140', // 8..10 外資合計 (+122張)
                '1,600', '24,000', '-22,400',        // 11..13 投信 (-22張)
                '32,200', '8,400', '23,800',         // 14..16
                '152,267', '119,167', '33,100',      // 17..19
                '184,467', '127,567', '56,900',      // 20..22 自營商合計 (+57張)
                '156,640',                           // 23 三大法人合計 (+157張)
              ],
            ],
          },
        ],
      };

      const result = parseTpexInstitutionalReport(mockOfficialTpexJson);
      expect(result['8299']).toBeDefined();
      const phison = result['8299'];
      expect(phison.symbol).toBe('8299');
      expect(phison.name).toBe('群聯');
      // 外資及陸資合計: 122,140 / 1000 = 122 張
      expect(phison.foreignBuyShares).toBe(1177);
      expect(phison.foreignSellShares).toBe(1055);
      expect(phison.foreignNetShares).toBe(122);
      // 投信: -22,400 / 1000 = -22 張
      expect(phison.trustBuyShares).toBe(2);
      expect(phison.trustSellShares).toBe(24);
      expect(phison.trustNetShares).toBe(-22);
      // 自營商合計: 56,900 / 1000 = 57 張
      expect(phison.dealerNetShares).toBe(57);
      // 三大法人合計: 156,640 / 1000 = 157 張
      expect(phison.totalNetShares).toBe(157);
    });

    it('向下相容 12 欄簡化格式', () => {
      const mockLegacyTpexJson = {
        reportDate: '115/09/04',
        aaData: [
          [
            '8299', // 0: 股票代號
            '群聯', // 1: 股票名稱
            '1,500,000', // 2: 外資買進股數
            '500,000',   // 3: 外資賣出股數
            '1,000,000', // 4: 外資買賣超股數
            '800,000',   // 5: 投信買進股數
            '100,000',   // 6: 投信賣出股數
            '700,000',   // 7: 投信買賣超股數
            '300,000',   // 8: 自營商買進
            '100,000',   // 9: 自營商賣出
            '200,000',   // 10: 自營商買賣超
            '1,900,000', // 11: 三大法人合計淨買超
          ],
        ],
      };

      const result = parseTpexInstitutionalReport(mockLegacyTpexJson);
      expect(result['8299']).toBeDefined();
      const phison = result['8299'];
      expect(phison.foreignNetShares).toBe(1000);
      expect(phison.trustNetShares).toBe(700);
      expect(phison.dealerNetShares).toBe(200);
      expect(phison.totalNetShares).toBe(1900);
    });
  });

  describe('toRocDateString (西元轉民國年日期字串)', () => {
    it('將 20260904 轉為 115/09/04', () => {
      expect(toRocDateString('20260904')).toBe('115/09/04');
      expect(toRocDateString('20240105')).toBe('113/01/05');
    });
  });

  describe('Spec 0117: 籌碼日報 Last Known Good 哨兵與 15:30 盤中回溯 (Ticket 01)', () => {
    it('15:30 閥值：盤中 15:20 應自動退回前一交易日，15:30 之後才視為當日', () => {
      // 2026-09-11 (週五) 15:20:00 -> 尚未滿 15:30，應退到 20260910
      const friday1520 = new Date('2026-09-11T15:20:00+08:00');
      expect(getLatestTradingDateString(friday1520)).toBe('20260910');

      // 2026-09-11 (週五) 15:35:00 -> 已過 15:30，應為 20260911
      const friday1535 = new Date('2026-09-11T15:35:00+08:00');
      expect(getLatestTradingDateString(friday1535)).toBe('20260911');
    });

    it('fetchTwseInstitutionalReportDetailed: 成功回傳結構化 InstitutionalReportResult (含 reportDate, isLiveToday, totalSymbols)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        stat: 'OK',
        date: '20260910',
        data: [
          ['2330', '台積電', '10,000,000', '5,000,000', '5,000,000', '0', '0', '0', '1,000,000', '0', '1,000,000', '0'],
          ['2327', '國巨', '3,000,000', '1,000,000', '2,000,000', '0', '0', '0', '500,000', '0', '500,000', '0'],
        ],
      });

      const res = await fetchTwseInstitutionalReportDetailed('20260910', mockFetch);
      expect(res.reportDate).toBe('20260910');
      expect(res.totalSymbols).toBeGreaterThanOrEqual(2);
      expect(res.data['2330']).toBeDefined();
      expect(res.data['2327']).toBeDefined();
      expect(res.data['2327'].foreignNetShares).toBe(2000);
    });

    it('當線上所有請求失敗時，能自動從 IndexedDB 回溯命中最新有效快取，絕不回傳空字典', async () => {
      // 模擬 IndexedDB 中有 20260908 之歷史快取
      vi.spyOn(db, 'dbGet').mockImplementation((_store: string, key: string) => {
        if (key.includes('20260908')) {
          return Promise.resolve({
            key: 'TWSE_TPEX_CHIPS_V4_20260908',
            date: '20260908',
            data: {
              '2330': {
                symbol: '2330',
                name: '台積電',
                foreignBuyShares: 1000,
                foreignSellShares: 500,
                foreignNetShares: 500,
                trustBuyShares: 0,
                trustSellShares: 0,
                trustNetShares: 0,
                dealerNetShares: 0,
                totalNetShares: 500,
              },
            },
            updatedAt: Date.now(),
          });
        }
        return Promise.resolve(null);
      });

      // 線上請求全部被拒絕或逾時
      const failingFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const res = await fetchTwseInstitutionalReportDetailed('20260910', failingFetch, 3);
      expect(res.data['2330']).toBeDefined();
      expect(res.reportDate).toBe('20260908');
      expect(res.totalSymbols).toBe(1);
    });
  });

  describe('Spec 0119: 籌碼日報多維哨兵校驗與優雅降級回退 T-1 (Ticket 01)', () => {
    describe('isInstitutionalReportComplete (日報完整度哨兵)', () => {
      it('空資料、null 或未定義時回傳 false', () => {
        expect(isInstitutionalReportComplete(null)).toBe(false);
        expect(isInstitutionalReportComplete(undefined)).toBe(false);
        expect(isInstitutionalReportComplete({})).toBe(false);
      });

      it('檔數不足預設門檻 (如 894 檔，正常 >= 1200 檔) 時回傳 false', () => {
        const incompleteData: Record<string, any> = {};
        for (let i = 0; i < 894; i++) {
          incompleteData[`SYM_${i}`] = {
            symbol: `SYM_${i}`,
            foreignNetShares: 10,
            trustNetShares: 5,
            dealerNetShares: 2,
            totalNetShares: 17,
          };
        }
        expect(isInstitutionalReportComplete(incompleteData)).toBe(false);
      });

      it('全市場檔數雖然足夠，但所有股票三大法人買賣超全為 0 時回傳 false', () => {
        const zeroData: Record<string, any> = {};
        for (let i = 0; i < 1500; i++) {
          zeroData[`SYM_${i}`] = {
            symbol: `SYM_${i}`,
            foreignNetShares: 0,
            trustNetShares: 0,
            dealerNetShares: 0,
            totalNetShares: 0,
          };
        }
        expect(isInstitutionalReportComplete(zeroData)).toBe(false);
      });

      it('檔數充足且前 30 大股票有活躍三大法人買賣超時回傳 true', () => {
        const validData: Record<string, any> = {};
        for (let i = 0; i < 1500; i++) {
          validData[`SYM_${i}`] = {
            symbol: `SYM_${i}`,
            foreignNetShares: i === 0 ? 500 : 0,
            trustNetShares: i === 1 ? 200 : 0,
            dealerNetShares: 0,
            totalNetShares: i === 0 ? 500 : (i === 1 ? 200 : 0),
          };
        }
        expect(isInstitutionalReportComplete(validData)).toBe(true);
      });
    });

    describe('fetchTwseInstitutionalReportDetailed (優雅降級回退 T-1 實測)', () => {
      it('當最新一日抓取的資料未完整 (如僅 894 檔) 時，系統自動優雅回退 T-1 完整日報，且 isLiveToday = false', async () => {
        // 今日 20260911 只抓到 894 檔 (半殘資料)
        const partialData20260911: any[][] = [];
        for (let i = 0; i < 894; i++) {
          partialData20260911.push([
            `SYM_${i}`, `股_${i}`, '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'
          ]);
        }

        // 前一日 20260910 則是完整 1500 檔且有交易量
        const completeData20260910: any[][] = [];
        for (let i = 0; i < 1500; i++) {
          completeData20260910.push([
            `SYM_${i}`, `股_${i}`, '1,000,000', '500,000', '500,000', '0', '0', '0', '200,000', '0', '200,000', '0'
          ]);
        }

        const mockFetch = vi.fn().mockImplementation((url: string) => {
          if (url.includes('20260911') || url.includes('115/09/11')) {
            return Promise.resolve({
              stat: 'OK',
              date: '20260911',
              data: partialData20260911,
            });
          }
          if (url.includes('20260910') || url.includes('115/09/10')) {
            return Promise.resolve({
              stat: 'OK',
              date: '20260910',
              data: completeData20260910,
            });
          }
          return Promise.reject(new Error('No data'));
        });

        const res = await fetchTwseInstitutionalReportDetailed('20260911', mockFetch, 5, true);
        // 應自動退回到 20260910 完整日報
        expect(res.reportDate).toBe('20260910');
        expect(res.isLiveToday).toBe(false);
        expect(res.fallbackReason).toBe('INCOMPLETE_DATA');
        expect(res.totalSymbols).toBeGreaterThanOrEqual(1500);
      });
    });
  });

  describe('Spec 0120: 台美雙市場全量籌碼零遺漏、雙軌原子合流與真實 20D CMF 入庫防禦', () => {
    describe('fetchWithRetry (智慧指數退避重試)', () => {
      it('首次失敗但在重試次數內成功時，應成功回傳結果', async () => {
        let attempts = 0;
        const flakeyFn = vi.fn().mockImplementation(async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error('Network timeout');
          }
          return { success: true };
        });

        const res = await fetchWithRetry(flakeyFn, 3, 50);
        expect(res).toEqual({ success: true });
        expect(attempts).toBe(2);
      });

      it('若遇到明確 404 錯誤應立即中斷重試，杜絕浪費連線', async () => {
        let attempts = 0;
        const notFoundFn = vi.fn().mockImplementation(async () => {
          attempts++;
          throw new Error('HTTP 404 Not Found');
        });

        await expect(fetchWithRetry(notFoundFn, 3, 50)).rejects.toThrow('404');
        expect(attempts).toBe(1);
      });
    });

    describe('isInstitutionalReportComplete 雙市場雙哨兵檢驗', () => {
      it('全市場規模下，若有台積電 2330 卻缺少群聯 8299 應判定為單邊殘缺 (回傳 false)', () => {
        const twseOnlyData: Record<string, any> = {
          '2330': { symbol: '2330', foreignNetShares: 1000, trustNetShares: 500, dealerNetShares: 200, totalNetShares: 1700 },
        };
        for (let i = 0; i < 1300; i++) {
          twseOnlyData[`TWSE_${i}`] = { symbol: `TWSE_${i}`, foreignNetShares: 10, trustNetShares: 5, dealerNetShares: 2, totalNetShares: 17 };
        }
        expect(isInstitutionalReportComplete(twseOnlyData)).toBe(false);
      });

      it('全市場規模下，若有群聯 8299 卻缺少台積電 2330 應判定為單邊殘缺 (回傳 false)', () => {
        const tpexOnlyData: Record<string, any> = {
          '8299': { symbol: '8299', foreignNetShares: 800, trustNetShares: 300, dealerNetShares: 100, totalNetShares: 1200 },
        };
        for (let i = 0; i < 890; i++) {
          tpexOnlyData[`TPEX_${i}`] = { symbol: `TPEX_${i}`, foreignNetShares: 10, trustNetShares: 5, dealerNetShares: 2, totalNetShares: 17 };
        }
        expect(isInstitutionalReportComplete(tpexOnlyData)).toBe(false);
      });

      it('全市場規模下，同時涵蓋台積電 2330 與群聯 8299 且總數達 1800 檔以上，應通過檢驗 (回傳 true)', () => {
        const fullMarketData: Record<string, any> = {
          '2330': { symbol: '2330', foreignNetShares: 1000, trustNetShares: 500, dealerNetShares: 200, totalNetShares: 1700 },
          '8299': { symbol: '8299', foreignNetShares: 800, trustNetShares: 300, dealerNetShares: 100, totalNetShares: 1200 },
        };
        for (let i = 0; i < 2200; i++) {
          fullMarketData[`SYM_${i}`] = { symbol: `SYM_${i}`, foreignNetShares: 10, trustNetShares: 5, dealerNetShares: 2, totalNetShares: 17 };
        }
        expect(isInstitutionalReportComplete(fullMarketData)).toBe(true);
      });
    });

    describe('fetchUsMarketRealData (美股真實日 K 抓取與 CMF 計算)', () => {
      it('能透過 Yahoo Finance API 拉取 3 個月日 K，計算出標準 20D CMF 並產出 5 日時序位移點', async () => {
        // 模擬 30 根真實日 K
        const timestamps: number[] = [];
        const opens: number[] = [];
        const highs: number[] = [];
        const lows: number[] = [];
        const closes: number[] = [];
        const volumes: number[] = [];

        const baseTime = 1757000000;
        for (let i = 0; i < 30; i++) {
          timestamps.push(baseTime + i * 86400);
          opens.push(100 + i);
          highs.push(105 + i);
          lows.push(95 + i);
          closes.push(104 + i); // 收盤偏向高點 (多方吸籌)
          volumes.push(2000000);
        }

        const mockYahooData = {
          chart: {
            result: [
              {
                meta: { symbol: 'NVDA' },
                timestamp: timestamps,
                indicators: {
                  quote: [
                    {
                      open: opens,
                      high: highs,
                      low: lows,
                      close: closes,
                      volume: volumes,
                    },
                  ],
                },
              },
            ],
          },
        };

        const mockFetch = vi.fn().mockResolvedValue(mockYahooData);
        const result = await fetchUsMarketRealData(['NVDA'], mockFetch, true);

        expect(mockFetch).toHaveBeenCalled();
        expect(result['NVDA']).toBeDefined();
        const nvda = result['NVDA'];
        expect(nvda.symbol).toBe('NVDA');
        expect(nvda.currentPrice).toBe(133); // 104 + 29
        expect(nvda.candles.length).toBe(30);
        expect(nvda.cmf).toBeGreaterThan(0); // 應為正向吸籌
        expect(nvda.historicalDailyFlows.length).toBe(5);
      });
    });
  });
});




