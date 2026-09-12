import { describe, it, expect } from 'vitest';
import { generateFinancialForensicMarkdown } from './financialReportPipeline';
import type { FinancialForensicReport } from '../types/financialForensic';

describe('Financial Forensic Markdown Report Generator (TDD Seam)', () => {
  const sampleReport: FinancialForensicReport = {
    symbol: '2330',
    market: 'TW',
    companyName: '台積電',
    industryAttribute: 'STANDARD',
    latestPeriod: '2025-Q2',
    overallScore: 92,
    overallGrade: 'EXCELLENT',
    trafficLights: {
      profitability: 'GREEN',
      safety: 'GREEN',
      efficiency: 'GREEN',
      cashFlow: 'GREEN',
    },
    executiveSummary: '本業造血強勁，毛利率走勢穩健，淨現金水位充沛，未檢出結構性財務背離。',
    anomalies: [
      {
        type: 'CHANNEL_STUFFING_DIVERGENCE',
        severity: 'WARNING',
        title: '存貨週轉天數微幅上升',
        summary: '最新季度存貨週轉天數略增 12 天，目前仍處於健康範圍，需留意次季去化進度。',
      },
    ],
    duPont: {
      roe: 28.5,
      netMargin: 38.2,
      assetTurnover: 0.48,
      equityMultiplier: 1.55,
      primaryDriver: 'PROFITABILITY',
    },
    historicalRecords: [],
    updatedAt: Date.now(),
  };

  it('1. 產出的 Markdown 應包含標題、綜合評級徽章與 0 秒總結橫幅', () => {
    const md = generateFinancialForensicMarkdown(sampleReport);

    expect(md).toContain('# 📊 2330 台積電 穿透式財報深度研報');
    expect(md).toContain('92 / 100');
    expect(md).toContain('EXCELLENT');
    expect(md).toContain('本業造血強勁');
  });

  it('2. 應包含四大維度指示燈與杜邦三因子拆解表格', () => {
    const md = generateFinancialForensicMarkdown(sampleReport);

    expect(md).toContain('獲利能力');
    expect(md).toContain('杜邦 ROE 三因子拆解');
    expect(md).toContain('28.50%');
    expect(md).toContain('38.20%');
  });

  it('3. 應正確排版「市場沒說什麼」異常清單', () => {
    const md = generateFinancialForensicMarkdown(sampleReport);

    expect(md).toContain('市場沒說什麼');
    expect(md).toContain('存貨週轉天數微幅上升');
  });

  it('4. 當無任何異常時，應顯示無結構性背離之安全文字', () => {
    const cleanReport = { ...sampleReport, anomalies: [] };
    const md = generateFinancialForensicMarkdown(cleanReport);

    expect(md).toContain('財務體質扎實，未檢出結構性背離');
  });
});
