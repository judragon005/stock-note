/**
 * 個股 7 步深度投研引擎資料契約與型別定義 (Spec 0156 / Ticket 05)
 */

import { MarketType } from './stock';

export interface EquityDeepDiveStep1Data {
  symbol: string;
  name: string;
  market: MarketType;
  industry?: string;
}

export interface EquityDeepDiveStep2Data {
  symbol: string;
  name: string;
  pe?: number;
  pb?: number;
  dividendYield?: number;
  eps?: number;
}

export interface EquityDeepDiveStep3Data {
  symbol: string;
  name: string;
  market: MarketType;
  competitorsHint?: string[];
}

export interface EquityDeepDiveStep4Data {
  symbol: string;
  name: string;
  market: MarketType;
  statusTag: 'NORMAL' | 'ATTENTION' | 'DISPOSITION';
  beta?: number;
  volatilityText?: string;
}

export interface EquityDeepDiveStep5Data {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: 'TWD' | 'USD';
}

export interface EquityDeepDiveStep6Data {
  symbol: string;
  name: string;
  market: MarketType;
  foreignNetShares20D?: number;
  trustNetShares20D?: number;
  dealerNetShares20D?: number;
  totalNetShares20D?: number;
  boxFloorPrice?: number;
  boxCeilingPrice?: number;
  microstructureSummary?: string;
}

export interface InvestmentMemoRecord {
  symbol: string;
  name: string;
  market: MarketType;
  buyReason: string;
  targetPrice: number;
  stopLossPrice: number;
  holdingPeriodDays: number | string;
  trackingMetrics: string[];
  isWatchlist: boolean;
  syncedToHoldings?: boolean;
  createdAt: number;
  updatedAt: number;

  // 新增券商與買方法人欄位 (Spec 0173 / Ticket 04)
  thesisInvalidation?: string; // 核心論點失效條件 (證偽開關 Kill-Switch)
  targetPositionWeight?: number; // 目標配置權重 (%)
  calculatedRiskRewardRatio?: number; // 預估 R-Multiple (報酬風險比)
}

export interface EquityDeepDiveInput {
  symbol: string;
  name: string;
  market: MarketType;
  candles?: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  quote?: {
    price?: number;
    change?: number;
    changePercent?: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    pe?: number;
    pb?: number;
    dividendYield?: number;
  };
  institutionalRecords?: Array<{
    date: string;
    foreignShares: number;
    trustShares: number;
    dealerShares: number;
  }>;
  boxFloorPrice?: number;
  boxCeilingPrice?: number;
  statusTag?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION';
}

export interface EquityDeepDiveReport {
  symbol: string;
  name: string;
  market: MarketType;
  generatedAt: number;
  step1Prompt: string;
  step2Prompt: string;
  step3Prompt: string;
  step4Prompt: string;
  step5Prompt: string;
  step6Prompt: string;
  step7MemoTemplate: string;
  fullPayloadPrompt: string;
  assembledData: {
    step1: EquityDeepDiveStep1Data;
    step2: EquityDeepDiveStep2Data;
    step3: EquityDeepDiveStep3Data;
    step4: EquityDeepDiveStep4Data;
    step5: EquityDeepDiveStep5Data;
    step6: EquityDeepDiveStep6Data;
  };
}
