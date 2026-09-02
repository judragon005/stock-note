import { QuantPerformanceMetrics, MetricDiagnosis, QuantDiagnosisMap } from '../types/stock';

/**
 * 計算序列之日報酬率數列: r_t = (P_t - P_{t-1}) / P_{t-1}
 */
export function calculateDailyReturns(prices: number[]): number[] {
  if (!prices || prices.length < 2) {
    return [];
  }

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * 計算年化波動度 (Annualized Volatility %): std(daily_returns) * sqrt(252) * 100
 */
export function calculateAnnualizedVolatility(dailyReturns: number[]): number {
  if (!dailyReturns || dailyReturns.length < 2) {
    return 0;
  }

  const mean = dailyReturns.reduce((acc, r) => acc + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  const std = Math.sqrt(variance);
  const annualized = std * Math.sqrt(252) * 100;

  return Math.round(annualized * 100) / 100;
}

/**
 * 計算歷史最大回撤 (Max Drawdown, MDD %)
 */
export function calculateMaxDrawdown(prices: number[]): number {
  if (!prices || prices.length < 2) {
    return 0;
  }

  let peak = prices[0];
  let maxDD = 0;

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    } else if (peak > 0) {
      const dd = ((peak - price) / peak) * 100;
      if (dd > maxDD) {
        maxDD = dd;
      }
    }
  }

  return Math.round(maxDD * 100) / 100;
}

/**
 * 計算夏普值 (Sharpe Ratio)
 * (年化總報酬率% - 年化無風險利率%) / 年化波動度%
 */
export function calculateSharpeRatio(
  annualizedReturnPercent: number,
  annualizedVolatilityPercent: number,
  riskFreeRatePercent = 1.5
): number {
  if (annualizedVolatilityPercent <= 0) {
    return 0;
  }
  const excessReturn = annualizedReturnPercent - riskFreeRatePercent;
  const sharpe = excessReturn / annualizedVolatilityPercent;
  return Math.round(sharpe * 100) / 100;
}

/**
 * 計算貝塔係數 (Beta) 與 皮爾森相關係數 (Correlation)
 */
export function calculateBetaAndCorrelation(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): { beta: number; correlation: number } {
  const len = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (len < 2) {
    return { beta: 1, correlation: 1 };
  }

  const p = portfolioReturns.slice(0, len);
  const b = benchmarkReturns.slice(0, len);

  const meanP = p.reduce((acc, v) => acc + v, 0) / len;
  const meanB = b.reduce((acc, v) => acc + v, 0) / len;

  let cov = 0;
  let varB = 0;
  let varP = 0;

  for (let i = 0; i < len; i++) {
    const diffP = p[i] - meanP;
    const diffB = b[i] - meanB;
    cov += diffP * diffB;
    varB += diffB * diffB;
    varP += diffP * diffP;
  }

  cov /= len - 1;
  varB /= len - 1;
  varP /= len - 1;

  const beta = varB > 0 ? cov / varB : 1;
  const stdProd = Math.sqrt(varP) * Math.sqrt(varB);
  const correlation = stdProd > 0 ? cov / stdProd : 1;

  return {
    beta: Math.round(beta * 100) / 100,
    correlation: Math.round(correlation * 100) / 100,
  };
}

/**
 * 計算詹森阿爾法 (Jensen's Alpha %)
 * Alpha = Rp_ann - [Rf + Beta * (Rb_ann - Rf)]
 */
export function calculateJensensAlpha(
  portfolioAnnualizedReturnPercent: number,
  benchmarkAnnualizedReturnPercent: number,
  beta: number,
  riskFreeRatePercent = 1.5
): number {
  const expectedReturn =
    riskFreeRatePercent + beta * (benchmarkAnnualizedReturnPercent - riskFreeRatePercent);
  const alpha = portfolioAnnualizedReturnPercent - expectedReturn;
  return Math.round(alpha * 100) / 100;
}

/**
 * 完整產生量化指標報告 (QuantPerformanceMetrics)
 * 當未提供基準數列 (benchmarkPrices 長度 < 2) 時，獨立計算自身投資組合的波動度、夏普值與最大回撤，大盤指標設為 null
 */
export function calculateQuantMetrics(
  portfolioPrices: number[],
  benchmarkPrices: number[] = [],
  riskFreeRatePercent = 1.5
): QuantPerformanceMetrics {
  const pReturns = calculateDailyReturns(portfolioPrices);
  const portfolioMaxDrawdown = calculateMaxDrawdown(portfolioPrices);
  const annualizedVolatility = calculateAnnualizedVolatility(pReturns);

  // 年化複合成長率 CAGR 概算
  const days = Math.max(portfolioPrices.length, 1);
  const totalReturnRatio =
    portfolioPrices.length > 0 && portfolioPrices[0] > 0
      ? portfolioPrices[portfolioPrices.length - 1] / portfolioPrices[0]
      : 1;

  const years = Math.max(days / 252, 1 / 252);
  const annualizedReturnPercent = (Math.pow(totalReturnRatio, 1 / years) - 1) * 100;

  const sharpeRatio = calculateSharpeRatio(
    annualizedReturnPercent,
    annualizedVolatility,
    riskFreeRatePercent
  );

  const hasBenchmark = benchmarkPrices && benchmarkPrices.length >= 2;

  if (!hasBenchmark) {
    return {
      hasBenchmark: false,
      alpha: null,
      beta: null,
      sharpeRatio,
      annualizedVolatility,
      benchmarkMaxDrawdown: null,
      portfolioMaxDrawdown,
      correlation: null,
    };
  }

  const bReturns = calculateDailyReturns(benchmarkPrices);
  const benchmarkMaxDrawdown = calculateMaxDrawdown(benchmarkPrices);

  const bDays = Math.max(benchmarkPrices.length, 1);
  const bTotalReturnRatio =
    benchmarkPrices.length > 0 && benchmarkPrices[0] > 0
      ? benchmarkPrices[benchmarkPrices.length - 1] / benchmarkPrices[0]
      : 1;
  const bYears = Math.max(bDays / 252, 1 / 252);
  const benchmarkAnnualizedReturnPercent = (Math.pow(bTotalReturnRatio, 1 / bYears) - 1) * 100;

  const { beta, correlation } = calculateBetaAndCorrelation(pReturns, bReturns);
  const alpha = calculateJensensAlpha(
    annualizedReturnPercent,
    benchmarkAnnualizedReturnPercent,
    beta,
    riskFreeRatePercent
  );

  return {
    hasBenchmark: true,
    alpha,
    beta,
    sharpeRatio,
    annualizedVolatility,
    benchmarkMaxDrawdown,
    portfolioMaxDrawdown,
    correlation,
  };
}

/**
 * 依據量化指標數據與大盤基準，產出 5 大量化指標的深度原理與動態診斷分析
 */
export function getQuantMetricDiagnosis(
  metrics: QuantPerformanceMetrics,
  benchmarkLabel = ''
): QuantDiagnosisMap {
  const bLabel = benchmarkLabel || '大盤基準';

  // 1. 詹森阿爾法 (Alpha)
  let alphaDiag: MetricDiagnosis;
  if (!metrics.hasBenchmark || metrics.alpha === null) {
    alphaDiag = {
      id: 'alpha',
      title: '詹森阿爾法 (Alpha)',
      fullName: "Jensen's Alpha",
      definition: '衡量在 CAPM 理論模型下，扣除承擔市場系統性風險後，投資人靠選股或擇時創造的純主動超額報酬。',
      formula: 'α = Rp - [Rf + β(Rb - Rf)]',
      benchmarkNote: '需選取大盤基準（如 0050 或 SPY）以試算 CAPM 期望回報',
      level: 'NEUTRAL',
      levelBadge: '⚪ 需大盤基準',
      badgeColor: '#94a3b8',
      summary: '目前未設定基準對照，無法計算相對於大盤之超額年化報酬。',
      suggestion: '切換上方 🇹🇼 0050 或 🇺🇸 SPY 基準即可解鎖 Alpha 診斷。',
    };
  } else if (metrics.alpha >= 5.0) {
    alphaDiag = {
      id: 'alpha',
      title: '詹森阿爾法 (Alpha)',
      fullName: "Jensen's Alpha",
      definition: '衡量在 CAPM 理論模型下，扣除承擔市場系統性風險後，投資人靠選股或擇時創造的純主動超額報酬。',
      formula: 'α = Rp - [Rf + β(Rb - Rf)]',
      benchmarkNote: `基準：${bLabel}，無風險利率 Rf = 1.5%`,
      level: 'EXCELLENT',
      levelBadge: '🌟 卓越超額',
      badgeColor: '#10b981',
      summary: `超額報酬達 +${metrics.alpha.toFixed(2)}%，主動選股大幅跑贏同等風險下的市場預期回報！`,
      suggestion: '策略選股效能極佳，建議維持既有核心邏輯，並適時保護獲利利潤。',
    };
  } else if (metrics.alpha >= 0) {
    alphaDiag = {
      id: 'alpha',
      title: '詹森阿爾法 (Alpha)',
      fullName: "Jensen's Alpha",
      definition: '衡量在 CAPM 理論模型下，扣除承擔市場系統性風險後，投資人靠選股或擇時創造的純主動超額報酬。',
      formula: 'α = Rp - [Rf + β(Rb - Rf)]',
      benchmarkNote: `基準：${bLabel}，無風險利率 Rf = 1.5%`,
      level: 'GOOD',
      levelBadge: '🟢 穩健超額',
      badgeColor: '#34d399',
      summary: `產生 +${metrics.alpha.toFixed(2)}% 正向超額收益，主動配置展現正向選股與擇時貢獻。`,
      suggestion: '持續遵守交易計畫與停損停利紀律，鞏固超額收益成果。',
    };
  } else if (metrics.alpha >= -5.0) {
    alphaDiag = {
      id: 'alpha',
      title: '詹森阿爾法 (Alpha)',
      fullName: "Jensen's Alpha",
      definition: '衡量在 CAPM 理論模型下，扣除承擔市場系統性風險後，投資人靠選股或擇時創造的純主動超額報酬。',
      formula: 'α = Rp - [Rf + β(Rb - Rf)]',
      benchmarkNote: `基準：${bLabel}，無風險利率 Rf = 1.5%`,
      level: 'FAIR',
      levelBadge: '🟡 略遜大盤',
      badgeColor: '#fbbf24',
      summary: `阿爾法為 ${metrics.alpha.toFixed(2)}%，承擔之市場風險未獲完全補償，略遜於被動指數。`,
      suggestion: '建議檢視虧損標的進場假設，或適度提高核心大盤 ETF 配置比重。',
    };
  } else {
    alphaDiag = {
      id: 'alpha',
      title: '詹森阿爾法 (Alpha)',
      fullName: "Jensen's Alpha",
      definition: '衡量在 CAPM 理論模型下，扣除承擔市場系統性風險後，投資人靠選股或擇時創造的純主動超額報酬。',
      formula: 'α = Rp - [Rf + β(Rb - Rf)]',
      benchmarkNote: `基準：${bLabel}，無風險利率 Rf = 1.5%`,
      level: 'ATTENTION',
      levelBadge: '🔴 落後大盤',
      badgeColor: '#f87171',
      summary: `阿爾法為 ${metrics.alpha.toFixed(2)}%，主動選股或擇時產生負貢獻，明顯落後基準。`,
      suggestion: '需嚴格落實停損風控，避免凹單，並考慮大幅提高指數化被動投資。',
    };
  }

  // 2. 貝塔係數 (Beta)
  let betaDiag: MetricDiagnosis;
  if (!metrics.hasBenchmark || metrics.beta === null) {
    betaDiag = {
      id: 'beta',
      title: '貝塔係數 (Beta)',
      fullName: 'Beta Coefficient',
      definition: '衡量投資組合對基準大盤波動的敏感度（系統性風險與聯動性）。',
      formula: 'β = Cov(Rp, Rb) / Var(Rb)',
      benchmarkNote: '需選取大盤基準以試算相關度與敏感度',
      level: 'NEUTRAL',
      levelBadge: '⚪ 需大盤基準',
      badgeColor: '#94a3b8',
      summary: '未設定基準對照，無法計算系統性風險敏感度。',
      suggestion: '切換上方大盤按鈕即可即時分析 Beta 與相關度。',
    };
  } else if (metrics.beta < 0.5) {
    betaDiag = {
      id: 'beta',
      title: '貝塔係數 (Beta)',
      fullName: 'Beta Coefficient',
      definition: '衡量投資組合對基準大盤波動的敏感度（系統性風險與聯動性）。',
      formula: 'β = Cov(Rp, Rb) / Var(Rb)',
      benchmarkNote: `基準：${bLabel}，相關度 r = ${metrics.correlation !== null ? metrics.correlation.toFixed(2) : '無'}`,
      level: 'GOOD',
      levelBadge: '🛡️ 防禦獨立型',
      badgeColor: '#60a5fa',
      summary: `Beta 僅 ${metrics.beta.toFixed(2)}，對大盤波動極不敏感，走勢具備高度獨立抗跌性。`,
      suggestion: '空頭市場防禦極佳；但在大盤強烈主升段時，漲幅可能較為溫和。',
    };
  } else if (metrics.beta <= 0.8) {
    betaDiag = {
      id: 'beta',
      title: '貝塔係數 (Beta)',
      fullName: 'Beta Coefficient',
      definition: '衡量投資組合對基準大盤波動的敏感度（系統性風險與聯動性）。',
      formula: 'β = Cov(Rp, Rb) / Var(Rb)',
      benchmarkNote: `基準：${bLabel}，相關度 r = ${metrics.correlation !== null ? metrics.correlation.toFixed(2) : '無'}`,
      level: 'GOOD',
      levelBadge: '🟢 低度聯動',
      badgeColor: '#34d399',
      summary: `Beta 為 ${metrics.beta.toFixed(2)}，波動幅度小於大盤，配置風格偏向低波防守。`,
      suggestion: '兼具抗跌性與部分指數上漲動能，適合追求穩健成長的投資者。',
    };
  } else if (metrics.beta <= 1.2) {
    betaDiag = {
      id: 'beta',
      title: '貝塔係數 (Beta)',
      fullName: 'Beta Coefficient',
      definition: '衡量投資組合對基準大盤波動的敏感度（系統性風險與聯動性）。',
      formula: 'β = Cov(Rp, Rb) / Var(Rb)',
      benchmarkNote: `基準：${bLabel}，相關度 r = ${metrics.correlation !== null ? metrics.correlation.toFixed(2) : '無'}`,
      level: 'NEUTRAL',
      levelBadge: '🔵 大盤同步',
      badgeColor: '#38bdf8',
      summary: `Beta 為 ${metrics.beta.toFixed(2)}，波動節奏與大盤基本同步，主要承擔市場平均風險。`,
      suggestion: '組合績效將緊密隨總體大盤多空景氣起伏。',
    };
  } else {
    betaDiag = {
      id: 'beta',
      title: '貝塔係數 (Beta)',
      fullName: 'Beta Coefficient',
      definition: '衡量投資組合對基準大盤波動的敏感度（系統性風險與聯動性）。',
      formula: 'β = Cov(Rp, Rb) / Var(Rb)',
      benchmarkNote: `基準：${bLabel}，相關度 r = ${metrics.correlation !== null ? metrics.correlation.toFixed(2) : '無'}`,
      level: 'ATTENTION',
      levelBadge: '⚡ 敏銳進攻型',
      badgeColor: '#f97316',
      summary: `Beta 達 ${metrics.beta.toFixed(2)}，波動明顯大於大盤，牛市衝刺力強但回檔壓力亦大。`,
      suggestion: '宜隨時留意大盤頭部反轉訊號，並落實高檔分批減碼以防回吐。',
    };
  }

  // 3. 夏普值 (Sharpe Ratio)
  let sharpeDiag: MetricDiagnosis;
  if (metrics.sharpeRatio >= 2.0) {
    sharpeDiag = {
      id: 'sharpe',
      title: '夏普值 (Sharpe)',
      fullName: 'Sharpe Ratio',
      definition: '衡量每多承受 1% 年化總波動度所換取的超額年化報酬率（投資性價比）。',
      formula: 'Sharpe = (Rp - Rf) / σp',
      benchmarkNote: '無風險利率基準 Rf = 1.5%',
      level: 'EXCELLENT',
      levelBadge: '🌟 極致卓越',
      badgeColor: '#10b981',
      summary: `夏普值高達 ${metrics.sharpeRatio.toFixed(2)}，達到機構級頂尖表現，風險回報比極為優秀！`,
      suggestion: '投資組合在極佳的波動度下創造了豐厚收益，效益最大化。',
    };
  } else if (metrics.sharpeRatio >= 1.0) {
    sharpeDiag = {
      id: 'sharpe',
      title: '夏普值 (Sharpe)',
      fullName: 'Sharpe Ratio',
      definition: '衡量每多承受 1% 年化總波動度所換取的超額年化報酬率（投資性價比）。',
      formula: 'Sharpe = (Rp - Rf) / σp',
      benchmarkNote: '無風險利率基準 Rf = 1.5%',
      level: 'GOOD',
      levelBadge: '🟢 優良穩健',
      badgeColor: '#34d399',
      summary: `夏普值為 ${metrics.sharpeRatio.toFixed(2)}，承擔每單位風險均換取了高於市場平均的合理超額回報。`,
      suggestion: '投資性價比健康，建議維持既有部位規模控管節奏。',
    };
  } else if (metrics.sharpeRatio >= 0.0) {
    sharpeDiag = {
      id: 'sharpe',
      title: '夏普值 (Sharpe)',
      fullName: 'Sharpe Ratio',
      definition: '衡量每多承受 1% 年化總波動度所換取的超額年化報酬率（投資性價比）。',
      formula: 'Sharpe = (Rp - Rf) / σp',
      benchmarkNote: '無風險利率基準 Rf = 1.5%',
      level: 'FAIR',
      levelBadge: '🟡 回報偏弱',
      badgeColor: '#fbbf24',
      summary: `夏普值為 ${metrics.sharpeRatio.toFixed(2)}，雖有正報酬但每單位波動所換取的回報相對有限。`,
      suggestion: '可透過設定明確停損、汰除高波動低報酬標的來提升整體夏普值。',
    };
  } else {
    sharpeDiag = {
      id: 'sharpe',
      title: '夏普值 (Sharpe)',
      fullName: 'Sharpe Ratio',
      definition: '衡量每多承受 1% 年化總波動度所換取的超額年化報酬率（投資性價比）。',
      formula: 'Sharpe = (Rp - Rf) / σp',
      benchmarkNote: '無風險利率基準 Rf = 1.5%',
      level: 'ATTENTION',
      levelBadge: '🔴 需留意',
      badgeColor: '#f87171',
      summary: `夏普值為負數 (${metrics.sharpeRatio.toFixed(2)})，報酬率低於 1.5% 無風險定存，承擔風險未獲補償。`,
      suggestion: '應嚴格檢查持倉結構，降低投機部位或調整選股策略。',
    };
  }

  // 4. 最大回撤 (Max Drawdown, MDD)
  let mddDiag: MetricDiagnosis;
  const mddVal = metrics.portfolioMaxDrawdown;
  const bmddNote =
    metrics.benchmarkMaxDrawdown !== null
      ? `基準歷史最大回撤：-${metrics.benchmarkMaxDrawdown.toFixed(2)}%`
      : '未設定大盤基準回撤';

  if (mddVal <= 10.0) {
    mddDiag = {
      id: 'mdd',
      title: '最大回撤 (MDD)',
      fullName: 'Max Drawdown',
      definition: '在統計期間內，淨值從歷史最高峰跌落至最低谷的最大跌幅（歷史最壞情況下的虧損壓力）。',
      formula: 'MDD = Max[(Peak - NAV) / Peak]',
      benchmarkNote: bmddNote,
      level: 'EXCELLENT',
      levelBadge: '🛡️ 風控極佳',
      badgeColor: '#10b981',
      summary: `歷史最大回撤僅 -${mddVal.toFixed(2)}%，下檔防禦控制極為優異，資產安全邊際充沛。`,
      suggestion: '風控紀律嚴密，回檔幅度極小，有助於複利持續滾動。',
    };
  } else if (mddVal <= 20.0) {
    mddDiag = {
      id: 'mdd',
      title: '最大回撤 (MDD)',
      fullName: 'Max Drawdown',
      definition: '在統計期間內，淨值從歷史最高峰跌落至最低谷的最大跌幅（歷史最壞情況下的虧損壓力）。',
      formula: 'MDD = Max[(Peak - NAV) / Peak]',
      benchmarkNote: bmddNote,
      level: 'GOOD',
      levelBadge: '🟡 正常回撤',
      badgeColor: '#fbbf24',
      summary: `最大回撤為 -${mddVal.toFixed(2)}%，處於一般股票型組合常見回檔區間${
        metrics.hasBenchmark && metrics.benchmarkMaxDrawdown !== null
          ? `（對照 ${bLabel} 回撤 -${metrics.benchmarkMaxDrawdown.toFixed(2)}%）`
          : ''
      }。`,
      suggestion: '維持既定停損與加減碼計畫，避免在極端波動波谷時非理性殺跌。',
    };
  } else if (mddVal <= 35.0) {
    mddDiag = {
      id: 'mdd',
      title: '最大回撤 (MDD)',
      fullName: 'Max Drawdown',
      definition: '在統計期間內，淨值從歷史最高峰跌落至最低谷的最大跌幅（歷史最壞情況下的虧損壓力）。',
      formula: 'MDD = Max[(Peak - NAV) / Peak]',
      benchmarkNote: bmddNote,
      level: 'FAIR',
      levelBadge: '🟠 波動偏高',
      badgeColor: '#f97316',
      summary: `最大回撤達 -${mddVal.toFixed(2)}%，曾歷經較顯著的資產縮水壓力。`,
      suggestion: '建議設定單筆交易最大虧損上限（如總資產 1%~2%），並落實持股分散。',
    };
  } else {
    mddDiag = {
      id: 'mdd',
      title: '最大回撤 (MDD)',
      fullName: 'Max Drawdown',
      definition: '在統計期間內，淨值從歷史最高峰跌落至最低谷的最大跌幅（歷史最壞情況下的虧損壓力）。',
      formula: 'MDD = Max[(Peak - NAV) / Peak]',
      benchmarkNote: bmddNote,
      level: 'ATTENTION',
      levelBadge: '🔴 風險警示',
      badgeColor: '#f87171',
      summary: `最大回撤深達 -${mddVal.toFixed(2)}%，本金承受過度嚴峻考驗，風險承受度可能超載。`,
      suggestion: '必須重新檢視部位規模管理與機械化停損機制，嚴格杜絕凹單行為。',
    };
  }

  // 5. 年化波動度 (Annualized Volatility)
  let volDiag: MetricDiagnosis;
  const volVal = metrics.annualizedVolatility;
  if (volVal < 10.0) {
    volDiag = {
      id: 'volatility',
      title: '年化波動度 (Volatility)',
      fullName: 'Annualized Volatility',
      definition: '每日報酬率標準差經 252 個交易日年化後的數值，反映資產淨值上下震盪跳動的劇烈程度。',
      formula: 'σann = std(daily_returns) × √252',
      benchmarkNote: '以 252 交易日年化標準差試算',
      level: 'GOOD',
      levelBadge: '🛡️ 低波防守',
      badgeColor: '#06b6d4',
      summary: `年化波動度僅 ${volVal.toFixed(2)}%，淨值曲線平穩抗震，持有心理壓力低。`,
      suggestion: '走勢穩定度極高，非常適合進行長期定期定額與複利滾動。',
    };
  } else if (volVal <= 20.0) {
    volDiag = {
      id: 'volatility',
      title: '年化波動度 (Volatility)',
      fullName: 'Annualized Volatility',
      definition: '每日報酬率標準差經 252 個交易日年化後的數值，反映資產淨值上下震盪跳動的劇烈程度。',
      formula: 'σann = std(daily_returns) × √252',
      benchmarkNote: '以 252 交易日年化標準差試算',
      level: 'GOOD',
      levelBadge: '🟢 中等平穩',
      badgeColor: '#34d399',
      summary: `年化波動度為 ${volVal.toFixed(2)}%，接近主流大盤指數標準波動區間，成長與穩定兼備。`,
      suggestion: '維持均衡配置，符合典型股票投資組合的風險特徵。',
    };
  } else if (volVal <= 35.0) {
    volDiag = {
      id: 'volatility',
      title: '年化波動度 (Volatility)',
      fullName: 'Annualized Volatility',
      definition: '每日報酬率標準差經 252 個交易日年化後的數值，反映資產淨值上下震盪跳動的劇烈程度。',
      formula: 'σann = std(daily_returns) × √252',
      benchmarkNote: '以 252 交易日年化標準差試算',
      level: 'FAIR',
      levelBadge: '🟠 高波成長',
      badgeColor: '#f97316',
      summary: `年化波動度達 ${volVal.toFixed(2)}%，淨值起伏較大，常見於高成長飆股或持股集中度偏高組合。`,
      suggestion: '需做好心理耐受準備，並設定明確的停利退場與分批減碼機制。',
    };
  } else {
    volDiag = {
      id: 'volatility',
      title: '年化波動度 (Volatility)',
      fullName: 'Annualized Volatility',
      definition: '每日報酬率標準差經 252 個交易日年化後的數值，反映資產淨值上下震盪跳動的劇烈程度。',
      formula: 'σann = std(daily_returns) × √252',
      benchmarkNote: '以 252 交易日年化標準差試算',
      level: 'ATTENTION',
      levelBadge: '⚡ 極高波動',
      badgeColor: '#f87171',
      summary: `年化波動度高達 ${volVal.toFixed(2)}%，淨值劇烈震盪如過山車，具有高不確定性。`,
      suggestion: '應適當降低整體槓桿或調整高風險個股比重，避免因情緒起伏而失策。',
    };
  }

  return {
    alpha: alphaDiag,
    beta: betaDiag,
    sharpe: sharpeDiag,
    mdd: mddDiag,
    volatility: volDiag,
  };
}

