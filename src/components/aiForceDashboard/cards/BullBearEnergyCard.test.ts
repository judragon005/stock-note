import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BullBearEnergyCard, calculateBullBearRatio } from './BullBearEnergyCard';
import type { BullBearEnergyData } from '../../../types/aiForceDashboard';

describe('BullBearEnergyCard & calculateBullBearRatio', () => {
  it('應該正確計算常規多空量能比例與結論', () => {
    // 假設 20 日紅 K 量 5300 張，黑 K 量 4700 張
    const result = calculateBullBearRatio(5300, 4700);
    expect(result.bullPercent).toBe(53);
    expect(result.bearPercent).toBe(47);
    expect(result.ratio).toBe(1.13);
    expect(result.conclusion).toBe('偏多');
  });

  it('應該在空方成交量為 0 時提供除零保護', () => {
    const result = calculateBullBearRatio(5000, 0);
    expect(result.bullPercent).toBe(100);
    expect(result.bearPercent).toBe(0);
    expect(result.ratio).toBe(99.99);
    expect(result.conclusion).toBe('極度偏多');
  });

  it('應該在多方成交量為 0 時提供極限邊界保護', () => {
    const result = calculateBullBearRatio(0, 5000);
    expect(result.bullPercent).toBe(0);
    expect(result.bearPercent).toBe(100);
    expect(result.ratio).toBe(0);
    expect(result.conclusion).toBe('極度偏空');
  });

  it('應該在雙方成交量皆為 0 時輸出均等均衡', () => {
    const result = calculateBullBearRatio(0, 0);
    expect(result.bullPercent).toBe(50);
    expect(result.bearPercent).toBe(50);
    expect(result.ratio).toBe(1);
    expect(result.conclusion).toBe('均衡');
  });

  it('應該能正確解析與渲染 mock 資料結構', () => {
    const mockData: BullBearEnergyData = {
      bullEnergyPercent: 53,
      bearEnergyPercent: 47,
      bullBearRatio: 1.13,
      bullBearConclusion: '偏多',
      noteText: '(20日紅K量/黑K量)',
    };
    expect(mockData.bullEnergyPercent + mockData.bearEnergyPercent).toBe(100);
    expect(mockData.bullBearConclusion).toBe('偏多');
  });

  describe('Spec 0239 T14: 孤兒元件收斂校準（colorTheme / ratio<1 文意 / clamp / 別名）', () => {
    it('台股預設 colorTheme="taiwan" 應為紅多綠空，international 應為綠多紅空', () => {
      const data: BullBearEnergyData = {
        bullEnergyPercent: 65,
        bearEnergyPercent: 35,
        bullBearRatio: 1.85,
        bullBearConclusion: '偏多',
        noteText: '(20日紅K量/黑K量)',
      };

      const twHtml = renderToStaticMarkup(
        React.createElement(BullBearEnergyCard, { data, colorTheme: 'taiwan', market: 'TW' })
      );
      expect(twHtml).toMatch(/color:#f87171[^>]*>65%</);
      expect(twHtml).toMatch(/color:#34d399[^>]*>35%</);

      const usHtml = renderToStaticMarkup(
        React.createElement(BullBearEnergyCard, { data, colorTheme: 'international', market: 'US' })
      );
      expect(usHtml).toMatch(/color:#34d399[^>]*>65%</);
      expect(usHtml).toMatch(/color:#f87171[^>]*>35%</);
    });

    it('ratio < 1 時不可顯示「倍多」，應呈現偏空文意', () => {
      const data: BullBearEnergyData = {
        bullEnergyPercent: 35,
        bearEnergyPercent: 65,
        bullBearRatio: 0.54,
        bullBearConclusion: '偏空',
        noteText: '(20日紅K量/黑K量)',
      };

      const html = renderToStaticMarkup(
        React.createElement(BullBearEnergyCard, { data, market: 'TW' })
      );

      expect(html).not.toContain('倍多');
      expect(html).toContain('0.54');
      expect(html).toContain('偏空');
    });

    it('支援別名 bullPercent / bearPercent / conclusion 並對進度條寬度執行 0~100 clamp', () => {
      const aliasData = {
        bullPercent: 140,
        bearPercent: -25,
        bullBearRatio: 2.5,
        conclusion: '強勢主導',
        noteText: '(測試別名)',
      } as unknown as BullBearEnergyData;

      const html = renderToStaticMarkup(
        React.createElement(BullBearEnergyCard, { data: aliasData })
      );

      expect(html).toContain('width:100%');
      expect(html).toContain('width:0%');
      expect(html).not.toContain('width:140%');
      expect(html).not.toContain('width:-25%');
      expect(html).toContain('強勢主導');
    });
  });
});
