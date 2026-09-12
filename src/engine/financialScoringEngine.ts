/**
 * 財務健康度總體評分與 0 秒操盤總結引擎 (Spec 0123 / Spec 0125)
 * Financial Health Scoring & Executive Summary Engine
 */

import type {
  QuarterlyFinancialRecord,
  FinancialForensicReport,
  FinancialHealthGrade,
  TrafficLightsState,
  MarketType,
  FinancialDirective,
} from '../types/financialForensic';
import { calculateProfitabilityMetrics, calculateDuPontAnalysis } from './financialProfitabilityEngine';
import { calculateSafetyMetrics } from './financialSafetyEngine';
import { calculateTurnoverMetrics } from './financialTurnoverEngine';
import { detectForensicAnomalies } from './forensicRadarEngine';
import { resolveIndustryAttribute } from './industryGate';

/**
 * 依據評分、體質燈號與異常清單生成操盤手風格結構化方針 (Spec 0125)
 */
export function generateFinancialDirective(
  score: number,
  overallGrade: FinancialHealthGrade,
  trafficLights: TrafficLightsState,
  anomalies: any[],
  marginTrend: string,
  isNetCashPositive: boolean,
  isFinancial: boolean
): FinancialDirective {
  // 1. 定調
  let stance: FinancialDirective['stance'] = 'STABLE_ACCUMULATE';
  let stanceLabel = '【體質穩健·逢回布局】';

  if (score >= 85) {
    stance = 'STRONG_BUY_AND_HOLD';
    stanceLabel = '【強勢造血·長線續抱】';
  } else if (score >= 65) {
    stance = 'STABLE_ACCUMULATE';
    stanceLabel = '【體質穩健·逢回布局】';
  } else if (score >= 45) {
    stance = 'DEFENSIVE_WATCH';
    stanceLabel = '【體質承壓·防守觀望】';
  } else {
    stance = 'HIGH_RISK_TRIM';
    stanceLabel = '【重大風險·嚴格戒備】';
  }

  // 2. 核心矛盾與體質洞見
  let conflictSummary = '';
  const dangerous = anomalies.filter((a) => a.severity === 'DANGEROUS');
  const warning = anomalies.filter((a) => a.severity === 'WARNING');

  if (dangerous.length > 0) {
    conflictSummary = `核心警戒：${dangerous[0].summary}`;
  } else if (trafficLights.cashFlow === 'RED') {
    conflictSummary = '核心警戒：營運活動現金流量呈現赤字（CFO 為負），獲利未能轉化為真金白銀，警惕紙上富貴與失血風險。';
  } else if (warning.length > 0) {
    conflictSummary = `體質關注：${warning[0].summary}`;
  } else if (trafficLights.profitability === 'RED') {
    conflictSummary = '體質關注：本業獲利能力滑落至虧損區間，稅後淨利率與 ROE 承壓。';
  } else if (trafficLights.safety === 'RED') {
    conflictSummary = '體質關注：負債比率偏高或速動比率脆弱，資產清算與償債安全邊際不足。';
  } else if (!isFinancial && !isNetCashPositive && trafficLights.safety === 'YELLOW') {
    conflictSummary = '體質關注：公司處於淨負債結構（總有息負債高於在手現金），需留意利率敏感度與償債週轉。';
  } else if (trafficLights.efficiency === 'RED') {
    conflictSummary = '體質關注：應收帳款或存貨週轉天數過長，營運資金週轉效率下降。';
  } else if (isFinancial) {
    conflictSummary = '金融保險業模型運作正常，淨利與股東權益穩健，無異常做帳風險。';
  } else if (marginTrend === 'EXPANDING' || overallGrade === 'EXCELLENT') {
    conflictSummary = '本業造血強勁，毛利率走勢穩健，淨現金水位充沛，未檢出結構性財務背離。';
  } else {
    conflictSummary = '財務結構整體平順，獲利三率保持在常態營運水準。';
  }

  // 3. 具體操盤方針
  let actionGuidance = '';
  if (stance === 'STRONG_BUY_AND_HOLD') {
    actionGuidance = '基本面護城河堅實，獲利含金量高，大盤震盪回檔均為中長線優質買點。';
  } else if (stance === 'STABLE_ACCUMULATE') {
    actionGuidance = '整體體質穩健，建議逢技術面重要均線支撐分批佈局，不盲目追高。';
  } else if (stance === 'DEFENSIVE_WATCH') {
    actionGuidance = '建議暫停加碼，嚴設均線跌破停損點，靜待本業現金流回正或存貨去化。';
  } else {
    actionGuidance = '財務地雷風險顯著，切忌摸底攤平，逢反彈應逢高減碼以降低風險曝險。';
  }

  return {
    stance,
    stanceLabel,
    conflictSummary,
    actionGuidance,
  };
}

/**
 * 綜合評估四大維度指示燈與 0~100 分量化評分
 */
export function generateFinancialForensicReport(
  symbol: string,
  market: MarketType,
  companyName: string,
  records: QuarterlyFinancialRecord[],
  sector?: string
): FinancialForensicReport {
  const cleanSymbol = symbol.trim().toUpperCase();
  const industryAttribute = resolveIndustryAttribute(cleanSymbol, sector);

  // 1. 空資料安全防護
  if (!records || records.length === 0) {
    return {
      symbol: cleanSymbol,
      market,
      companyName: companyName || cleanSymbol,
      industryAttribute,
      latestPeriod: 'N/A',
      overallScore: 0,
      overallGrade: 'DANGEROUS',
      trafficLights: {
        profitability: 'GRAY',
        safety: 'GRAY',
        efficiency: 'GRAY',
        cashFlow: 'GRAY',
      },
      executiveSummary: '目前查無可用之季度財務報表數據，暫無法進行鑑識分析。',
      directive: {
        stance: 'HIGH_RISK_TRIM',
        stanceLabel: '【數據缺失·暫勿進場】',
        conflictSummary: '目前查無可用之季度財務報表數據，無法評估真實獲利與償債體質。',
        actionGuidance: '建議先行觀望，待公司完整申報季度財報後再行決策。',
      },
      anomalies: [],
      duPont: {
        roe: 0,
        netMargin: 0,
        assetTurnover: 0,
        equityMultiplier: 1,
        primaryDriver: 'PROFITABILITY',
      },
      historicalRecords: [],
      updatedAt: Date.now(),
    };
  }

  const latest = records[0];
  const latestPeriod = `${latest.year}-Q${latest.quarter}`;

  // 2. 運算四大維度
  const profitability = calculateProfitabilityMetrics(records);
  const safety = calculateSafetyMetrics(latest);
  const turnover = calculateTurnoverMetrics(latest);
  const duPont = calculateDuPontAnalysis(latest);
  const anomalies = detectForensicAnomalies(records);

  // 3. 判定四大指示燈
  const trafficLights: TrafficLightsState = {
    profitability: 'GREEN',
    safety: 'GREEN',
    efficiency: 'GREEN',
    cashFlow: 'GREEN',
  };

  // 獲利維度燈號
  if (profitability.netMargin < 0 || profitability.roe < 0) {
    trafficLights.profitability = 'RED';
  } else if (profitability.netMargin < 8 || profitability.marginTrend === 'CONTRACTING') {
    trafficLights.profitability = 'YELLOW';
  }

  // 安全維度燈號 (金融業自動豁免負債比)
  if (industryAttribute === 'FINANCIALS') {
    trafficLights.safety = 'GREEN';
  } else {
    if (safety.debtRatio > 65 || safety.quickRatio < 80) {
      trafficLights.safety = 'RED';
    } else if (safety.debtRatio > 50 || safety.quickRatio < 100) {
      trafficLights.safety = 'YELLOW';
    }
  }

  // 效率維度燈號
  if (industryAttribute === 'FINANCIALS') {
    trafficLights.efficiency = 'GREEN';
  } else {
    if (turnover.dsoDays > 90 || turnover.dioDays > 120) {
      trafficLights.efficiency = 'RED';
    } else if (turnover.dsoDays > 60 || turnover.dioDays > 90) {
      trafficLights.efficiency = 'YELLOW';
    }
  }

  // 現金流維度燈號
  const fcf = latest.cashFlow.operatingCashFlow - Math.abs(latest.cashFlow.capitalExpenditure);
  if (latest.cashFlow.operatingCashFlow <= 0) {
    trafficLights.cashFlow = 'RED';
  } else if (fcf <= 0) {
    trafficLights.cashFlow = 'YELLOW';
  }

  // 4. 計算 0~100 評分
  let score = 70; // 基準分

  // 獲利權重 (+15 ~ -15)
  if (profitability.netMargin >= 25 && profitability.roe >= 15) score += 15;
  else if (profitability.netMargin >= 15) score += 10;
  else if (profitability.netMargin < 0) score -= 20;

  // 安全權重 (+10 ~ -15)
  if (industryAttribute === 'FINANCIALS') {
    score += 8; // 金融業常態加分
  } else {
    if (safety.isNetCashPositive && safety.debtRatio < 40) score += 10;
    else if (safety.debtRatio > 70) score -= 15;
    else if (safety.debtRatio > 50) score -= 5;
  }

  // 效率權重 (+5 ~ -10)
  if (industryAttribute !== 'FINANCIALS') {
    if (turnover.cccDays !== undefined && turnover.cccDays <= 45 && turnover.cccDays >= 0) score += 5;
    else if (turnover.dsoDays > 90) score -= 10;
  }

  // 現金流權重 (+10 ~ -20)
  if (latest.cashFlow.operatingCashFlow > latest.income.netIncome && fcf > 0) score += 10;
  else if (latest.cashFlow.operatingCashFlow <= 0) score -= 20;

  // 懲罰異常 (六大市場沒說什麼)
  const dangerousAnomalies = anomalies.filter((a) => a.severity === 'DANGEROUS');
  const warningAnomalies = anomalies.filter((a) => a.severity === 'WARNING');
  score -= dangerousAnomalies.length * 20;
  score -= warningAnomalies.length * 8;

  // 邊界限制 0 ~ 100
  score = Math.max(0, Math.min(100, score));

  // 5. 評級
  let overallGrade: FinancialHealthGrade = 'HEALTHY';
  if (score >= 85) overallGrade = 'EXCELLENT';
  else if (score >= 65) overallGrade = 'HEALTHY';
  else if (score >= 45) overallGrade = 'WARNING';
  else overallGrade = 'DANGEROUS';

  if (dangerousAnomalies.length > 0 && overallGrade === 'EXCELLENT') {
    overallGrade = 'WARNING';
  }

  // 6. 產出結構化操盤手方針 (Spec 0125)
  const directive = generateFinancialDirective(
    score,
    overallGrade,
    trafficLights,
    anomalies,
    profitability.marginTrend,
    safety.isNetCashPositive,
    industryAttribute === 'FINANCIALS'
  );

  const executiveSummary = `${directive.stanceLabel} ${directive.conflictSummary} 操作方針：${directive.actionGuidance}`;

  return {
    symbol: cleanSymbol,
    market,
    companyName: companyName || cleanSymbol,
    industryAttribute,
    latestPeriod,
    overallScore: score,
    overallGrade,
    trafficLights,
    executiveSummary,
    directive,
    anomalies,
    duPont,
    historicalRecords: records,
    updatedAt: Date.now(),
  };
}
