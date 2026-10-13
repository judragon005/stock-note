import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StrategicPromptPanel } from './StrategicPromptPanel';
import { synthesizeStockDigest } from '../../engine/strategicPromptDigest';

describe('Ticket 04: StrategicPromptPanel 前端工作區面板渲染測試', () => {
  const stockDigest = synthesizeStockDigest({
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    candles: [
      { date: '2026-10-13', open: 1020, high: 1050, low: 1015, close: 1045, volume: 40000, transactions: 28000 },
    ],
    quote: { price: 1045, pe: 24.5 },
  });

  const etfDigest = synthesizeStockDigest({
    symbol: '0050',
    name: '元大台灣50',
    market: 'TW',
    candles: [
      { date: '2026-10-13', open: 180, high: 186, low: 179, close: 185, volume: 12000 },
    ],
    quote: { price: 185 },
  });

  it('1. 個股標的渲染：應呈現智策多維提示詞引擎、個股大師 V12.0 徽章與 Token 預估', () => {
    const html = renderToStaticMarkup(<StrategicPromptPanel digest={stockDigest} />);

    expect(html).toContain('智策多維提示詞引擎');
    expect(html).toContain('個股大師 (V12.0)');
    expect(html).toContain('部位已脫敏');
    expect(html).toContain('Tokens');
    expect(html).toContain('一鍵複製 Master Prompt');
  });

  it('2. 渲染完整六頂思考帽卡片與黑帽紅隊標記', () => {
    const html = renderToStaticMarkup(<StrategicPromptPanel digest={stockDigest} />);

    expect(html).toContain('白帽');
    expect(html).toContain('紅帽');
    expect(html).toContain('黑帽');
    expect(html).toContain('黃帽');
    expect(html).toContain('綠帽');
    expect(html).toContain('藍帽');
    expect(html).toContain('紅隊批判');
  });

  it('3. ETF 標的渲染：應自適應呈現 ETF 模式 V3.0 徽章', () => {
    const html = renderToStaticMarkup(<StrategicPromptPanel digest={etfDigest} />);

    expect(html).toContain('ETF 模式 (V3.0)');
    expect(html).toContain('六頂思考帽平行認知矩陣');
  });

  it('4. 應包含結構化 XML 語意提示詞檢視折疊按鈕', () => {
    const html = renderToStaticMarkup(<StrategicPromptPanel digest={stockDigest} />);

    expect(html).toContain('檢視即將注入之結構化 XML 語意提示詞');
  });
});
