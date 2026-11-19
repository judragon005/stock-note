import { describe, it, expect } from 'vitest';
import {
  getProgressBarStyle,
  getDayTradeRiskBadge,
  getDayTradeRiskItems,
  formatDayTradeExtraMetrics,
} from './DayTradeRiskCard';

describe('DayTradeRiskCard - 隔日沖風險進度條元件規範 (Ticket 19)', () => {
  describe('getProgressBarStyle - 風險進度條色彩與長度', () => {
    it('百分比大於等於 60% 應判定為高警戒色 (紅色)', () => {
      const style = getProgressBarStyle(62);
      expect(style.color).toBe('#ef4444');
      expect(style.width).toBe('62%');
    });

    it('百分比介於 40% ~ 59% 應為警示色 (黃橙色)', () => {
      const style = getProgressBarStyle(53);
      expect(style.color).toBe('#f59e0b');
      expect(style.width).toBe('53%');
    });

    it('百分比小於 40% 應為安全色 (翠綠色)', () => {
      const style = getProgressBarStyle(30);
      expect(style.color).toBe('#10b981');
      expect(style.width).toBe('30%');
    });

    it('極端值應安全 clamp 於 0% 到 100% 之間', () => {
      expect(getProgressBarStyle(-15).width).toBe('0%');
      expect(getProgressBarStyle(125).width).toBe('100%');
    });
  });

  describe('getDayTradeRiskBadge - 隔日沖綜合等級徽章', () => {
    it('HIGH 為高、MEDIUM 為中、LOW 為低', () => {
      expect(getDayTradeRiskBadge('HIGH').label).toBe('高');
      expect(getDayTradeRiskBadge('HIGH').color).toBe('#ef4444');

      expect(getDayTradeRiskBadge('MEDIUM').label).toBe('中');
      expect(getDayTradeRiskBadge('MEDIUM').color).toBe('#f59e0b');

      expect(getDayTradeRiskBadge('LOW').label).toBe('低');
      expect(getDayTradeRiskBadge('LOW').color).toBe('#10b981');
    });
  });

  describe('getDayTradeRiskItems - 5大指標標籤校準', () => {
    it('應正確輸出 5 項指標，且第 2 項標籤為「籌碼換手率」而非「籌碼過手率」', () => {
      const items = getDayTradeRiskItems({ turnoverRate: 58 });
      expect(items).toHaveLength(5);
      expect(items[1].label).toBe('籌碼換手率');
      expect(items[1].value).toBe(58);
      expect(items.some(i => i.label === '籌碼過手率')).toBe(false);
    });

    it('指標 icon 不應包含系統 Emoji', () => {
      const items = getDayTradeRiskItems({});
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
      items.forEach((item) => {
        expect(emojiRegex.test(item.icon)).toBe(false);
      });
    });
  });

  describe('formatDayTradeExtraMetrics - 借券賣出餘額與融資增減格式化', () => {
    it('當存在 sblBalance 與 marginBalanceChange 時應正確格式化輸出', () => {
      const res = formatDayTradeExtraMetrics({ sblBalance: 1250, marginBalanceChange: -320 });
      expect(res.sblText).toBe('1,250 張');
      expect(res.marginChangeText).toBe('-320 張');
    });

    it('缺少 sblBalance 或 marginBalanceChange 時應回傳 null', () => {
      const res = formatDayTradeExtraMetrics({});
      expect(res.sblText).toBeNull();
      expect(res.marginChangeText).toBeNull();
    });
  });

  describe('Spec 0239 T15: 風險指數一致性、零值中性灰、null 防護與美股語意切換', () => {
    it('底部風險指數應優先顯示 data.riskIndex 而非重算 5 項平均', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { DayTradeRiskCard } = await import('./DayTradeRiskCard');

      // 5 項平均為 (20+20+20+20+20)/5 = 20，但 data.riskIndex 為 73
      const html = renderToStaticMarkup(
        React.createElement(DayTradeRiskCard, {
          data: {
            abnormalSelling: 20,
            turnoverRate: 20,
            dayTradeRatio: 20,
            pullbackRisk: 20,
            intradayVolatility: 20,
            riskLevel: 'HIGH',
            riskIndex: 73,
          },
        })
      );

      expect(html).toContain('73%');
      expect(html).not.toContain('風險指數：</span></span><span style="font-size:0.82rem;font-weight:800;font-family:monospace;color:#ef4444">20%');
    });

    it('shortMarginRatio 為 null 時不應渲染券資比徽章，marginBalanceChange === 0 應顯示中性灰 #94a3b8', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { DayTradeRiskCard } = await import('./DayTradeRiskCard');

      const html = renderToStaticMarkup(
        React.createElement(DayTradeRiskCard, {
          data: {
            abnormalSelling: 40,
            turnoverRate: 45,
            dayTradeRatio: 35,
            pullbackRisk: 30,
            intradayVolatility: 50,
            riskLevel: 'MEDIUM',
            riskIndex: 42,
            shortMarginRatio: null as unknown as number,
            marginBalanceChange: 0,
          },
        })
      );

      expect(html).not.toContain('data-testid="margin-ratio-badge"');
      expect(html).toContain('0 張');
      expect(html).toContain('color:#94a3b8;font-weight:700;font-family:monospace');
    });

    it('第 1 項指標 termId 不應與卡片總覽 dayTradeRisk 重複錯綁', () => {
      const items = getDayTradeRiskItems({});
      expect(items[0].termId).not.toBe('dayTradeRisk');
      expect(items[0].termId).toBeTruthy();
    });

    it('美股模式 (market="US" 或 isUsMarket=true) 應切換為「美股日內波動與換手風險」並呈現 ATR%、RVOL、Short Float (%)，不得含台股詞彙', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { DayTradeRiskCard } = await import('./DayTradeRiskCard');

      const html = renderToStaticMarkup(
        React.createElement(DayTradeRiskCard, {
          market: 'US',
          colorTheme: 'international',
          data: {
            abnormalSelling: 48,
            turnoverRate: 52,
            dayTradeRatio: 44,
            pullbackRisk: 39,
            intradayVolatility: 61,
            riskLevel: 'MEDIUM',
            riskIndex: 51,
            isUsMarket: true,
            atrPercent: 3.45,
            rvol: 1.82,
            shortFloatRatio: 11.4,
            sblBalance: 999,
            marginBalanceChange: 120,
            shortMarginRatio: 25,
          },
        })
      );

      expect(html).toContain('美股日內波動與換手風險');
      expect(html).toContain('ATR%');
      expect(html).toContain('3.45%');
      expect(html).toContain('RVOL');
      expect(html).toContain('1.82x');
      expect(html).toContain('Short Float');
      expect(html).toContain('11.4%');
      expect(html).not.toContain('隔日沖');
      expect(html).not.toContain('券資比');
      expect(html).not.toContain('借券');
      expect(html).not.toContain('融資');
      expect(html).not.toContain('張');
    });
  });
});
