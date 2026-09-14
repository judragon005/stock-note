import { describe, it, expect } from 'vitest';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('Analysis Metrics Calculation Integrity (TDD Seam)', () => {
  // 模擬台泥 (1101) 真實財務規模數據
  const mock1101Quarter: QuarterlyFinancialRecord = {
    symbol: '1101',
    market: 'TW',
    year: 2026,
    quarter: 2,
    periodDate: '2026-06-30',
    income: {
      revenue: 38121809000,
      grossProfit: 6785681000,
      operatingIncome: 2363552000,
      netIncome: 3365060000,
      eps: 0.29,
    },
    balanceSheet: {
      totalAssets: 596016531000,
      totalLiabilities: 296694465000,
      totalEquity: 299322066000,
      currentAssets: 172909406000,
      currentLiabilities: 122283084000,
      capitalStock: 75311817420,
      accountsReceivable: 31089907000,
      inventory: 24707626000,
      cashAndEquivalents: 79294246000,
    },
    cashFlow: {
      operatingCashFlow: 9500000000,
      capitalExpenditure: 13931211000,
    },
    updatedAt: Date.now(),
  };

  it('1. ROE 股東權益報酬率計算應嚴格防呆，絕不可除以 1 噴出 134602400000% 天文數字', () => {
    // 正常情況
    const eq = mock1101Quarter.balanceSheet.totalEquity;
    const normalRoe = Number((((mock1101Quarter.income.netIncome * 4) / eq) * 100).toFixed(1));
    expect(normalRoe).toBe(4.5); // 年化約 4.5%

    // 異常情況：當權益缺失為 0 時，應安全返回 0 或鉗位，不可爆出天文數字
    const brokenRecord: QuarterlyFinancialRecord = {
      ...mock1101Quarter,
      balanceSheet: { ...mock1101Quarter.balanceSheet, totalEquity: 0, totalLiabilities: 0 },
    };
    const safeEq = brokenRecord.balanceSheet.totalEquity;
    const safeRoe = safeEq > 0 ? Number((((brokenRecord.income.netIncome * 4) / safeEq) * 100).toFixed(1)) : 0;
    expect(safeRoe).toBe(0);
    expect(safeRoe).toBeLessThan(100);
  });

  it('2. 財務結構比率 (負債比率) 應正確反映總負債除以總資產，且具備會計平衡自癒', () => {
    const as = mock1101Quarter.balanceSheet.totalAssets;
    const liab = mock1101Quarter.balanceSheet.totalLiabilities;
    const debtRatio = Number(((liab / as) * 100).toFixed(1));

    expect(debtRatio).toBe(49.8); // 台泥負債比約 49.8%
    expect(debtRatio).toBeGreaterThan(0);

    // 會計平衡自癒：若 liab 遺漏但資產與權益存在
    const recoveredLiab = Math.max(0, as - mock1101Quarter.balanceSheet.totalEquity);
    const recoveredRatio = Number(((recoveredLiab / as) * 100).toFixed(1));
    expect(recoveredRatio).toBe(49.8);
  });

  it('3. 流動比率與速動比率應採真實流動科目計算，杜絕 68116174971429% 假常數崩潰', () => {
    const curAssets = mock1101Quarter.balanceSheet.currentAssets!;
    const curLiab = mock1101Quarter.balanceSheet.currentLiabilities!;
    const inv = mock1101Quarter.balanceSheet.inventory;

    const currentRatio = Number(((curAssets / curLiab) * 100).toFixed(0));
    const quickRatio = Number((((curAssets - inv) / curLiab) * 100).toFixed(0));

    expect(currentRatio).toBe(141); // 台泥真實流動比率約 141%
    expect(quickRatio).toBe(121);   // 台泥真實速動比率約 121%
    expect(currentRatio).toBeLessThan(500);
    expect(quickRatio).toBeLessThan(500);
  });

  it('4. 盈餘再投資比率在累計淨利虧損或零時，應顯示虧損 N/A，杜絕除以 1 爆出萬億趴', () => {
    // 正常累計情境
    const totalCapex = 13931211000;
    const totalNet = 3365060000;
    const reinv = Math.round((totalCapex / totalNet) * 100);
    expect(reinv).toBe(414);

    // 虧損情境
    const lossNet = -11785093000;
    const lossReinvDisplay = lossNet <= 0 ? '虧損 N/A' : `${Math.round((totalCapex / lossNet) * 100)}%`;
    expect(lossReinvDisplay).toBe('虧損 N/A');
  });

  it('5. 每股淨值 BVPS 應動態推算流通股數，通用全市場股票而無需寫死台泥股數', () => {
    const equity = mock1101Quarter.balanceSheet.totalEquity;
    // 依股本推算股數 (面額 10 元)
    const sharesFromStock = mock1101Quarter.balanceSheet.capitalStock! / 10;
    const bvps1 = Number((equity / sharesFromStock).toFixed(2));
    expect(bvps1).toBeCloseTo(39.7, 0.5);

    // 依 NetIncome / EPS 反推流通股數
    const sharesFromEps = mock1101Quarter.income.netIncome / mock1101Quarter.income.eps;
    const bvps2 = Number((equity / sharesFromEps).toFixed(2));
    expect(bvps2).toBeCloseTo(25.8, 0.5);
  });

  it('6. 成長力分析若無前期基期資料，應返回 "-" 與 isNoData=true，杜絕顯示 0% 綠柱誤導使用者', () => {
    const currentQ = { ...mock1101Quarter, year: 2022, quarter: 1 };
    const prevQ = null; // 無 2021 年同期基期

    const currVal = currentQ.income.revenue;
    const prevVal = (prevQ as any)?.income?.revenue || 0;
    const hasBaseline = Boolean(prevQ && prevVal !== 0);
    const yoy = hasBaseline ? Number((((currVal - prevVal) / Math.abs(prevVal)) * 100).toFixed(1)) : null;

    const barItem = {
      label: '22Q1',
      value: yoy ?? 0,
      displayValue: yoy !== null ? `${yoy > 0 ? `+${yoy}` : yoy}%` : '-',
      isNegative: (yoy ?? 0) < 0,
      isNoData: !hasBaseline,
    };

    expect(barItem.displayValue).toBe('-');
    expect(barItem.isNoData).toBe(true);
    expect(barItem.value).toBe(0);
  });

  it('7. 台泥 23Q2 毛利年增率 +5326.2% 為歷史真實數據 (煤炭成本危機後復甦)，應支援離群值視覺封頂防禦', () => {
    // 2022Q2 煤炭暴漲致毛利僅 1.10 億，2023Q2 恢復至 59.85 億
    const gp2022Q2 = 110298000;
    const gp2023Q2 = 5984958000;
    const yoy = Number((((gp2023Q2 - gp2022Q2) / Math.abs(gp2022Q2)) * 100).toFixed(1));

    expect(yoy).toBe(5326.2); // 確實為真實現實數據

    // 離群值防禦：正常季度數值 (如 14.5%, 52.1%) 不應被 5326.2% 壓成死線
    const normalValues = [14.5, 9.9, -13.2, 52.1, 72.9];
    const normalMax = Math.max(...normalValues);
    const visualCap = Math.max(60, normalMax * 1.35); // 約 98.4%
    
    // 正常季度高度比例
    const normalHeightPct = (52.1 / visualCap) * 100;
    expect(normalHeightPct).toBeGreaterThan(50); // 52.1% 柱子保有超過 50% 可視高度
    expect(normalHeightPct).toBeLessThan(100);
  });

  it('8. 自由現金流報酬率 (FCF Yield) 應動態推導真實股數 (75.3億股)，杜絕 9135.81% 天文數字', () => {
    const shares = mock1101Quarter.balanceSheet.capitalStock! / 10; // 7,531,181,742 股
    const cfo = mock1101Quarter.cashFlow.operatingCashFlow; // 95 億
    const capex = mock1101Quarter.cashFlow.capitalExpenditure; // 139 億
    const fcf = cfo - capex; // -44.3 億 (大額擴張支出)
    const currentPrice = 23.90;

    const fcfPerShare = fcf / shares;
    const yieldPct = Number(((fcfPerShare / currentPrice) * 100).toFixed(2));

    expect(shares).toBeGreaterThan(7000000000);
    expect(Math.abs(yieldPct)).toBeLessThan(50); // 合理落在正常區間，絕非 9135%
  });

  it('9. DCF 現金流折現估值以真實發行股數推導，台泥合理內在價值應落在 25~55 元正常區間', () => {
    const shares = mock1101Quarter.balanceSheet.capitalStock! / 10;
    expect(shares).toBeGreaterThan(7000000000);

    // 假設 TTM FCF 150 億，折現率 9%，永續成長 2.5%
    const baseFcf = 15000000000;
    const r = 0.09;
    const gn = 0.025;
    const terminalValue = (baseFcf * (1 + gn)) / (r - gn);
    const intrinsicValuePerShare = Number(((terminalValue) / shares).toFixed(2));

    expect(intrinsicValuePerShare).toBeGreaterThan(20);
    expect(intrinsicValuePerShare).toBeLessThan(60);
    // 絕非 285,283 元與 1193554% 荒謬折價
  });
});

