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

    // 斷言存在湖倉審計標籤與基準日
    expect(html).toContain('SQLite 湖倉真實日 K 驅動');
    expect(html).toContain('基準日:');

    // 斷言嚴禁出現醜陋的 -999.0% 幽靈數值
    expect(html).not.toContain('-999.0%');
    expect(html).not.toContain('-999%');
  });
});
