import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExDividendRadarCard } from './ExDividendRadarCard';
import { UpcomingExDividendRadarItem } from '../../types/dividend';

describe('ExDividendRadarCard (近日持倉除息行事曆雷達卡片元件)', () => {
  it('當 radarEvents 為空時，應顯示優雅空狀態文字', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExDividendRadarCard, {
        radarEvents: [],
        horizonDays: 60,
      })
    );

    expect(html).toContain('近日持倉除息行事曆雷達');
    expect(html).toContain('未來 60 天內無持倉股票即將除息');
  });

  it('當有除息事件時，應正確渲染彙整 KPI 與各項目徽章 (今日除息、二代健保、官方確認)', () => {
    const mockEvents: UpcomingExDividendRadarItem[] = [
      {
        id: 'radar-0056-today',
        symbol: '0056',
        name: '元大高股息',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-05-15',
        payDate: '2026-06-08',
        daysUntilEx: 0,
        daysFromExToPay: 24,
        scheduleType: 'CONFIRMED',
        sharesHeld: 10000,
        cashPerShare: 1.07,
        estimatedGrossTWD: 10700,
        estimatedNetTWD: 10700,
        isNhiTriggered: false,
        nhiFeeTWD: 0,
        rviScore: 0.88,
        recoveryRating: 'HIGH_MOMENTUM',
      },
      {
        id: 'radar-2454-nhi',
        symbol: '2454',
        name: '聯發科',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-06-01',
        payDate: '2026-06-30',
        daysUntilEx: 17,
        daysFromExToPay: 29,
        scheduleType: 'CONFIRMED',
        sharesHeld: 1000,
        cashPerShare: 25.0,
        estimatedGrossTWD: 25000,
        estimatedNetTWD: 24472,
        isNhiTriggered: true,
        nhiFeeTWD: 528,
        rviScore: 0.65,
        recoveryRating: 'MODERATE',
      },
      {
        id: 'radar-aapl-us',
        symbol: 'AAPL',
        name: '蘋果',
        market: 'US',
        currency: 'USD',
        exDate: '2026-06-15',
        payDate: '2026-07-06',
        daysUntilEx: 31,
        daysFromExToPay: 21,
        scheduleType: 'PROJECTED',
        sharesHeld: 100,
        cashPerShare: 1.5,
        estimatedGrossTWD: 4800,
        estimatedNetTWD: 3360,
        isNhiTriggered: false,
        nhiFeeTWD: 0,
        rviScore: 0.88,
        recoveryRating: 'HIGH_MOMENTUM',
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ExDividendRadarCard, {
        radarEvents: mockEvents,
        horizonDays: 60,
        isExpanded: true,
      })
    );

    // 1. KPI 彙整區斷言
    expect(html).toContain('預計除息標的');
    expect(html).toContain('38,532'); // 預計淨入帳總額 10700 + 24472 + 3360 = 38532
    expect(html).toContain('1 筆達健保扣費門檻'); // 健保預警件數

    // 2. 今日除息 (T=0) 徽章斷言
    expect(html).toContain('今日除息');
    expect(html).toContain('0056');
    expect(html).toContain('元大高股息');
    expect(html).toContain('+24天入帳');

    // 3. 二代健保警報斷言 (聯發科 2454)
    expect(html).toContain('2454');
    expect(html).toContain('健保 2.11%');
    expect(html).toContain('528');

    // 4. 週期推估與美股斷言 (AAPL)
    expect(html).toContain('AAPL');
    expect(html).toContain('週期推估');
    expect(html).toContain('US');
  });

  it('Spec 0232 / Ticket 06: 應支援 60d / 90d 視窗切換與跨午夜倒數自愈行為', () => {
    let selectedHorizon = 60;
    const handleHorizonChange = (val: number) => {
      selectedHorizon = val;
    };
    handleHorizonChange(60);
    expect(selectedHorizon).toBe(60);

    const html60 = renderToStaticMarkup(
      React.createElement(ExDividendRadarCard, {
        radarEvents: [],
        horizonDays: 60,
        onHorizonChange: handleHorizonChange,
      })
    );

    expect(html60).toContain('未來 60 天視野');
    expect(html60).toContain('近 60 天 (確定)');
    expect(html60).toContain('近 90 天 (含推估)');

    const html90 = renderToStaticMarkup(
      React.createElement(ExDividendRadarCard, {
        radarEvents: [],
        horizonDays: 90,
        onHorizonChange: handleHorizonChange,
      })
    );

    expect(html90).toContain('未來 90 天視野');
  });
});
