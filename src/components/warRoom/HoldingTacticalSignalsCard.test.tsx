import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HoldingTacticalSignalsCard } from './HoldingTacticalSignalsCard';
import type { MacroHoldingSignalInput } from '../../types/macro';

describe('HoldingTacticalSignalsCard (分頁膠囊切換與安全盾反饋)', () => {
  const normalHolding: MacroHoldingSignalInput = {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    action: 'HOLD',
    stopLossPrice: 950,
    targetPrice: 1150,
    shares: 1000,
    costBasis: 980,
    currentPrice: 1040,
    marketValueTWD: 1040000,
    weightPercent: 38.5,
    unrealizedPnlPercent: 6.12,
    boxTop: 1080,
    boxBottom: 960,
    planRiskStatus: 'NORMAL',
    dispositionStatus: 'NORMAL',
  };

  const actionableHolding: MacroHoldingSignalInput = {
    symbol: '2454',
    name: '聯發科',
    market: 'TW',
    action: 'SELL',
    stopLossPrice: 1250,
    targetPrice: 1500,
    shares: 500,
    costBasis: 1300,
    currentPrice: 1220,
    marketValueTWD: 610000,
    weightPercent: 22.5,
    unrealizedPnlPercent: -6.15,
    boxTop: 1400,
    boxBottom: 1260,
    planRiskStatus: 'STOP_LOSS_TRIGGERED',
    dispositionStatus: 'NORMAL',
  };

  it('當在倉全為正常股 (0 檔需行動) 時，預設在「需行動」模式應渲染綠色安全盾反饋卡', () => {
    const html = renderToStaticMarkup(
      <HoldingTacticalSignalsCard signals={[normalHolding]} defaultFilter="ACTIONABLE" />
    );

    // 驗證存在分頁膠囊
    expect(html).toContain('需行動 (0)');
    expect(html).toContain('全部在倉 (1)');

    // 預設應顯示綠色安全卡片，而非表格或硬塞正常股
    expect(html).toContain('當前在倉持股全數處於正常箱型結構或安全防守水位');
    expect(html).not.toContain('warroom-table');
  });

  it('切換至「全部在倉」時應正確渲染持股明細表格', () => {
    const html = renderToStaticMarkup(
      <HoldingTacticalSignalsCard signals={[normalHolding]} defaultFilter="ALL" />
    );

    expect(html).toContain('warroom-table');
    expect(html).toContain('2330');
    expect(html).toContain('台積電');
    expect(html).not.toContain('當前在倉持股全數處於正常箱型結構或安全防守水位');
  });

  it('當存在異常股時，「需行動」僅顯示異常股，「全部在倉」顯示所有持股', () => {
    const htmlActionable = renderToStaticMarkup(
      <HoldingTacticalSignalsCard signals={[normalHolding, actionableHolding]} defaultFilter="ACTIONABLE" />
    );
    expect(htmlActionable).toContain('2454');
    expect(htmlActionable).toContain('🚨 觸及自訂停損');
    expect(htmlActionable).not.toContain('2330');

    const htmlAll = renderToStaticMarkup(
      <HoldingTacticalSignalsCard signals={[normalHolding, actionableHolding]} defaultFilter="ALL" />
    );
    expect(htmlAll).toContain('2454');
    expect(htmlAll).toContain('2330');
  });
});
