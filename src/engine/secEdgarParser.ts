/**
 * 美股 SEC EDGAR 官方財務數據解析引擎 (Spec 0167 / Ticket 08)
 * SEC EDGAR US-GAAP Tri-Statement Parser to Canonical QuarterlyFinancialRecord
 */

import { QuarterlyFinancialRecord } from '../types/financialForensic';

interface SecFactUnitItem {
  end: string;
  val: number;
  fy: number;
  fp: string; // 'Q1' | 'Q2' | 'Q3' | 'FY' | 'CY'
  form: string;
}

export function parseSecCompanyFactsToRecords(symbol: string, rawJson: any): QuarterlyFinancialRecord[] {
  if (!rawJson || !rawJson.facts) {
    return [];
  }

  // 優先支援 US-GAAP，若無則降級備援 IFRS-full (常見於 ADR 與外國發行人申報)
  const factsStore = rawJson.facts['us-gaap'] || rawJson.facts['ifrs-full'];
  if (!factsStore) {
    return [];
  }

  // 輔助函式：提取特定概念在特定季度單位下的數值映射 (key: "YYYY-Q", value: number)
  const extractConceptMap = (conceptNames: string[]): Map<string, { val: number; end: string; year: number; quarter: number }> => {
    const map = new Map<string, { val: number; end: string; year: number; quarter: number }>();
    for (const name of conceptNames) {
      const concept = factsStore[name];
      if (!concept || !concept.units) continue;
      // 取 USD 或 USD/shares
      const unitArray: SecFactUnitItem[] = concept.units.USD || concept.units['USD/shares'] || [];
      for (const item of unitArray) {
        if (!item.fy || !item.fp || !item.end) continue;
        let quarter = 0;
        if (/^Q[1-4]$/i.test(item.fp)) {
          quarter = parseInt(item.fp.charAt(1), 10);
        } else if (item.fp === 'FY') {
          quarter = 4;
        }
        if (quarter < 1 || quarter > 4) continue;
        const key = `${item.fy}-Q${quarter}`;
        if (!map.has(key)) {
          map.set(key, { val: item.val, end: item.end, year: item.fy, quarter });
        }
      }
    }
    return map;
  };

  const revenueMap = extractConceptMap([
    'Revenues',
    'SalesRevenueNet',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'OperatingRevenue',
    'Revenue',
    'SalesRevenueGoodsNet',
    'InterestAndDividendIncomeOperating',
  ]);
  const grossProfitMap = extractConceptMap(['GrossProfit', 'GrossProfitLoss']);
  const opIncomeMap = extractConceptMap(['OperatingIncomeLoss', 'OperatingProfitLoss']);
  const netIncomeMap = extractConceptMap(['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic']);
  const assetsMap = extractConceptMap(['Assets']);
  const liabilitiesMap = extractConceptMap(['Liabilities', 'LiabilitiesCurrentAndNoncurrent']);
  const arMap = extractConceptMap(['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsAndOtherReceivablesNetCurrent']);
  const invMap = extractConceptMap(['InventoryNet', 'InventoryGross']);
  const cashMap = extractConceptMap(['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents']);
  const epsMap = extractConceptMap(['EarningsPerShareDiluted', 'EarningsPerShareBasic', 'DilutedEarningsLossPerShare', 'BasicEarningsLossPerShare']);
  const cfoMap = extractConceptMap(['NetCashProvidedByUsedInOperatingActivities', 'CashFlowsFromUsedInOperatingActivities']);
  const capexMap = extractConceptMap(['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets']);

  // 收集所有出現過的季度鍵
  const allKeys = new Set<string>([
    ...revenueMap.keys(),
    ...assetsMap.keys(),
    ...netIncomeMap.keys(),
  ]);

  const results: QuarterlyFinancialRecord[] = [];

  for (const key of allKeys) {
    const revItem = revenueMap.get(key);
    const assetItem = assetsMap.get(key);
    const netItem = netIncomeMap.get(key);

    const year = revItem?.year || assetItem?.year || netItem?.year || 0;
    const quarter = revItem?.quarter || assetItem?.quarter || netItem?.quarter || 0;
    const periodDate = revItem?.end || assetItem?.end || netItem?.end || '';

    if (!year || !quarter || !periodDate) continue;

    const totalAssets = assetsMap.get(key)?.val ?? 0;
    const totalLiabilities = liabilitiesMap.get(key)?.val ?? 0;
    const totalEquity = totalAssets - totalLiabilities;

    results.push({
      symbol: symbol.toUpperCase(),
      market: 'US',
      year,
      quarter,
      periodDate,
      income: {
        revenue: revenueMap.get(key)?.val ?? 0,
        grossProfit: grossProfitMap.get(key)?.val ?? 0,
        operatingIncome: opIncomeMap.get(key)?.val ?? 0,
        netIncome: netIncomeMap.get(key)?.val ?? 0,
        eps: epsMap.get(key)?.val ?? 0,
      },
      balanceSheet: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        accountsReceivable: arMap.get(key)?.val ?? 0,
        inventory: invMap.get(key)?.val ?? 0,
        cashAndEquivalents: cashMap.get(key)?.val ?? 0,
      },
      cashFlow: {
        operatingCashFlow: cfoMap.get(key)?.val ?? 0,
        capitalExpenditure: capexMap.get(key)?.val ?? 0,
      },
      updatedAt: Date.now(),
    });
  }

  // 按年度與季度升冪排序
  results.sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter);
  return results;
}
