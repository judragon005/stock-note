import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeductionTelescopeTable } from './DeductionTelescopeTable';
import { ScannedStockItem } from '../../../engine/muscleBookerEngine';

const mockItem: ScannedStockItem = {
  symbol: '2330',
  name: '台積電',
  market: 'TW',
  currentPrice: 1020,
  boxStatus: 'BREAKOUT_UP',
  boxUpper: 1000,
  boxLower: 960,
  boxWidthPercent: 4.1,
  isBottomPenetration: false,
  ma20Slope: 'UP',
  ma20DeductionPrice: 980,
  isBollingerSqueeze: false,
  bollingerBandwidth: 6.2,
  actionDecision: {
    action: 'BUY',
    actionBadge: '🔥 箱頂突破',
    actionReason: '突破箱頂測試',
    stopLossPrice: 1000,
    targetPrice: 1080,
    riskRewardRatioValue: 4.0,
  },
  candles: [
    { date: '2026-11-01', open: 990, high: 1005, low: 985, close: 1000, volume: 20000 },
    { date: '2026-11-02', open: 1005, high: 1025, low: 1000, close: 1020, volume: 30000 },
  ],
};

const mockSellItem: ScannedStockItem = {
  ...mockItem,
  symbol: '2454',
  name: '聯發科',
  actionDecision: {
    action: 'SELL',
    actionBadge: '⚠️ 跌破箱底',
    actionReason: '跌破箱底停損測試',
    stopLossPrice: 960,
  },
};

describe('DeductionTelescopeTable (均線扣抵望遠鏡排表組件測試)', () => {
  it('應正確渲染扣抵表基本欄位、標的代號、現價與扣抵價', () => {
    const html = renderToStaticMarkup(
      <DeductionTelescopeTable
        filteredItems={[mockItem]}
        watchlistSymbols={[]}
        expandedSymbol={null}
        onToggleExpand={() => {}}
        onToggleWatchlist={() => {}}
      />
    );

    expect(html).toContain('2330');
    expect(html).toContain('台積電');
    expect(html).toContain('$1,020');
    expect(html).toContain('$980');
    expect(html).toContain('扣低翻揚助漲');
  });

  it('Issue #411: 當傳入 onQuickTrade 時，應正確渲染快速交易下單與賣出按鈕', () => {
    // 買進標的應顯示「下單」
    const htmlBuy = renderToStaticMarkup(
      <DeductionTelescopeTable
        filteredItems={[mockItem]}
        watchlistSymbols={[]}
        expandedSymbol={null}
        onToggleExpand={() => {}}
        onToggleWatchlist={() => {}}
        onQuickTrade={() => {}}
      />
    );
    expect(htmlBuy).toContain('快速交易 (買進)');
    expect(htmlBuy).toContain('下單');

    // 賣出標的應顯示「賣出」
    const htmlSell = renderToStaticMarkup(
      <DeductionTelescopeTable
        filteredItems={[mockSellItem]}
        watchlistSymbols={[]}
        expandedSymbol={null}
        onToggleExpand={() => {}}
        onToggleWatchlist={() => {}}
        onQuickTrade={() => {}}
      />
    );
    expect(htmlSell).toContain('快速交易 (賣出)');
    expect(htmlSell).toContain('賣出');
  });
});

