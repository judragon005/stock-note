import type { QuarterlyFinancialRecord } from '../types/financialForensic';
import {
  calculateCoreBusinessPurity,
  calculateOperatingLeverage,
} from './financialProfitabilityEngine';

export interface ScoringInputs {
  records: QuarterlyFinancialRecord[];
  currentPrice: number;
  symbol: string;
  stockName: string;
  market?: 'TW' | 'US';
  revenueRecords?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>;
  directorPledgeRatio?: number;
  insiderTransferShares?: number;
  valuation?: {
    pe?: number | null;
    pb?: number | null;
    dividendYield?: number | null;
  };
  holdingCost?: number;
}

export interface DimensionScore {
  name: string;
  weight: number; // 權重 % (總和為 100)
  score: number;  // 該維度實得分數 (0 ~ weight)
  rating: 'A' | 'B' | 'C' | 'D';
  summary: string;
  factors: string[];
}

export interface InstitutionalResearchSummary {
  symbol: string;
  stockName: string;
  totalScore: number;
  overallGrade: '強力買進' | '穩健偏多' | '中性觀望' | '防禦減持' | '高危排毒';
  dimensions: DimensionScore[];
  whatFinancialsSaid: string[];
  whatFinancialsDidntSay: string[];
  tradeDecision: {
    suggestedAction: string;
    targetBuyRange: [number, number];
    marginOfSafetyPct: number;
    invalidationConditions: string[];
    personalAdvice?: string;
  };
}

/**
 * 計算機構級 8 維度 100 分制評分卡與投研總覽
 */
export function calculateInstitutionalScoring(inputs: ScoringInputs): InstitutionalResearchSummary {
  const {
    records = [],
    currentPrice = 100,
    symbol,
    stockName,
    revenueRecords = [],
    directorPledgeRatio,
    holdingCost,
  } = inputs;

  const chronological = [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  const latest = chronological[chronological.length - 1];
  const prevLatest = chronological[chronological.length - 2];

  // 1. 營收成長品質 (15%)
  let revScore = 10;
  const revFactors: string[] = [];
  const latestRevYoY = revenueRecords.length > 0 ? revenueRecords[revenueRecords.length - 1]?.yoyRate : undefined;
  const isAth = revenueRecords.length > 0 && revenueRecords[revenueRecords.length - 1]?.isAllTimeHigh === 1;

  if (isAth) {
    revScore = 15;
    revFactors.push('最新月營收創歷史新高 (🔥 ATH)');
  } else if (latestRevYoY !== undefined) {
    if (latestRevYoY >= 20) {
      revScore = 14;
      revFactors.push(`近月營收強勁增長 (YoY +${latestRevYoY.toFixed(1)}%)`);
    } else if (latestRevYoY >= 5) {
      revScore = 12;
      revFactors.push(`近月營收溫和擴張 (YoY +${latestRevYoY.toFixed(1)}%)`);
    } else if (latestRevYoY >= -5) {
      revScore = 8;
      revFactors.push(`近月營收持平 (YoY ${latestRevYoY.toFixed(1)}%)`);
    } else {
      revScore = 5;
      revFactors.push(`近月營收呈現衰退 (YoY ${latestRevYoY.toFixed(1)}%)`);
    }
  } else {
    // 依季報營收評估
    const rCurr = latest?.income?.revenue || 0;
    const rPrev = prevLatest?.income?.revenue || 0;
    if (rCurr > rPrev * 1.1) {
      revScore = 12;
      revFactors.push('季報營收季度環比成長超過 10%');
    } else if (rCurr >= rPrev) {
      revScore = 10;
      revFactors.push('季報營收持平穩健');
    } else {
      revScore = 6;
      revFactors.push('季報營收呈下滑態勢');
    }
  }

  // 2. 獲利能力與 ROIC (15%)
  let profScore = 10;
  const profFactors: string[] = [];
  const grossMargin = latest?.income?.revenue ? ((latest.income.grossProfit || 0) / latest.income.revenue) * 100 : 0;
  const opMargin = latest?.income?.revenue ? ((latest.income.operatingIncome || 0) / latest.income.revenue) * 100 : 0;

  if (grossMargin > 40 && opMargin > 20) {
    profScore = 15;
    profFactors.push(`高定價權：毛利率高達 ${grossMargin.toFixed(1)}%，營業利益率 ${opMargin.toFixed(1)}%`);
  } else if (grossMargin > 20 && opMargin > 8) {
    profScore = 12;
    profFactors.push(`獲利結構良好：營業利益率 ${opMargin.toFixed(1)}%`);
  } else if (opMargin > 0) {
    profScore = 8;
    profFactors.push(`微幅獲利：營業利益率 ${opMargin.toFixed(1)}%`);
  } else {
    profScore = 3;
    profFactors.push('營運本業處於虧損狀態');
  }

  // 3. 現金流盈餘品質 (15%)
  let cfScore = 10;
  const cfFactors: string[] = [];
  const cfo = latest?.cashFlow?.operatingCashFlow || 0;
  const ni = latest?.income?.netIncome || 0;
  const capex = latest?.cashFlow?.capitalExpenditure || 0;
  const fcf = cfo + capex;

  if (ni > 0 && cfo >= ni) {
    cfScore = fcf > 0 ? 15 : 12;
    cfFactors.push(`盈餘純度極佳：CFO (${cfo.toLocaleString()}) 大於淨利 (${ni.toLocaleString()})`);
    if (fcf > 0) cfFactors.push(`自由現金流為正 (+${fcf.toLocaleString()})，具備真造血能力`);
  } else if (ni > 0 && cfo > 0) {
    cfScore = 9;
    cfFactors.push('CFO 為正但小於淨利，需關注營運資金佔用');
  } else if (cfo < 0) {
    cfScore = 4;
    cfFactors.push('⚠️ 營業現金流為負數，獲利未轉化為真實現金');
  }

  // 4. 財務安全 (10%)
  let safeScore = 8;
  const safeFactors: string[] = [];
  const totalAssets = latest?.balanceSheet?.totalAssets || 1;
  const totalLiab = latest?.balanceSheet?.totalLiabilities || 0;
  const debtRatio = (totalLiab / totalAssets) * 100;

  if (typeof directorPledgeRatio === 'number') {
    if (directorPledgeRatio >= 40) {
      safeScore = 1;
      safeFactors.push(`🚨 董監事質押率高達 ${directorPledgeRatio.toFixed(1)}% (>=40%)，存在嚴重斷頭流動性風險！`);
    } else if (directorPledgeRatio >= 20) {
      safeScore = 5;
      safeFactors.push(`⚠️ 董監質押偏高 (${directorPledgeRatio.toFixed(1)}%)，籌碼警戒`);
    } else {
      safeFactors.push(`大股東質押率低 (${directorPledgeRatio.toFixed(1)}%)，籌碼極度安定`);
    }
  }

  if (debtRatio < 50 && safeScore > 1) {
    safeScore = Math.min(10, safeScore + 2);
    safeFactors.push(`負債比率健康 (${debtRatio.toFixed(1)}%)`);
  } else if (debtRatio > 70 && safeScore > 1) {
    safeScore = Math.max(3, safeScore - 2);
    safeFactors.push(`負債比率偏高 (${debtRatio.toFixed(1)}%)`);
  }

  // 5. 競爭優勢 (護城河) (10%)
  let moatScore = 7;
  const moatFactors: string[] = [];
  if (grossMargin >= 40) {
    moatScore = 10;
    moatFactors.push('具備定價權護城河，毛利率長期維持在 40% 以上');
  } else if (grossMargin >= 25) {
    moatScore = 8;
    moatFactors.push('具備規模經濟或技術門檻');
  } else {
    moatScore = 5;
    moatFactors.push('產品多屬標準化大宗商品，同業競爭激烈');
  }

  // 6. 產業前景與營運槓桿 (10%)
  let industryScore = 7;
  const industryFactors: string[] = [];
  const leverageResult = calculateOperatingLeverage(chronological);
  const dol = leverageResult.degreeOfOperatingLeverage;
  const accel = leverageResult.revenueAcceleration;

  if (dol > 1.2) {
    industryScore = 10;
    industryFactors.push(`營運槓桿係數 DOL 達 ${dol.toFixed(2)}，處於固定成本攤提後的利潤非線性爆發期`);
  } else if (accel > 0) {
    industryScore = 8;
    industryFactors.push(`營收成長加速度 ΔYoY 達 +${accel.toFixed(1)}%，動能持續擴張`);
  } else if (accel < -10) {
    industryScore = 4;
    industryFactors.push(`營收成長加速度轉負 (ΔYoY ${accel.toFixed(1)}%)，成長出現失速轉折`);
  } else {
    industryScore = 6;
    industryFactors.push('產業處於平穩週期');
  }

  // 7. 估值吸引力 (15%)
  let valScore = 9;
  const valFactors: string[] = [];
  const recent4 = chronological.slice(-4);
  const ttmEps = Number(recent4.reduce((acc, q) => acc + (q.income?.eps || 0), 0).toFixed(2));
  const effectivePe = ttmEps > 0 && currentPrice > 0 ? currentPrice / ttmEps : 0;

  if (effectivePe > 0 && effectivePe < 12) {
    valScore = 15;
    valFactors.push(`本益比僅 ${effectivePe.toFixed(1)} 倍，處於特價便宜超跌位階`);
  } else if (effectivePe > 0 && effectivePe <= 18) {
    valScore = 12;
    valFactors.push(`本益比 ${effectivePe.toFixed(1)} 倍，處於合理價值核心區間`);
  } else if (effectivePe > 25) {
    valScore = 6;
    valFactors.push(`本益比高達 ${effectivePe.toFixed(1)} 倍，市場估值透支未來成長`);
  } else {
    valScore = 9;
    valFactors.push('估值位階中性');
  }

  // 8. 催化劑與預期差 (10%)
  let catalystScore = 7;
  const catalystFactors: string[] = [];
  const purityResult = latest ? calculateCoreBusinessPurity(latest) : null;

  if (purityResult && purityResult.purityRatio >= 85) {
    catalystScore = 10;
    catalystFactors.push(`本業獲利純度達 ${purityResult.purityRatio.toFixed(1)}%，盈餘 100% 來自核心本業營運`);
  } else if (purityResult && purityResult.purityRatio < 60) {
    catalystScore = 4;
    catalystFactors.push(`⚠️ 本業純度僅 ${purityResult.purityRatio.toFixed(1)}%，需提防一次性賣資產灌水`);
  } else {
    catalystScore = 7;
    catalystFactors.push('本業營運穩健，未見顯著業外雜訊');
  }

  const dimensions: DimensionScore[] = [
    { name: '營收成長品質', weight: 15, score: revScore, rating: revScore >= 12 ? 'A' : revScore >= 9 ? 'B' : 'C', summary: revFactors[0] || '營收穩健', factors: revFactors },
    { name: '獲利能力與 ROIC', weight: 15, score: profScore, rating: profScore >= 12 ? 'A' : profScore >= 9 ? 'B' : 'C', summary: profFactors[0] || '獲利正常', factors: profFactors },
    { name: '現金流盈餘品質', weight: 15, score: cfScore, rating: cfScore >= 12 ? 'A' : cfScore >= 9 ? 'B' : 'C', summary: cfFactors[0] || '現金流正常', factors: cfFactors },
    { name: '財務安全', weight: 10, score: safeScore, rating: safeScore >= 8 ? 'A' : safeScore >= 5 ? 'B' : 'D', summary: safeFactors[0] || '安全', factors: safeFactors },
    { name: '競爭優勢', weight: 10, score: moatScore, rating: moatScore >= 8 ? 'A' : moatScore >= 6 ? 'B' : 'C', summary: moatFactors[0] || '具防禦力', factors: moatFactors },
    { name: '產業前景', weight: 10, score: industryScore, rating: industryScore >= 8 ? 'A' : industryScore >= 6 ? 'B' : 'C', summary: industryFactors[0] || '產業平穩', factors: industryFactors },
    { name: '估值吸引力', weight: 15, score: valScore, rating: valScore >= 12 ? 'A' : valScore >= 9 ? 'B' : 'C', summary: valFactors[0] || '估值合理', factors: valFactors },
    { name: '催化劑與預期差', weight: 10, score: catalystScore, rating: catalystScore >= 8 ? 'A' : catalystScore >= 6 ? 'B' : 'C', summary: catalystFactors[0] || '本業純淨', factors: catalystFactors },
  ];

  const totalScore = dimensions.reduce((acc, d) => acc + d.score, 0);

  let overallGrade: InstitutionalResearchSummary['overallGrade'] = '中性觀望';
  if (totalScore >= 85) overallGrade = '強力買進';
  else if (totalScore >= 70) overallGrade = '穩健偏多';
  else if (totalScore >= 55) overallGrade = '中性觀望';
  else if (totalScore >= 40) overallGrade = '防禦減持';
  else overallGrade = '高危排毒';

  // 財報說了什麼（客觀事實）
  const whatFinancialsSaid: string[] = [
    `最新季度營業收入達 ${(latest?.income?.revenue || 0).toLocaleString()} 元，毛利率 ${grossMargin.toFixed(1)}%`,
    `最新單季每股盈餘 (EPS) 為 ${latest?.income?.eps ?? 'N/A'} 元，近 4 季累計 TTM EPS 為 ${ttmEps.toFixed(2)} 元`,
    `營業活動現金流 (CFO) 為 ${(latest?.cashFlow?.operatingCashFlow || 0).toLocaleString()} 元`,
    `資產負債表總負債比率為 ${debtRatio.toFixed(1)}%`,
  ];

  // 財報沒說什麼（穿透鑑識）
  const whatFinancialsDidntSay: string[] = [];
  if (purityResult && purityResult.purityRatio < 70) {
    whatFinancialsDidntSay.push(`獲利純度警訊：業外收益佔比高達 ${(100 - purityResult.purityRatio).toFixed(1)}%，本期 EPS 包含非經常性項目`);
  } else {
    whatFinancialsDidntSay.push(`獲利純度健全：本業純度達 ${purityResult?.purityRatio.toFixed(1) ?? '100'}%，營業利益為主引擎`);
  }

  if (typeof directorPledgeRatio === 'number' && directorPledgeRatio >= 40) {
    whatFinancialsDidntSay.push(`董監質押斷頭地雷：董事與監察人持股質押比達 ${directorPledgeRatio.toFixed(1)}%，一旦大盤下挫易遭銀行斷頭拋售`);
  }

  if (dol > 1.2) {
    whatFinancialsDidntSay.push(`營運槓桿爆發：DOL 達 ${dol.toFixed(2)}，營收小幅成長將帶動獲利成倍放大`);
  }

  if (cfo < ni && ni > 0) {
    whatFinancialsDidntSay.push('應收帳款與存貨積壓風險：營業現金流小於帳面淨利，獲利尚未入袋為安');
  }

  // 估值與買進區間試算 (Base & Bull & Bear)
  const baseFairPrice = ttmEps > 0 ? Number((ttmEps * 15).toFixed(1)) : currentPrice;
  const lowerBuy = Number((baseFairPrice * 0.85).toFixed(1));
  const upperBuy = Number((baseFairPrice * 1.05).toFixed(1));
  const marginOfSafetyPct = Number((((baseFairPrice - currentPrice) / baseFairPrice) * 100).toFixed(1));

  // 假說失效停損條件
  const invalidationConditions: string[] = [
    '單月營收年增率 (YoY) 連續 2 個月翻負或季減超過 15%',
    '營業利益率連續 2 季跌破 10% 護城河警戒線',
    '單季營業現金流 (CFO) 轉為負數且自由現金流失血',
    typeof directorPledgeRatio === 'number' && directorPledgeRatio >= 30
      ? '董監質押率進一步攀升超過 50%'
      : '股價跌破關鍵防守支撐線，且基本面營收動能熄火',
  ];

  let personalAdvice: string | undefined;
  if (holdingCost && holdingCost > 0) {
    const pnlPct = ((currentPrice - holdingCost) / holdingCost) * 100;
    if (pnlPct > 20) {
      personalAdvice = `當前持股獲利 +${pnlPct.toFixed(1)}%，具備充裕保護墊，建議續抱核心部位並將移動停利設於成本 +15%`;
    } else if (pnlPct < -10) {
      personalAdvice = `當前持股浮虧 ${pnlPct.toFixed(1)}%，已跌破合理安全邊際，請嚴格檢視論點失效條件是否觸發`;
    } else {
      personalAdvice = `當前成本位階與市價相仿 (報酬 ${pnlPct > 0 ? `+${pnlPct.toFixed(1)}` : `${pnlPct.toFixed(1)}`}%)，維持原定投資節奏`;
    }
  }

  return {
    symbol,
    stockName,
    totalScore,
    overallGrade,
    dimensions,
    whatFinancialsSaid,
    whatFinancialsDidntSay,
    tradeDecision: {
      suggestedAction:
        totalScore >= 75
          ? '分批逢低佈局，建立核心部位'
          : totalScore >= 55
          ? '暫時觀望，等待估值回落至合理買進區間'
          : '嚴格風控，反彈減持或執行停損',
      targetBuyRange: [lowerBuy, upperBuy],
      marginOfSafetyPct,
      invalidationConditions,
      personalAdvice,
    },
  };
}

/**
 * 0 Token 本地組裝「12 位分析師機構級深度投研 Prompt」
 */
export function generate12AnalystsPrompt(options: {
  symbol: string;
  stockName: string;
  market?: 'TW' | 'US';
  currentPrice: number;
  records: QuarterlyFinancialRecord[];
  revenueRecords?: Array<{ yearMonth: string; revenue: number; yoyRate?: number; isAllTimeHigh?: number }>;
  directorPledgeRatio?: number;
  holdingCost?: number;
}): string {
  const {
    symbol,
    stockName,
    market = 'TW',
    currentPrice,
    records = [],
    revenueRecords = [],
    directorPledgeRatio,
    holdingCost,
  } = options;

  const chronological = [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  const latest = chronological[chronological.length - 1];
  const ttmEps = chronological.slice(-4).reduce((acc, q) => acc + (q.income?.eps || 0), 0);
  const latestRev = revenueRecords[revenueRecords.length - 1];
  const cfo = latest?.cashFlow?.operatingCashFlow || 0;
  const capex = latest?.cashFlow?.capitalExpenditure || 0;
  const fcf = cfo + capex;

  return `
# ROLE：台美股機構級財報研究與投資決策系統

你是一個由 12 位專業分析師組成的虛擬投資研究團隊，具備買方資產管理、賣方證券研究、財務鑑識、產業研究、企業估值、量化分析與風險管理能力。
你的任務不是摘要財報，而是透過可驗證的公開資訊，產出足以支援專業投資人獨立判斷的深度研究報告。

請以「證據優先、財務數據優先、預期差優先、風險報酬優先」為核心原則。
禁止杜撰數字、財報內容、法人共識、即時股價、估值倍數或機構持股資訊。

---

# 第一部分：研究標的與分析設定

- 股票代號：${symbol}
- 公司名稱：${stockName}
- 市場：${market === 'TW' ? '台股 TWSE／TPEx' : '美股 NYSE／NASDAQ'}
- 當前市價：${currentPrice} 元
${holdingCost ? `- 持有成本：${holdingCost} 元` : ''}
- 最新財報季度：${latest ? `${latest.year}Q${latest.quarter}` : '自動確認'}
- 財報研究範圍：近 12 季＋近 5 年
- 分析幣別：${market === 'TW' ? 'TWD' : 'USD'}

---

# 第二部分：本地確認事實數據 (Zero-Mock Verified Facts)

1. 最新單季財報 (${latest ? `${latest.year}Q${latest.quarter}` : 'N/A'})：
   - 營業收入：${(latest?.income?.revenue || 0).toLocaleString()}
   - 營業利益：${(latest?.income?.operatingIncome || 0).toLocaleString()}
   - 稅後淨利：${(latest?.income?.netIncome || 0).toLocaleString()}
   - 單季 EPS：${latest?.income?.eps ?? 'N/A'} 元 (近 4 季 TTM EPS: ${ttmEps.toFixed(2)} 元)
   - 營業現金流 (CFO)：${cfo.toLocaleString()}
   - 自由現金流 (FCF)：${fcf.toLocaleString()}
2. 領先月營收：${latestRev ? `${latestRev.yearMonth} 營收 ${(latestRev.revenue / 100000).toFixed(1)} 億元，YoY ${latestRev.yoyRate !== undefined ? `${latestRev.yoyRate > 0 ? `+${latestRev.yoyRate}` : latestRev.yoyRate}%` : 'N/A'}${latestRev.isAllTimeHigh === 1 ? ' (🔥 ATH 歷史新高)' : ''}` : '無月營收數據'}
3. 籌碼與風控：${directorPledgeRatio !== undefined ? `最新董監事持股質押率為 ${directorPledgeRatio.toFixed(1)}%` : '無質押數據'}

---

# 第三部分：12 位分析師研討任務清單

請依序展開下列維度的深度研析，特別聚焦於：
1. **財務鑑識組 (Forensic Team)**：穿透「財報沒說什麼」，剖析營業利益與業外損益純度、應收帳款與存貨剪刀差、折舊與高管期權稀釋。
2. **企業估值組 (Valuation Team)**：執行 Reverse DCF（以現價 ${currentPrice} 逆推市場隱含 FCF 成長率）與 Bull/Base/Bear 三情境矩陣。
3. **預期差與催化劑組 (Alpha Team)**：對比法人共識 Beat / Miss 狀況，以及未來 1~2 季的核心催化劑。
4. **風控與紅隊組 (Red Team)**：無情挑戰多方論點，列出 3 大最具殺傷力的基本面與流動性下行風險。

請在分析最後，輸出符合專案標準 JSON 格式的 \`strategy_verdict\` 裁決區塊，以便使用者複製貼回系統釘選。
`.trim();
}
