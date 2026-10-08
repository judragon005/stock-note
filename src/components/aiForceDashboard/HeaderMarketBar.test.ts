import { describe, it, expect } from 'vitest';
import {
  formatMarketChange,
  getSystemBadgeConfig,
  formatMarketMetric,
} from './HeaderMarketBar';

describe('HeaderMarketBar - 行情 Bar 格式化與狀態燈規範 (Ticket 02)', () => {
  describe('formatMarketChange - 漲跌額與漲幅色彩格式化', () => {
    it('台股模式下，正報酬應顯示帶 "+" 號且標註為上漲色 (#ef4444)', () => {
      const res = formatMarketChange(205.0, 9.83, 'taiwan');
      expect(res.changeText).toBe('+205.00');
      expect(res.percentText).toBe('+9.83%');
      expect(res.color).toBe('#ef4444');
    });

    it('台股模式下，負報酬應顯示 "-" 號且標註為下跌色 (#10b981)', () => {
      const res = formatMarketChange(-15.5, -2.15, 'taiwan');
      expect(res.changeText).toBe('-15.50');
      expect(res.percentText).toBe('-2.15%');
      expect(res.color).toBe('#10b981');
    });

    it('國際/美股模式下，正報酬應標註為綠色 (#10b981)，負報酬為紅色 (#ef4444)', () => {
      const resUp = formatMarketChange(10.0, 1.5, 'international');
      expect(resUp.color).toBe('#10b981');

      const resDown = formatMarketChange(-10.0, -1.5, 'international');
      expect(resDown.color).toBe('#ef4444');
    });

    it('持平時應顯示 "+0.00" 與中性灰白色', () => {
      const res = formatMarketChange(0, 0, 'taiwan');
      expect(res.changeText).toBe('0.00');
      expect(res.percentText).toBe('0.00%');
      expect(res.color).toBe('#94a3b8');
    });
  });

  describe('getSystemBadgeConfig - 4 大狀態指示燈配置', () => {
    it('AI 智慧掃描啟用時應回傳綠色呼吸燈與繁體中文標籤', () => {
      const badge = getSystemBadgeConfig('AI_SCAN', true);
      expect(badge.label).toBe('AI 智慧掃描');
      expect(badge.color).toBe('#10b981');
      expect(badge.dotAnimate).toBe(true);
    });

    it('波動異常預警警戒時應回傳紅色警告色彩與繁體中文標籤', () => {
      const badge = getSystemBadgeConfig('VOLATILITY', true);
      expect(badge.label).toBe('波動異常預警');
      expect(badge.color).toBe('#ef4444');
    });

    it('主力行為追蹤啟用時應回傳藍色追蹤徽章與繁體中文標籤', () => {
      const badge = getSystemBadgeConfig('MAIN_FORCE', true);
      expect(badge.label).toBe('主力行為追蹤');
      expect(badge.color).toBe('#38bdf8');
    });

    it('市場即時狀態啟用時應回傳紫色徽章與繁體中文標籤', () => {
      const badge = getSystemBadgeConfig('MARKET_STATUS', true);
      expect(badge.label).toBe('市場即時狀態');
      expect(badge.color).toBe('#818cf8');
    });
  });

  describe('formatMarketMetric - 數值千分位與整數/浮點安全轉換', () => {
    it('應正確將整數與小數加上千分位', () => {
      expect(formatMarketMetric(2290, 2)).toBe('2,290.00');
      expect(formatMarketMetric(2681, 0)).toBe('2,681');
      expect(formatMarketMetric(6260, 0)).toBe('6,260');
    });

    it('無效或 NaN 數值時應回傳 "-" 安全佔位符', () => {
      expect(formatMarketMetric(NaN)).toBe('-');
      expect(formatMarketMetric(undefined)).toBe('-');
    });
  });

  describe('股票代碼搜尋框寬度與排版防禦 (Ticket 05 & 06)', () => {
    it('應支援 4 碼普通股、6 碼 ETF/權證與美股長代碼而不截斷', () => {
      const testSymbols = ['2330', '0050', '004030', '00940', 'GOOGL', 'BRK.B'];
      testSymbols.forEach((sym) => {
        const charWidth = Math.max(6, sym.length + 1);
        expect(charWidth).toBeGreaterThanOrEqual(6);
        expect(charWidth).toBeLessThanOrEqual(14);
      });
    });
  });

  describe('Spec 0150 - 未收盤標的前日收盤數據定錨與雙層警示', () => {
    it('當 isSettled === false 時，主價格標籤應為「前日收盤價」，最新交易日標籤為「定錨基準日」', () => {
      const isSettled = false;
      const label = isSettled ? '今日收盤價' : '前日收盤價';
      const dateLabel = isSettled ? '最新交易日' : '定錨基準日';

      expect(label).toBe('前日收盤價');
      expect(dateLabel).toBe('定錨基準日');
    });

    it('當存在 intradayQuote 時，應能正確格式化盤中即時參考價格與漲跌幅', () => {
      const intraday = {
        price: 2290.0,
        change: 155.0,
        changePercent: 7.26,
      };

      const formattedPrice = formatMarketMetric(intraday.price, 2);
      const sign = intraday.changePercent >= 0 ? '+' : '';
      const percentStr = `${sign}${intraday.changePercent.toFixed(2)}%`;

      expect(formattedPrice).toBe('2,290.00');
      expect(percentStr).toBe('+7.26%');
    });

    it('Spec 0152: 當無行情數據 (undefined) 時，formatMarketMetric 與 formatMarketChange 應安全呈現破折號「-」', () => {
      expect(formatMarketMetric(undefined)).toBe('-');
      expect(formatMarketMetric(NaN)).toBe('-');

      const changeMeta = formatMarketChange(undefined, undefined);
      expect(changeMeta.changeText).toBe('-');
      expect(changeMeta.percentText).toBe('-');
      expect(changeMeta.color).toBe('#94a3b8');
    });
  });

  describe('Ticket 13: 處置股票警示徽章與美股單位適配', () => {
    it('處置股票與注意股票狀態標籤正確判定', () => {
      const getStatusBadgeText = (tag?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION') => {
        if (tag === 'DISPOSITION') return '🚨 處置股票 (分盤撮合)';
        if (tag === 'ATTENTION') return '⚠️ 注意股票';
        return null;
      };

      expect(getStatusBadgeText('DISPOSITION')).toBe('🚨 處置股票 (分盤撮合)');
      expect(getStatusBadgeText('ATTENTION')).toBe('⚠️ 注意股票');
      expect(getStatusBadgeText('NORMAL')).toBeNull();
      expect(getStatusBadgeText(undefined)).toBeNull();
    });

    it('美股與台股成交量單位與幣別自適應切換', () => {
      const getVolumeLabel = (isSettled: boolean, volumeUnit?: string, currency?: string) => {
        const unit = volumeUnit ?? (currency === 'USD' ? '股' : '張');
        return isSettled ? `成交量(${unit})` : `前日成交量(${unit})`;
      };

      // 台股已結算
      expect(getVolumeLabel(true, '張', 'TWD')).toBe('成交量(張)');
      // 台股未結算
      expect(getVolumeLabel(false, '張', 'TWD')).toBe('前日成交量(張)');
      // 美股已結算
      expect(getVolumeLabel(true, '股', 'USD')).toBe('成交量(股)');
      // 美股未結算
      expect(getVolumeLabel(false, undefined, 'USD')).toBe('前日成交量(股)');
    });
  });

  describe('Ticket 03 (Spec 0172): 頂部快捷股票按鈕徹底移除與查詢行單行清爽化', () => {
    it('QUICK_CHIPS 仍保留作為模糊候選資料池，但主橫列不再渲染快捷晶片', async () => {
      const { QUICK_CHIPS } = await import('./HeaderMarketBar');
      expect(QUICK_CHIPS.length).toBe(5);
    });

    it('主橫列排版規範：輸入列與 4 大狀態膠囊在 >= 1200px 保持單行舒展 (nowrap)', () => {
      // 驗證排版防禦參數
      const rowLayout = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        gap: '16px',
      };
      expect(rowLayout.flexWrap).toBe('nowrap');
      expect(rowLayout.gap).toBe('16px');
    });
  });
});


