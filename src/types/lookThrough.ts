import { MarketType } from './stock';

export interface ETFConstituent {
  symbol: string;               // 底層標的代碼 (如 2330, MSFT, AAPL)
  name: string;                 // 底層標的中文或通用名稱 (如 台積電, 微軟)
  weightPercent: number;        // 成分股佔該 ETF 權重 % (例如 56.2 表示 56.2%)
  sector: string;               // 產業分類 (如 '資訊科技', '半導體', '金融保險')
  country: MarketType;
}

export interface ETFProfile {
  symbol: string;               // ETF 代碼 (如 0050, 00878, SPY, VT)
  name: string;
  market: MarketType;
  asOfDate: string;             // 權重基準日 (如 '2026-06-30')
  topConstituents: ETFConstituent[];
}

export interface LookThroughExposure {
  symbol: string;
  name: string;
  market: MarketType;
  sector: string;
  directMarketValue: number;    // 直接買進該個股之市值 (TWD)
  indirectMarketValue: number;  // 透過所持 ETF 間接持有之市值合計 (TWD)
  totalEffectiveValue: number;  // 實質總曝險金額 = 直接 + 間接 (TWD)
  portfolioWeightPercent: number;// 佔整戶 NAV 穿透百分比 %
  isConcentrationAlert: boolean;// 單一標的是否超過 25% 集中度警示門檻
  derivedSources: {
    etfSymbol: string;
    etfName: string;
    weightInETF: number;        // 該個股在該 ETF 的權重 %
    indirectValue: number;      // 該 ETF 貢獻的間接市值 (TWD)
  }[];
}

export interface SectorConcentration {
  sector: string;
  totalMarketValue: number;
  weightPercent: number;
  isConcentrationAlert: boolean;// 單一產業是否超過 50% 集中度警示門檻
}

export interface LookThroughReport {
  asOfDate: string;
  totalPortfolioNAV: number;
  exposures: LookThroughExposure[];
  sectorBreakdown: SectorConcentration[];
  topConcentratedRiskSymbol?: string;
}
