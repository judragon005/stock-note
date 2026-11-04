import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DarvasQuadrantGrid } from './DarvasQuadrantGrid';
import { ScannedStockItem } from '../../../engine/muscleBookerEngine';

const mockBreakoutUp: ScannedStockItem = {
  symbol: '2330',
  name: '台積電',
  market: 'TW',
  currentPrice: 1020,
  boxStatus: 'BREAKOUT_UP',
  isBottomPenetration: false,
  isBollingerSqueeze: false,
  ma20Slope: 'UP',
  actionDecision: {
    action: 'BUY',
    actionBadge: '🔥 箱頂突破',
    actionReason: '測試理由',
  },
};

const mockBottomPen: ScannedStockItem = {
  symbol: '2454',
  name: '聯發科',
  market: 'TW',
  currentPrice: 1200,
  boxStatus: 'INSIDE_BOX',
  isBottomPenetration: true,
  isBollingerSqueeze: false,
  ma20Slope: 'UP',
  actionDecision: {
    action: 'BUY',
    actionBadge: '🚀 底穿上',
    actionReason: '測試理由',
  },
};

const mockSqueeze: ScannedStockItem = {
  symbol: '2317',
  name: '鴻海',
  market: 'TW',
  currentPrice: 200,
  boxStatus: 'INSIDE_BOX',
  isBottomPenetration: false,
  isBollingerSqueeze: true,
  ma20Slope: 'UP',
  actionDecision: {
    action: 'HOLD',
    actionBadge: '⚡ 極致壓縮',
    actionReason: '測試理由',
  },
};

const mockBreakoutDown: ScannedStockItem = {
  symbol: '2881',
  name: '富邦金',
  market: 'TW',
  currentPrice: 85,
  boxStatus: 'BREAKOUT_DOWN',
  isBottomPenetration: false,
  isBollingerSqueeze: false,
  ma20Slope: 'UP',
  actionDecision: {
    action: 'SELL',
    actionBadge: '⚠️ 破箱底',
    actionReason: '測試理由',
  },
};

describe('DarvasQuadrantGrid 組件測試 (四大象限動能看板)', () => {
  it('四大象限應精確分流呈現突破、底穿上、極致壓縮與跌破箱底標的', () => {
    const html = renderToStaticMarkup(
      <DarvasQuadrantGrid
        scannedItems={[mockBreakoutUp, mockBottomPen, mockSqueeze, mockBreakoutDown]}
        activeHoldingsMap={new Map()}
        expandedSymbol={null}
        onToggleExpand={() => {}}
      />
    );

    expect(html).toContain('箱頂突破區 (1)');
    expect(html).toContain('2330');
    expect(html).toContain('底穿上反轉區 (1)');
    expect(html).toContain('2454');
    expect(html).toContain('布林極致收縮區 (1)');
    expect(html).toContain('2317');
    expect(html).toContain('跌破箱底警戒區 (1)');
    expect(html).toContain('2881');
  });

  it('應正確向下傳遞自選清單與一鍵下單回調函式至卡片', () => {
    const html = renderToStaticMarkup(
      <DarvasQuadrantGrid
        scannedItems={[mockBreakoutUp]}
        activeHoldingsMap={new Map()}
        expandedSymbol={null}
        onToggleExpand={() => {}}
        watchlistSymbols={['2330']}
        onToggleWatchlist={() => {}}
        onQuickTrade={() => {}}
      />
    );

    // 驗證自選星號已呈現「從自選觀察名單移除」
    expect(html).toContain('從自選觀察名單移除');
    // 驗證一鍵下單已呈現「一鍵快速買進下單」
    expect(html).toContain('一鍵快速買進下單');
  });
});
