import { describe, it, expect } from 'vitest';
import {
  buildStep1BusinessModelPrompt,
  buildStep2FinancialForensicPrompt,
  buildStep3PeerComparisonPrompt,
  buildStep4LatentRisksPrompt,
  buildStep5ScenarioSimulationPrompt,
  buildStep6ChipsAnalysisPrompt,
  buildStep7InvestmentMemoTemplate,
  generateFull7StepsPromptPayload,
} from './equityDeepDiveEngine';
import { EquityDeepDiveInput } from '../types/equityDeepDive';

describe('equityDeepDiveEngine - 7 步驟獨立 Prompt 與全量聚合 (Ticket 09 ~ 15)', () => {
  const mockTwInput: EquityDeepDiveInput = {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    candles: [
      { date: '2026-09-30', open: 980, high: 990, low: 975, close: 985, volume: 30000 },
    ],
    quote: { price: 985, pe: 26.5, pb: 6.1, dividendYield: 1.8 },
    institutionalRecords: [
      { date: '2026-09-30', foreignShares: 3000, trustShares: 500, dealerShares: 200 },
    ],
    boxFloorPrice: 950,
    boxCeilingPrice: 1020,
    statusTag: 'DISPOSITION',
  };

  const mockUsInput: EquityDeepDiveInput = {
    symbol: 'NVDA',
    name: '輝達',
    market: 'US',
    candles: [
      { date: '2026-09-30', open: 120, high: 125, low: 119, close: 124, volume: 50000000 },
    ],
    quote: { price: 124, pe: 42.0 },
    statusTag: 'NORMAL',
  };

  it('Ticket 09: 步驟 1 商業模式 Prompt 應包含公司名稱、代碼與 500 字白話規範', () => {
    const prompt = buildStep1BusinessModelPrompt(mockTwInput.symbol, mockTwInput.name, mockTwInput.market);
    expect(prompt).toContain('台積電 (2330)');
    expect(prompt).toContain('商業模式拆解');
    expect(prompt).toContain('500 字');
  });

  it('Ticket 10: 步驟 2 財報魔鬼細節 Prompt 應代入 PE、PB 與三大背離警訊', () => {
    const prompt = buildStep2FinancialForensicPrompt(mockTwInput);
    expect(prompt).toContain('財報魔鬼細節');
    expect(prompt).toContain('26.5');
    expect(prompt).toContain('自由現金流背離');
  });

  it('Ticket 11: 步驟 3 同業對照 Prompt 應包含 2 檔競爭對手橫向比較指示', () => {
    const prompt = buildStep3PeerComparisonPrompt(mockTwInput.symbol, mockTwInput.name, mockTwInput.market);
    expect(prompt).toContain('同業對照');
    expect(prompt).toContain('2 檔競爭對手');
    expect(prompt).toContain('毛利率');
  });

  it('Ticket 12: 步驟 4 市場沒說的事 Prompt 當處置股票時應包含處置警示提示', () => {
    const twPrompt = buildStep4LatentRisksPrompt(mockTwInput);
    expect(twPrompt).toContain('市場沒說的事');
    expect(twPrompt).toContain('處置股票');

    const usPrompt = buildStep4LatentRisksPrompt(mockUsInput);
    expect(usPrompt).toContain('Beta');
  });

  it('Ticket 13: 步驟 5 情境推演 Prompt 應包含現價與 3 套劇本區間', () => {
    const prompt = buildStep5ScenarioSimulationPrompt(mockTwInput);
    expect(prompt).toContain('情境推演');
    expect(prompt).toContain('985');
    expect(prompt).toContain('樂觀、中性、悲觀');
  });

  it('Ticket 14: 步驟 6 籌碼微觀解讀 Prompt 應代入 20 日法人累計與箱體價格', () => {
    const twPrompt = buildStep6ChipsAnalysisPrompt(mockTwInput);
    expect(twPrompt).toContain('籌碼微觀解讀');
    expect(twPrompt).toContain('3700');
    expect(twPrompt).toContain('950');
    expect(twPrompt).toContain('借券賣出');

    const usPrompt = buildStep6ChipsAnalysisPrompt(mockUsInput);
    expect(usPrompt).toContain('量能分佈');
  });

  it('Ticket 15 / Spec 0173: 步驟 7 投資筆記與全量 Prompt 聚合產生器包含證偽條件與法人風控', () => {
    const template = buildStep7InvestmentMemoTemplate(mockTwInput.symbol, mockTwInput.name);
    expect(template).toContain('200 字極簡交易卡');
    expect(template).toContain('買進核心理由');
    expect(template).toContain('目標價');
    expect(template).toContain('核心論點失效條件（證偽開關 Kill-Switch）');

    const report = generateFull7StepsPromptPayload(mockTwInput);
    expect(report.fullPayloadPrompt).toContain('深度投研決策閉環');
    expect(report.fullPayloadPrompt).toContain('【第 1 步】商業模式拆解');
    expect(report.fullPayloadPrompt).toContain('【第 7 步】投資筆記');
    expect(report.fullPayloadPrompt).toContain('核心論點失效條件');
  });
});
