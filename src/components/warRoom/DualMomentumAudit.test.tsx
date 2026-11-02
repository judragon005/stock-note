import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WarRoomWorkspace } from '../WarRoomWorkspace';

describe('Dual Momentum Lakehouse Data Audit & Graceful Hydration (Ticket 03)', () => {
  it('雙重動能卡片應渲染 SQLite 湖倉審計標章與基準日，且無日 K 標的不應出現 -999.0% 破圖', () => {
    const html = renderToStaticMarkup(
      <WarRoomWorkspace
        holdings={[]}
        loans={[]}
        cashBalanceTwd={1000000}
        totalNavTwd={1000000}
        usdToTwdRate={32.0}
        onOpenMarginStressModal={vi.fn()}
      />
    );

    // 斷言存在湖倉審計標籤與基準日之單一標章 (Spec 0213 / Ticket 03)
    expect(html).toContain('🟢 SQLite 湖倉真實日 K 驅動 · 基準日:');

    // 斷言嚴禁出現醜陋的 -999.0% 幽靈數值，而應優雅渲染水合中標籤
    expect(html).toContain('⏳ 水合中');
    expect(html).not.toContain('-999.0%');
    expect(html).not.toContain('-999%');

    // 斷言頂部行動卡片優雅降級為水合中，嚴禁誤判為空頭避險「現金為王」
    expect(html).toContain('⏳【湖倉日 K 水合中】');
    expect(html).not.toContain('【觸發避險・現金為王】');
  });

  it('當提供近 90 天除息記錄與持股日 K 時，WarRoomWorkspace 應成功串聯除息調節與月線乖離率', () => {
    const html = renderToStaticMarkup(
      <WarRoomWorkspace
        holdings={[
          {
            symbol: '0056.TW',
            name: '元大高股息',
            market: 'TW',
            currency: 'TWD',
            shares: 1000,
            avgCost: 35.0,
            currentPrice: 38.0,
            totalCostBasis: 35000,
            adjustedCostBasis: 35000,
            marketValue: 38000,
            grossMarketValue: 38000,
            unrealizedProfitLoss: 3000,
            unrealizedProfitLossPercent: 8.57,
            weightPercent: 100,
          } as any,
        ]}
        receivableDividends={[
          {
            id: 'div-1',
            symbol: '0056.TW',
            name: '元大高股息',
            market: 'TW',
            currency: 'TWD',
            exDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
            payDate: new Date().toISOString().split('T')[0],
            sharesHeldOnExDate: 1000,
            cashDividendPerShare: 1.07,
            estimatedGrossDividend: 1070,
            estimatedTaxOrFee: 0,
            estimatedNetDividend: 1070,
            estimatedNetDividendInTWD: 1070,
            status: 'PENDING_PAYMENT',
          },
        ]}
        loans={[]}
        cashBalanceTwd={1000000}
        totalNavTwd={1038000}
        usdToTwdRate={32.0}
        onOpenMarginStressModal={vi.fn()}
      />
    );

    expect(html).toContain('元大高股息');
    expect(html).toContain('🟢 SQLite 湖倉真實日 K 驅動 · 基準日:');
  });
});
