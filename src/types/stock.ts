export type MarketType = 'TW' | 'US';
export type Currency = 'TWD' | 'USD';
export type TradeType = 'BUY' | 'SELL' | 'DIVIDEND';

export interface TradeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  symbol: string; // e.g. 2330, AAPL, NVDA, 0050
  name?: string; // e.g. 台積電, Apple Inc.
  market: MarketType;
  currency: Currency;
  type: TradeType;
  shares: number; // 股數（美股支援小數）
  price: number; // 每股單價（原始幣別）
  fee: number; // 手續費
  tax: number; // 證交稅 / 扣繳稅額
  note?: string; // 交易備註
  tags?: string[]; // 標籤（如：長期核心、波段動能、股息成長）
  createdAt: number;
}

export interface HoldingPosition {
  symbol: string;
  name: string;
  market: MarketType;
  currency: Currency;
  shares: number; // 當前持有股數
  avgCost: number; // 平均買進每股成本
  totalCostBasis: number; // 總投入成本（含買進手續費）
  currentPrice: number; // 最新參考市價
  marketValue: number; // 當前總市值 (shares * currentPrice)
  unrealizedPnL: number; // 未實現損益金額 (marketValue - totalCostBasis)
  unrealizedPnLPercent: number; // 未實現報酬率 %
  realizedPnL: number; // 累計已實現損益（此標的歷史賣出累積）
  totalDividends: number; // 累計領取股息
  yieldOnCostPercent: number; // 成本殖利率 % (totalDividends / totalCostBasis * 100)
}

export type ColorThemeMode = 'taiwan' | 'international'; // taiwan: 紅漲綠跌, international: 綠漲紅跌

export interface PortfolioSummary {
  // 原始幣別獨立統計
  twd: {
    totalCost: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    realizedPnL: number;
    totalDividends: number;
  };
  usd: {
    totalCost: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    realizedPnL: number;
    totalDividends: number;
  };
  // 基準幣折算匯總（預設以 TWD 呈現）
  combinedTWD: {
    totalCost: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    realizedPnL: number;
    totalDividends: number;
    netAssetValue: number;
  };
  usdToTwdRate: number;
}
