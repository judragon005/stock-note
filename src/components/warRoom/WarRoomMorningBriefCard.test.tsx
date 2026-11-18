import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WarRoomMorningBriefCard } from './WarRoomMorningBriefCard';

describe('WarRoomMorningBriefCard (Spec 0235 Ticket 06)', () => {
  const brief = {
    headline: '【謹慎觀望・收斂曝險】',
    tone: 'CAUTION' as const,
    summary: '市場波動升溫，建議收斂曝險。',
    macroDiagnosis: '長篇宏觀診斷文字內容 XYZ',
    shieldDiagnosis: '個人總淨值折算約 NT$ 2,000,000',
    actionPoints: [
      '⚠️【破線觀察】持股 2330(台積電) 跌破箱底支撐，建議檢視停損。',
      '📌【情境調倉目標】建議降低股票額度。',
    ],
  };

  it('應預設收合長篇診斷、移除重複複製按鈕，並為點名持股掛載技術面與下單按鈕', () => {
    const html = renderToStaticMarkup(
      <WarRoomMorningBriefCard
        morningBrief={brief as any}
        asOfDate="2026-11-18"
        holdingSymbols={[{ symbol: '2330', market: 'TW' }]}
        onInspectTechnical={vi.fn()}
        onOpenTradeModal={vi.fn()}
        privacyMode={true}
      />
    );

    // 1. 不再渲染重複複製按鈕
    expect(html).not.toContain('📋 複製晨會簡報');
    expect(html).not.toContain('🤖 LLM 提示詞');
    // 2. 診斷長文預設收合
    expect(html).not.toContain('長篇宏觀診斷文字內容 XYZ');
    expect(html).toContain('展開詳細診斷文字');
    // 3. 點名個股掛載一鍵技術面與下單按鈕
    expect(html).toContain('📈 技術面');
    expect(html).toContain('⚡ 下單');
  });
});
