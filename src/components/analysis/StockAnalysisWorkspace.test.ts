import { describe, it, expect } from 'vitest';
import { CATEGORY_TOPOLOGY, PrimaryCategoryKey } from './StockAnalysisWorkspace';

describe('StockAnalysisWorkspace Topology Unit Tests (Ticket 01 & 02)', () => {
  it('應完整定義 8 大一級主軸分類', () => {
    const primaryKeys: PrimaryCategoryKey[] = [
      'news',
      'health',
      'statements',
      'profitability',
      'solvency',
      'growth',
      'valuation',
      'key_metrics',
    ];
    primaryKeys.forEach((key) => {
      expect(CATEGORY_TOPOLOGY[key]).toBeDefined();
      expect(CATEGORY_TOPOLOGY[key].label).toBeTruthy();
      expect(CATEGORY_TOPOLOGY[key].items.length).toBeGreaterThan(0);
    });
  });

  it('財務報表 (statements) 應涵蓋 8 大子項目', () => {
    const ids = CATEGORY_TOPOLOGY.statements.items.map((i) => i.id);
    expect(ids).toContain('eps');
    expect(ids).toContain('bvps');
    expect(ids).toContain('income_statement');
    expect(ids).toContain('total_assets');
    expect(ids).toContain('liabilities_equity');
    expect(ids).toContain('cash_flow');
    expect(ids).toContain('dividend_policy');
    expect(ids).toContain('reports_pdf');
    expect(ids.length).toBe(8);
  });

  it('獲利能力 (profitability) 應涵蓋 8 大子項目 (含杜邦與週轉天數)', () => {
    const ids = CATEGORY_TOPOLOGY.profitability.items.map((i) => i.id);
    expect(ids).toContain('margins_trio');
    expect(ids).toContain('opex_breakdown');
    expect(ids).toContain('non_op_ratio');
    expect(ids).toContain('roe_roa');
    expect(ids).toContain('dupont');
    expect(ids).toContain('turnover_capability');
    expect(ids).toContain('turnover_days');
    expect(ids).toContain('dividend_payout');
    expect(ids.length).toBe(8);
  });

  it('關鍵指標 (key_metrics) 應涵蓋 7 大量化模型 (含 Piotroski 9分卡、DCF 與彼得林區)', () => {
    const ids = CATEGORY_TOPOLOGY.key_metrics.items.map((i) => i.id);
    expect(ids).toContain('fcf_yield');
    expect(ids).toContain('piotroski_f');
    expect(ids).toContain('debt_structure');
    expect(ids).toContain('cash_conversion');
    expect(ids).toContain('peter_lynch');
    expect(ids).toContain('ddm_valuation');
    expect(ids).toContain('dcf_valuation');
    expect(ids.length).toBe(7);
  });

  it('全拓撲二級指標總數應完整涵蓋 45 項細項指標', () => {
    let totalItems = 0;
    (Object.keys(CATEGORY_TOPOLOGY) as PrimaryCategoryKey[]).forEach((k) => {
      totalItems += CATEGORY_TOPOLOGY[k].items.length;
    });
    expect(totalItems).toBe(45);
  });
});

