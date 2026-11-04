import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MuscleStockCard } from './MuscleStockCard';
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

describe('MuscleStockCard 組件測試 (Apple 美學卡片)', () => {
  it('應正確渲染股票代碼、名稱與現價', () => {
    const html = renderToStaticMarkup(<MuscleStockCard item={mockItem} />);
    expect(html).toContain('2330');
    expect(html).toContain('台積電');
    expect(html).toContain('$1,020');
  });

  it('應正確顯示漲跌幅膠囊與防守價資訊', () => {
    const html = renderToStaticMarkup(<MuscleStockCard item={mockItem} />);
    expect(html).toContain('+2%');
    expect(html).toContain('防守');
    expect(html).toContain('緩衝');
  });

  it('當有庫存資訊時應正確呈現持股標籤', () => {
    const html = renderToStaticMarkup(
      <MuscleStockCard
        item={mockItem}
        holding={{
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          shares: 200,
          currentPrice: 1020,
          costBasis: 900,
          totalCost: 180000,
          currentValue: 204000,
          unrealizedPnL: 24000,
          unrealizedPnLPercent: 13.33,
        } as any}
      />
    );
    expect(html).toContain('200 股');
  });

  it('應包含外部圖表與指標透視儀按鈕與一鍵複製', () => {
    const html = renderToStaticMarkup(
      <MuscleStockCard
        item={mockItem}
        onOpenOmniInspector={() => {}}
      />
    );
    expect(html).toContain('開啟外部即時 K 線圖表');
    expect(html).toContain('開啟全方位指標透視儀');
    expect(html).toContain('一鍵複製股票代碼');
  });

  it('當 isExpanded 為 true 時，應展示深度技術指標抽屜', () => {
    const closedHtml = renderToStaticMarkup(<MuscleStockCard item={mockItem} isExpanded={false} />);
    expect(closedHtml).not.toContain('20MA 扣抵望遠鏡');

    const openHtml = renderToStaticMarkup(<MuscleStockCard item={mockItem} isExpanded={true} />);
    expect(openHtml).toContain('20MA 扣抵望遠鏡');
    expect(openHtml).toContain('布林帶寬');
  });

  it('當跌破防守價時應顯示破防警告', () => {
    const brokenItem: ScannedStockItem = {
      ...mockItem,
      currentPrice: 950,
      actionDecision: {
        ...mockItem.actionDecision,
        stopLossPrice: 980,
      },
    };

    const html = renderToStaticMarkup(<MuscleStockCard item={brokenItem} />);
    expect(html).toContain('已跌破');
  });

  it('美股標的應正確指向美股 Yahoo Finance 外部圖表與美金貨幣格式', () => {
    const usItem: ScannedStockItem = {
      symbol: 'NVDA',
      name: '輝達 NVIDIA',
      market: 'US',
      currentPrice: 125.5,
      boxStatus: 'BREAKOUT_UP',
      isBottomPenetration: false,
      ma20Slope: 'UP',
      isBollingerSqueeze: true,
      bollingerBandwidth: 4.5,
      actionDecision: {
        action: 'BUY',
        actionBadge: '🔥 箱頂突破',
        actionReason: '突破箱頂',
        stopLossPrice: 120,
      },
    };

    const html = renderToStaticMarkup(<MuscleStockCard item={usItem} isExpanded={true} />);
    expect(html).toContain('NVDA');
    expect(html).toContain('https://finance.yahoo.com/quote/NVDA');
    expect(html).toContain('US$');
    expect(html).toContain('極致壓縮');
  });

  it('Spec 0216 Line 153-154: 當傳入 onToggleWatchlist 時應渲染自選星號按鈕，並依 watchlist 狀態顯示正確提示', () => {
    // 未自選情境
    const unwatchedHtml = renderToStaticMarkup(
      <MuscleStockCard
        item={mockItem}
        watchlistSymbols={['2454']}
        onToggleWatchlist={() => {}}
      />
    );
    expect(unwatchedHtml).toContain('加入自選觀察名單');

    // 已自選情境
    const watchedHtml = renderToStaticMarkup(
      <MuscleStockCard
        item={mockItem}
        watchlistSymbols={['2330']}
        onToggleWatchlist={() => {}}
      />
    );
    expect(watchedHtml).toContain('從自選觀察名單移除');
  });

  it('Spec 0216 Line 153-154: 當傳入 onQuickTrade 時應正確渲染一鍵快速買進或賣出下單按鈕', () => {
    // 買進訊號標的
    const buyHtml = renderToStaticMarkup(
      <MuscleStockCard
        item={mockItem}
        onQuickTrade={() => {}}
      />
    );
    expect(buyHtml).toContain('一鍵快速買進下單');

    // 破線/賣出訊號標的
    const brokenItem: ScannedStockItem = {
      ...mockItem,
      currentPrice: 950,
      actionDecision: {
        ...mockItem.actionDecision,
        action: 'SELL',
        stopLossPrice: 980,
      },
    };
    const sellHtml = renderToStaticMarkup(
      <MuscleStockCard
        item={brokenItem}
        onQuickTrade={() => {}}
      />
    );
    expect(sellHtml).toContain('一鍵快速賣出下單');
  });
});
