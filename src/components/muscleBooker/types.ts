import { MarketType } from '../../types/stock';

/**
 * 肌肉書僮卡片與視圖互動回調封裝 (消滅 Data Clumps 資料泥塊 - Issue #405)
 */
export interface StockInteractionHandlers {
  expandedSymbol?: string | null;
  onToggleExpand?: (symbol: string) => void;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  watchlistSymbols?: Set<string>;
  onToggleWatchlist?: (symbol: string) => void;
  onQuickTrade?: (symbol: string, action: 'BUY' | 'SELL', price?: number) => void;
}

