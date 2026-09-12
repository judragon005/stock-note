/**
 * 財務健康度總體評分與 0 秒操盤總結引擎 (Spec 0123)
 * Financial Health Scoring & Executive Summary Engine
 */

import type {
  QuarterlyFinancialRecord,
  FinancialForensicReport,
  FinancialHealthGrade,
  TrafficLightsState,
  MarketType,
} from '../types/financialForensic';
import { calculateProfitabilityMetrics, calculateDuPontAnalysis } from './financialProfitabilityEngine';
import { calculateSafetyMetrics } from './financialSafetyEngine';
import { calculateTurnoverMetrics } from './financialTurnoverEngine';
import { detectForensicAnomalies } from './forensicRadarEngine';
import { resolveIndustryAttribute } from './industryGate';

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

  // 6. 一句話 0 秒白話操盤總結
  let executiveSummary = '';
  if (dangerousAnomalies.length > 0) {
    executiveSummary = `⚠️ 核心警戒：${dangerousAnomalies[0].summary.slice(0, 70)}...`;
  } else if (warningAnomalies.length > 0) {
    executiveSummary = `🟡 體質關注：${warningAnomalies[0].summary.slice(0, 70)}...`;
  } else if ((profitability.marginTrend === 'EXPANDING' || overallGrade === 'EXCELLENT') && safety.isNetCashPositive) {
    executiveSummary = `本業造血強勁，毛利率走勢穩健，淨現金水位充沛，未檢出結構性財務背離。`;
  } else if (industryAttribute === 'FINANCIALS') {
    executiveSummary = `金融保險控股模型運作正常，淨利與股東權益穩健，無異常做帳風險。`;
  } else {
    executiveSummary = `整體財務結構平穩，獲利與營運現金流處於健康區間。`;
  }

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
    anomalies,
    duPont,
    historicalRecords: records,
    updatedAt: Date.now(),
  };
}
