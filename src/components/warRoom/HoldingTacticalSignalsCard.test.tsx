import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HoldingTacticalSignalsCard } from './HoldingTacticalSignalsCard';
import type { MacroHoldingSignalInput } from '../../types/macro';

describe('HoldingTacticalSignalsCard (分頁膠囊切換、安全盾反饋與月線乖離率揭露)', () => {
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
    bias20MA: 7.8, // 乖離率 > 6% (過熱)
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
    bias20MA: -3.2,
  };

  it('當在倉全為正常股 (0 檔需行動) 時，預設應渲染綠色安全盾反饋卡', () => {
    const html = renderToStaticMarkup(
      <HoldingTacticalSignalsCard signals={[normalHolding]} />
    );

    // 驗證存在分頁膠囊與計數
    expect(html).toContain('需行動 (0)');
    expect(html).toContain('全部在倉 (1)');

    // 預設應顯示綠色安全卡片，而非表格或硬塞正常股
    expect(html).toContain('當前在倉持股全數處於正常箱型結構或安全防守水位');
    expect(html).not.toContain('warroom-table');
  });

  it('當存在需行動標的時，應正確渲染持股明細表格，並揭露月線乖離率與過熱標籤', () => {
    const breakoutHolding: MacroHoldingSignalInput = {
      ...normalHolding,
      symbol: '2330',
      action: 'BUY',
      bias20MA: 7.8,
    };

    const html = renderToStaticMarkup(
      <HoldingTacticalSignalsCard signals={[breakoutHolding]} />
    );

    expect(html).toContain('warroom-table');
    expect(html).toContain('2330');
    expect(html).toContain('台積電');
    expect(html).toContain('箱頂突破加碼');
    // 驗證月線乖離率 > 6% 之過熱標籤
    expect(html).toContain('+7.8%');
    expect(html).toContain('過熱');
    expect(html).not.toContain('當前在倉持股全數處於正常箱型結構或安全防守水位');
  });

  it('當存在異常股時，預設僅展示異常標的，並於分頁膠囊揭露整體持股數量', () => {
    const html = renderToStaticMarkup(
      <HoldingTacticalSignalsCard signals={[normalHolding, actionableHolding]} />
    );
    expect(html).toContain('需行動 (1)');
    expect(html).toContain('全部在倉 (2)');
    expect(html).toContain('2454');
    expect(html).toContain('🚨 觸及自訂停損');
    expect(html).not.toContain('2330');
  });
});
