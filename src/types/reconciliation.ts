import { TradeRecord } from './stock';

export type DiscrepancyType =
  | 'MATCH'              // 完全吻合
  | 'DIFF_SHARES'        // 股數落差 (如手動漏記或除權配股)
  | 'MISSING_IN_SYSTEM'  // 券商有但系統無 (完全漏記)
  | 'ORPHAN_IN_SYSTEM';  // 系統有但券商無 (已在外部賣出但系統未平倉)

export interface BrokerSnapshotItem {
  symbol: string;
  broker?: string;
  shares: number;
  currentPrice?: number;
  costBasis?: number;
  marketValue?: number;
}

export interface ReconciliationDiscrepancy {
  symbol: string;
  broker: string;
  discrepancyType: DiscrepancyType;
  expectedShares: number;           // 系統依據歷史紀錄計算之股數
  actualShares: number;             // 券商快照實際回報股數
  diffShares: number;               // 差額 (actual - expected)
  expectedMarketValue: number;
  actualMarketValue: number;
  suggestedAction: 'AUTO_ADJUST' | 'MANUAL_INSPECT' | 'NONE';
}

export interface MultiLotMatchCandidate {
  date: string;
  symbol: string;
  aggregatedIncomingShares: number;
  matchingExistingTrades: TradeRecord[];
  isExactSumMatch: boolean;
}

export interface ReconciliationReport {
  timestamp: string;
  totalComparedSymbols: number;
  matchedCount: number;
  discrepancyCount: number;
  items: ReconciliationDiscrepancy[];
  splitLotMatches: MultiLotMatchCandidate[];
}
