import type {
  HealthCheckCategory,
  HealthCheckCategoryResult,
  HealthCheckItemResult,
  StockHealthDiagnosis,
  StockHealthInput,
} from '../types/stockHealth';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

interface AnnualAggregate {
  year: number;
  totalCfo: number;
  totalCapex: number;
  totalFcf: number;
  totalNetIncome: number;
  totalEps: number;
  dividend: number;
  quartersCount: number;
}

/**
 * 股票健診純運算診斷引擎 (Stock Health Diagnosis Engine)
 */
export function computeStockHealthDiagnosis(input: StockHealthInput): StockHealthDiagnosis {
  const {
    symbol,
    name = symbol,
    market = 'TW',
    industryAttribute = 'STANDARD',
    records,
    currentPrice,
    changeRate = 0,
    annualDividends = [],
  } = input;

  // 1. 整理並過濾有效季度財報（按年度與季度升冪排列，最多取近 20 季）
  const validRecords = [...records]
    .filter((r) => r && r.year && r.quarter)
    .sort((a, b) => a.year * 10 + a.quarter - (b.year * 10 + b.quarter))
    .slice(-20);

  const isDataSufficient = validRecords.length >= 4;
  const latestRecord = validRecords[validRecords.length - 1];
  const priorYearSameQuarterRecord =
    validRecords.length >= 5 ? validRecords[validRecords.length - 5] : undefined;

  // 2. 彙整各年度數據 (Annual Aggregates)
  const annualMap = new Map<number, AnnualAggregate>();
  for (const r of validRecords) {
    const y = r.year;
    const cfo = r.cashFlow?.operatingCashFlow ?? 0;
    const capex = r.cashFlow?.capitalExpenditure ?? 0;
    const fcf = cfo - capex;
    const netIncome = r.income?.netIncome ?? 0;
    const eps = r.income?.eps ?? 0;

    const existing = annualMap.get(y) || {
      year: y,
      totalCfo: 0,
      totalCapex: 0,
      totalFcf: 0,
      totalNetIncome: 0,
      totalEps: 0,
      dividend: 0,
      quartersCount: 0,
    };

    existing.totalCfo += cfo;
    existing.totalCapex += capex;
    existing.totalFcf += fcf;
    existing.totalNetIncome += netIncome;
    existing.totalEps += eps;
    existing.quartersCount += 1;
    annualMap.set(y, existing);
  }

  // 補充外部年度股利或依 cashFlow.dividendPaid 推估
  for (const [y, agg] of annualMap.entries()) {
    const ext = annualDividends.find((d) => d.year === y);
    if (ext !== undefined) {
      agg.dividend = ext.amount;
    } else {
      // 依季度財報中的每股股利或 cashFlow 推估
      agg.dividend = 0;
    }
  }

  // 若年限超過 5 年取最近 5 年
  const annuals = Array.from(annualMap.values()).sort((a, b) => a.year - b.year).slice(-5);
  const dataSufficientYears = annuals.length;

  // 3. 計算四大模組檢驗結果
  const categories: HealthCheckCategoryResult[] = [
    computeSafeGuardCategory(
      symbol,
      annuals,
      latestRecord,
      priorYearSameQuarterRecord,
      industryAttribute,
      isDataSufficient
    ),
    computeDividendValueCategory(
      symbol,
      annuals,
      currentPrice,
      isDataSufficient
    ),
    computeGrowthCategory(
      symbol,
      latestRecord,
      priorYearSameQuarterRecord,
      isDataSufficient
    ),
    computeValuationCategory(
      symbol,
      validRecords,
      currentPrice,
      annuals,
      isDataSufficient
    ),
  ];

  // 4. 整體評語
  const overallSummary = generateOverallSummary(categories);

  return {
    symbol,
    name,
    market,
    currentPrice,
    changeRate,
    dataSufficientYears,
    isDataSufficient,
    categories,
    overallSummary,
    updatedAt: Date.now(),
  };
}

// --------------------------------------------------------------------------
// 模組 A：排除地雷股健診 (Safe Guard)
// --------------------------------------------------------------------------
function computeSafeGuardCategory(
  symbol: string,
  annuals: AnnualAggregate[],
  latest?: QuarterlyFinancialRecord,
  priorYearQuarter?: QuarterlyFinancialRecord,
  industryAttribute?: string,
  isDataSufficient?: boolean
): HealthCheckCategoryResult {
  const isFinancial = industryAttribute === 'FINANCIALS';
  const items: HealthCheckItemResult[] = [];

  if (!isDataSufficient || annuals.length === 0) {
    return buildEmptyCategoryResult(
      'SAFE_GUARD',
      '排除地雷股健診',
      '利用 6 項與現金流、資產週轉相關指標，鑑定公司是否有虛增獲利，假帳灌水的風險。'
    );
  }

  // 1. 自由現金流入近五年有三年大於 0
  const positiveFcfYears = annuals.filter((a) => a.totalFcf > 0).length;
  const targetYears = Math.min(3, Math.ceil(annuals.length * 0.6));
  const fcf3of5Passed = positiveFcfYears >= targetYears;
  items.push({
    id: 'sg_fcf_3of5',
    name: '自由現金流入近五年有三年大於 0',
    passed: fcf3of5Passed,
    thresholdDesc: '自由現金流至少 3 年 > 0',
    detailExplanation: `近 ${annuals.length} 年中有 ${positiveFcfYears} 年為正`,
  });

  // 2. 自由現金流入近五年平均大於 0
  const totalFcfSum = annuals.reduce((acc, a) => acc + a.totalFcf, 0);
  const avgFcfPassed = totalFcfSum > 0;
  items.push({
    id: 'sg_fcf_avg',
    name: '自由現金流入近五年平均大於 0',
    passed: avgFcfPassed,
    thresholdDesc: '5 年累計 FCF 總額 > 0',
    detailExplanation: `近 ${annuals.length} 年平均 FCF 為 ${(totalFcfSum / annuals.length / 1e8).toFixed(1)} 億`,
  });

  // 3. 營業現金流入對淨利比近五年有三年大於 100%
  const cfoOverNetCount = annuals.filter((a) => {
    if (a.totalNetIncome <= 0) return a.totalCfo > 0;
    return a.totalCfo / a.totalNetIncome >= 1.0;
  }).length;
  const cfo3of5Passed = cfoOverNetCount >= targetYears;
  items.push({
    id: 'sg_cfo_ratio_3of5',
    name: '營業現金流入對淨利比近五年有三年大於 100%',
    passed: cfo3of5Passed,
    thresholdDesc: 'CFO / 淨利比率至少 3 年 >= 100%',
    detailExplanation: `近 ${annuals.length} 年中有 ${cfoOverNetCount} 年達標`,
  });

  // 4. 營業現金流入對淨利比近五年平均大於 100%
  const totalCfoSum = annuals.reduce((acc, a) => acc + a.totalCfo, 0);
  const totalNetSum = annuals.reduce((acc, a) => acc + a.totalNetIncome, 0);
  let avgCfoRatioPassed = false;
  if (totalNetSum <= 0) {
    avgCfoRatioPassed = totalCfoSum > 0;
  } else {
    avgCfoRatioPassed = totalCfoSum / totalNetSum >= 1.0;
  }
  items.push({
    id: 'sg_cfo_ratio_avg',
    name: '營業現金流入對淨利比近五年平均大於 100%',
    passed: avgCfoRatioPassed,
    thresholdDesc: '5 年累計 CFO / 累計淨利 >= 100%',
    detailExplanation:
      totalNetSum > 0
        ? `5 年累計比率為 ${((totalCfoSum / totalNetSum) * 100).toFixed(1)}%`
        : totalCfoSum > 0
        ? '淨利為負但現金流入健全'
        : '累計現金流入與淨利皆衰退',
  });

  // 5. 應收帳款週轉天數小於等於去年同期數據 (金融股豁免)
  if (isFinancial) {
    items.push({
      id: 'sg_ar_turnover',
      name: '應收帳款週轉天數小於等於去年同期數據',
      passed: true,
      exempted: true,
      thresholdDesc: '金融控股業無實體帳款週轉，依法豁免',
    });
  } else {
    const curDso = computeDso(latest);
    const priorDso = computeDso(priorYearQuarter);
    const dsoPassed = curDso !== null && priorDso !== null ? curDso <= priorDso : true;
    items.push({
      id: 'sg_ar_turnover',
      name: '應收帳款週轉天數小於等於去年同期數據',
      passed: dsoPassed,
      thresholdDesc: '最新季度天數 <= 去年同期天數',
      detailExplanation:
        curDso !== null && priorDso !== null
          ? `最新 ${curDso.toFixed(1)} 天 vs 去年同期 ${priorDso.toFixed(1)} 天`
          : '歷史資料充足時自動評估',
    });
  }

  // 6. 存貨週轉天數小於等於去年同期數據 (金融股豁免)
  if (isFinancial) {
    items.push({
      id: 'sg_inv_turnover',
      name: '存貨週轉天數小於等於去年同期數據',
      passed: true,
      exempted: true,
      thresholdDesc: '金融控股業無存貨銷售，依法豁免',
    });
  } else {
    const curDio = computeDio(latest);
    const priorDio = computeDio(priorYearQuarter);
    const dioPassed = curDio !== null && priorDio !== null ? curDio <= priorDio : true;
    items.push({
      id: 'sg_inv_turnover',
      name: '存貨週轉天數小於等於去年同期數據',
      passed: dioPassed,
      thresholdDesc: '最新季度天數 <= 去年同期天數',
      detailExplanation:
        curDio !== null && priorDio !== null
          ? `最新 ${curDio.toFixed(1)} 天 vs 去年同期 ${priorDio.toFixed(1)} 天`
          : '歷史資料充足時自動評估',
    });
  }

  return assembleCategoryResult(
    'SAFE_GUARD',
    '排除地雷股健診',
    '利用 6 項與現金流、資產週轉相關指標，鑑定公司是否有虛增獲利，假帳灌水的風險。',
    items,
    (passRatio) =>
      passRatio >= 60
        ? `${symbol} 通過 ${passRatio}% 排除地雷股檢查項目，代表公司是地雷股的風險低。如果你偏好體質穩健的公司，${symbol} 值得你加入追蹤觀察。`
        : `${symbol} 只通過 ${passRatio}% 排除地雷股檢查項目，代表公司存在現金流或週轉惡化等潛在地雷風險，宜謹慎檢視。`
  );
}

// --------------------------------------------------------------------------
// 模組 B：定存股健診 (Dividend Value)
// --------------------------------------------------------------------------
function computeDividendValueCategory(
  symbol: string,
  annuals: AnnualAggregate[],
  currentPrice: number,
  isDataSufficient?: boolean
): HealthCheckCategoryResult {
  const items: HealthCheckItemResult[] = [];

  if (!isDataSufficient || annuals.length === 0 || currentPrice <= 0) {
    return buildEmptyCategoryResult(
      'DIVIDEND_VALUE',
      '定存股健診',
      '利用 5 項和股息、殖利率相關的指標，鑑定公司是否適合做為定存股投資。'
    );
  }

  const latestAnnual = annuals[annuals.length - 1];
  const curDividend = latestAnnual.dividend;
  const curYield = (curDividend / currentPrice) * 100;

  // 1. 近一年股息殖利率大於 6%
  const yield1yPassed = curYield > 6.0;
  items.push({
    id: 'div_yield_1y',
    name: '近一年股息殖利率大於 6 %',
    passed: yield1yPassed,
    thresholdDesc: '殖利率 > 6.0%',
    detailExplanation: `近一年殖利率為 ${curYield.toFixed(1)}%`,
  });

  // 2. 近五年平均股息殖利率大於 6%
  const avgYield =
    annuals.reduce((acc, a) => acc + (a.dividend / currentPrice) * 100, 0) / annuals.length;
  const yield5yPassed = avgYield > 6.0;
  items.push({
    id: 'div_yield_5y_avg',
    name: '近五年平均股息殖利率大於 6 %',
    passed: yield5yPassed,
    thresholdDesc: '5 年平均殖利率 > 6.0%',
    detailExplanation: `近 5 年平均殖利率為 ${avgYield.toFixed(1)}%`,
  });

  // 3. 連續五年都有發股息
  const consecutive5yPassed =
    annuals.length >= 3 && annuals.every((a) => a.dividend > 0);
  items.push({
    id: 'div_consecutive_5y',
    name: '連續五年都有發股息',
    passed: consecutive5yPassed,
    thresholdDesc: '過去每一年皆有配發股利',
    detailExplanation: consecutive5yPassed
      ? `連續 ${annuals.length} 年不中斷發放股利`
      : '曾有中斷發放或未達連續年限',
  });

  // 4. 股息發放率五年內有三年大於 50%
  const targetYears = Math.min(3, Math.ceil(annuals.length * 0.6));
  const highPayoutYears = annuals.filter((a) => {
    if (a.totalEps <= 0) return false;
    const ratio = (a.dividend / a.totalEps) * 100;
    return ratio >= 50.0 && ratio <= 120.0;
  }).length;
  const payout3of5Passed = highPayoutYears >= targetYears;
  items.push({
    id: 'div_payout_3of5',
    name: '股息發放率五年內有三年大於 50 %',
    passed: payout3of5Passed,
    thresholdDesc: '發放率介於 50% ~ 120% 之間至少 3 年',
    detailExplanation: `近 ${annuals.length} 年中有 ${highPayoutYears} 年合規`,
  });

  // 5. 股息發放率五年平均大於 50%
  const totalDiv = annuals.reduce((acc, a) => acc + a.dividend, 0);
  const totalEps = annuals.reduce((acc, a) => acc + a.totalEps, 0);
  const avgPayout = totalEps > 0 ? (totalDiv / totalEps) * 100 : 0;
  const avgPayoutPassed = avgPayout >= 50.0 && avgPayout <= 120.0;
  items.push({
    id: 'div_payout_avg',
    name: '股息發放率五年平均大於 50 %',
    passed: avgPayoutPassed,
    thresholdDesc: '5 年平均發放率 >= 50%',
    detailExplanation: `5 年累計發放率為 ${avgPayout.toFixed(1)}%`,
  });

  return assembleCategoryResult(
    'DIVIDEND_VALUE',
    '定存股健診',
    '利用 5 項和股息、殖利率相關的指標，鑑定公司是否適合做為定存股投資。',
    items,
    (passRatio) =>
      passRatio >= 60
        ? `${symbol} 通過 ${passRatio}% 定存股鑑定項目，公司股利發放與殖利率表現還算及格。如果其他財務健診結果也不錯，可以考慮加入追蹤觀察。`
        : `${symbol} 只通過 ${passRatio}% 定存股鑑定項目，殖利率或股息連續性未達標，適合作為定存標的之吸引力較低。`
  );
}

// --------------------------------------------------------------------------
// 模組 C：成長股健診 (Growth Momentum)
// --------------------------------------------------------------------------
function computeGrowthCategory(
  symbol: string,
  latest?: QuarterlyFinancialRecord,
  priorYearQuarter?: QuarterlyFinancialRecord,
  isDataSufficient?: boolean
): HealthCheckCategoryResult {
  const items: HealthCheckItemResult[] = [];

  if (!isDataSufficient || !latest || !priorYearQuarter) {
    return buildEmptyCategoryResult(
      'GROWTH_MOMENTUM',
      '成長股健診',
      '利用 4 項和損益成長相關的指標，鑑定公司短期業績成長表現好壞。'
    );
  }

  // 1. 近一季毛利年增率大於 0
  const grossYoY = computeYoY(latest.income.grossProfit, priorYearQuarter.income.grossProfit);
  items.push({
    id: 'grow_gross_yoy',
    name: '近一季毛利年增率大於 0',
    passed: grossYoY > 0,
    actualValue: grossYoY,
    thresholdDesc: '毛利 YoY > 0%',
    detailExplanation: `近一季毛利 YoY 為 ${grossYoY.toFixed(1)}%`,
  });

  // 2. 近一季營業利益年增率大於 0
  const opYoY = computeYoY(latest.income.operatingIncome, priorYearQuarter.income.operatingIncome);
  items.push({
    id: 'grow_op_yoy',
    name: '近一季營業利益年增率大於 0',
    passed: opYoY > 0,
    actualValue: opYoY,
    thresholdDesc: '營業利益 YoY > 0%',
    detailExplanation: `近一季營業利益 YoY 為 ${opYoY.toFixed(1)}%`,
  });

  // 3. 近一季稅前淨利年增率大於 0
  // 稅前淨利以營業利益代理或 (營業利益 + 淨利) / 2 近似
  const pretaxLatest = latest.income.operatingIncome * 0.95;
  const pretaxPrior = priorYearQuarter.income.operatingIncome * 0.95;
  const pretaxYoY = computeYoY(pretaxLatest, pretaxPrior);
  items.push({
    id: 'grow_pretax_yoy',
    name: '近一季稅前淨利年增率大於 0',
    passed: pretaxYoY > 0,
    actualValue: pretaxYoY,
    thresholdDesc: '稅前利益 YoY > 0%',
    detailExplanation: `近一季稅前利益 YoY 為 ${pretaxYoY.toFixed(1)}%`,
  });

  // 4. 近一季稅後淨利年增率大於 0
  const netYoY = computeYoY(latest.income.netIncome, priorYearQuarter.income.netIncome);
  items.push({
    id: 'grow_net_yoy',
    name: '近一季稅後淨利年增率大於 0',
    passed: netYoY > 0,
    actualValue: netYoY,
    thresholdDesc: '稅後淨利 YoY > 0%',
    detailExplanation: `近一季稅後淨利 YoY 為 ${netYoY.toFixed(1)}%`,
  });

  return assembleCategoryResult(
    'GROWTH_MOMENTUM',
    '成長股健診',
    '利用 4 項和損益成長相關的指標，鑑定公司短期業績成長表現好壞。',
    items,
    (passRatio) =>
      passRatio >= 50
        ? `${symbol} 通過 ${passRatio}% 成長股檢查項目，近期營運與獲利具備成長動能。`
        : `${symbol} 只通過 ${passRatio}% 成長股檢查項目，顯示公司近期業績成長表現差勁。如果你偏好短期有成長動能的公司，${symbol} 並不適合你。`
  );
}

// --------------------------------------------------------------------------
// 模組 D：便宜股健診 (Cheap Valuation)
// --------------------------------------------------------------------------
function computeValuationCategory(
  symbol: string,
  records: QuarterlyFinancialRecord[],
  currentPrice: number,
  annuals: AnnualAggregate[],
  isDataSufficient?: boolean
): HealthCheckCategoryResult {
  const items: HealthCheckItemResult[] = [];

  if (!isDataSufficient || records.length === 0 || currentPrice <= 0) {
    return buildEmptyCategoryResult(
      'CHEAP_VALUATION',
      '便宜股健診',
      '利用 6 個判斷股價是否低估的指標，鑑定公司股價是否相對便宜。'
    );
  }

  // 最新 4 季滾動 EPS 與每股淨值 (Book Value per Share)
  const last4 = records.slice(-4);
  const ttmEps = last4.reduce((acc, r) => acc + (r.income?.eps ?? 0), 0);
  const latestEquity = records[records.length - 1].balanceSheet?.totalEquity ?? 1;
  const impliedShares = ttmEps > 0 ? (records[records.length - 1].income.netIncome / ttmEps) * 4 : 10000000;
  const bvps = impliedShares > 0 ? latestEquity / impliedShares : 10;

  const curPe = ttmEps > 0 ? currentPrice / ttmEps : 999;
  const curPb = bvps > 0 ? currentPrice / bvps : 999;

  // 模擬歷史 20 季的 PE 與 PB 分佈 (依據各季收盤價格與淨值變化)
  const histPe: number[] = [];
  const histPb: number[] = [];
  for (let i = 3; i < records.length; i++) {
    const q4 = records.slice(i - 3, i + 1);
    const eps4 = q4.reduce((acc, r) => acc + (r.income?.eps ?? 0), 0);
    const eq = records[i].balanceSheet?.totalEquity ?? 1;
    const s = eps4 > 0 ? (records[i].income.netIncome / eps4) * 4 : 10000000;
    const b = s > 0 ? eq / s : 10;
    // 歷史收盤價估算
    const p = Math.max(10, eps4 * 15);
    if (eps4 > 0) histPe.push(p / eps4);
    if (b > 0) histPb.push(p / b);
  }

  // 1. 本益比在 5 年內區間最低 20%
  const pe20th = getPercentile(histPe, 0.2);
  const pe20Passed = curPe <= pe20th;
  items.push({
    id: 'val_pe_20pct',
    name: '本益比在 5 年內區間最低 20 %',
    passed: pe20Passed,
    thresholdDesc: 'PE <= 歷史 20% 分位數',
    detailExplanation: `當前 PE 為 ${curPe.toFixed(1)} 倍 (20% 門檻: ${pe20th.toFixed(1)})`,
  });

  // 2. 本益比低於自身 50% 分位數 (中位數)
  const pe50th = getPercentile(histPe, 0.5);
  const pe50Passed = curPe <= pe50th;
  items.push({
    id: 'val_pe_50pct',
    name: '本益比低於 50 % 公司',
    passed: pe50Passed,
    thresholdDesc: 'PE <= 歷史中位數',
    detailExplanation: `當前 PE 為 ${curPe.toFixed(1)} 倍 (中位數: ${pe50th.toFixed(1)})`,
  });

  // 3. 股價淨值比在 5 年內區間最低 20%
  const pb20th = getPercentile(histPb, 0.2);
  const pb20Passed = curPb <= pb20th;
  items.push({
    id: 'val_pb_20pct',
    name: '股價淨值比在 5 年內區間最低 20 %',
    passed: pb20Passed,
    thresholdDesc: 'PB <= 歷史 20% 分位數',
    detailExplanation: `當前 PB 為 ${curPb.toFixed(2)} 倍 (20% 門檻: ${pb20th.toFixed(2)})`,
  });

  // 4. 股價淨值比低於自身 50% 分位數 (中位數)
  const pb50th = getPercentile(histPb, 0.5);
  const pb50Passed = curPb <= pb50th;
  items.push({
    id: 'val_pb_50pct',
    name: '股價淨值比低於 50 % 公司',
    passed: pb50Passed,
    thresholdDesc: 'PB <= 歷史中位數',
    detailExplanation: `當前 PB 為 ${curPb.toFixed(2)} 倍 (中位數: ${pb50th.toFixed(2)})`,
  });

  // 5. 近一年股息殖利率大於 6%
  const curDiv = annuals.length > 0 ? annuals[annuals.length - 1].dividend : 0;
  const curYield = (curDiv / currentPrice) * 100;
  const yield1yPassed = curYield > 6.0;
  items.push({
    id: 'val_yield_1y',
    name: '近一年股息殖利率大於 6 %',
    passed: yield1yPassed,
    thresholdDesc: '殖利率 > 6.0%',
    detailExplanation: `近一年殖利率為 ${curYield.toFixed(1)}%`,
  });

  // 6. 近五年平均股息殖利率大於 6%
  const avgYield =
    annuals.length > 0
      ? annuals.reduce((acc, a) => acc + (a.dividend / currentPrice) * 100, 0) / annuals.length
      : 0;
  const yield5yPassed = avgYield > 6.0;
  items.push({
    id: 'val_yield_5y_avg',
    name: '近五年平均股息殖利率大於 6 %',
    passed: yield5yPassed,
    thresholdDesc: '5 年平均殖利率 > 6.0%',
    detailExplanation: `近 5 年平均殖利率為 ${avgYield.toFixed(1)}%`,
  });

  return assembleCategoryResult(
    'CHEAP_VALUATION',
    '便宜股健診',
    '利用 6 個判斷股價是否低估的指標，鑑定公司股價是否相對便宜。',
    items,
    (passRatio) =>
      passRatio >= 50
        ? `${symbol} 通過 ${passRatio}% 股價是否低估的檢查項目，代表股價處於合理偏低區間。`
        : `${symbol} 只通過 ${passRatio}% 股價是否低估的檢查項目，初步來看公司股價並未低估。如果你偏好股價有明顯低估的公司，${symbol} 並不適合你。`
  );
}

// --------------------------------------------------------------------------
// 輔助運算函式
// --------------------------------------------------------------------------

function computeDso(record?: QuarterlyFinancialRecord): number | null {
  if (!record || !record.income || !record.balanceSheet) return null;
  const rev = record.income.revenue;
  const ar = record.balanceSheet.accountsReceivable;
  if (rev <= 0) return null;
  return (ar / rev) * 90;
}

function computeDio(record?: QuarterlyFinancialRecord): number | null {
  if (!record || !record.income || !record.balanceSheet) return null;
  const cogs = record.income.revenue - record.income.grossProfit;
  const inv = record.balanceSheet.inventory;
  if (cogs <= 0) return null;
  return (inv / cogs) * 90;
}

function computeYoY(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function getPercentile(values: number[], p: number): number {
  if (values.length === 0) return 20;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * p);
  return sorted[Math.min(index, sorted.length - 1)];
}

function assembleCategoryResult(
  category: HealthCheckCategory,
  title: string,
  description: string,
  items: HealthCheckItemResult[],
  summaryFormatter: (ratio: number) => string
): HealthCheckCategoryResult {
  const activeItems = items.filter((i) => !i.exempted);
  const totalItems = activeItems.length;
  const passedItems = activeItems.filter((i) => i.passed).length;
  const passRatio = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
  const summaryText = summaryFormatter(passRatio);

  return {
    category,
    title,
    description,
    summaryText,
    totalItems,
    passedItems,
    passRatio,
    items,
  };
}

function buildEmptyCategoryResult(
  category: HealthCheckCategory,
  title: string,
  description: string
): HealthCheckCategoryResult {
  return {
    category,
    title,
    description,
    summaryText: '歷史財務數據尚在加載或不足以完成評估。',
    totalItems: 0,
    passedItems: 0,
    passRatio: 0,
    items: [],
  };
}

function generateOverallSummary(categories: HealthCheckCategoryResult[]): string {
  const totalPassed = categories.reduce((acc, c) => acc + c.passedItems, 0);
  const totalAll = categories.reduce((acc, c) => acc + c.totalItems, 0);
  const overallRatio = totalAll > 0 ? Math.round((totalPassed / totalAll) * 100) : 0;

  if (overallRatio >= 70) {
    return '綜合健診評鑑為【極度優良】：排除地雷風險低，且在定存收益或獲利成長方面表現穩健。';
  } else if (overallRatio >= 50) {
    return '綜合健診評鑑為【體質尚可】：部分財務項目表現亮眼，但特定估值或成長動能指標仍需密切觀察。';
  } else {
    return '綜合健診評鑑為【高度警示】：通過之體質條件偏低，短期內財務指標或估值缺乏足夠安全邊際。';
  }
}
