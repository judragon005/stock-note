import { HoldingPosition, TradeRecord, MarketType, Currency } from '../types/stock';
import {
  BrokerSnapshotItem,
  ReconciliationReport,
  ReconciliationDiscrepancy,
  MultiLotMatchCandidate,
} from '../types/reconciliation';

/**
 * 解析來自剪貼簿或 CSV 的券商持倉快照文字
 * 支援 Tab 分隔 (TSV)、逗號分隔 (CSV) 與空格分隔
 */
export function parseBrokerSnapshotText(rawText: string): BrokerSnapshotItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const items: BrokerSnapshotItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 分隔符辨識：優先 Tab，次之逗號，最後是多空格
    let tokens: string[] = [];
    if (trimmed.includes('\t')) {
      tokens = trimmed.split('\t');
    } else if (trimmed.includes(',')) {
      tokens = trimmed.split(',');
    } else {
      tokens = trimmed.split(/\s+/);
    }

    tokens = tokens.map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) continue;

    // 尋找標的代碼與股數
    // 慣用欄位可能為：[代碼, 名稱, 股數, 現價] 或 [symbol, shares, price]
    let symbol = '';
    let shares = NaN;
    let price: number | undefined;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // 清除千分位逗號
      const cleanNum = token.replace(/,/g, '');
      const parsedNum = parseFloat(cleanNum);

      if (!symbol && /^[A-Za-z0-9.]+$/.test(token) && isNaN(Number(token))) {
        // 英文字母代碼 (如 AAPL, VT, 0050.TW)
        symbol = token.toUpperCase();
      } else if (!symbol && /^\d{4,6}[A-Za-z]?$/.test(token)) {
        // 台股純數字或含後綴代碼 (如 2330, 0050, 00403A)
        symbol = token.toUpperCase();
      } else if (!isNaN(parsedNum) && isNaN(shares) && i > 0) {
        // 第一個在代碼之後出現的合法數值通常為股數
        shares = parsedNum;
      } else if (!isNaN(parsedNum) && !isNaN(shares) && price === undefined) {
        price = parsedNum;
      }
    }

    // 若未按正則提取到 symbol，退回第一個 token
    if (!symbol && tokens[0] && !['代碼', 'SYMBOL', '股票代碼', '標的'].includes(tokens[0].toUpperCase())) {
      symbol = tokens[0].toUpperCase();
    }

    // 若第二個 token 為合法數字且尚未取得 shares
    if (isNaN(shares) && tokens[1]) {
      const num = parseFloat(tokens[1].replace(/,/g, ''));
      if (!isNaN(num)) {
        shares = num;
      }
    }

    // 忽略表頭列或無效股數
    if (!symbol || isNaN(shares) || shares <= 0) {
      continue;
    }

    items.push({
      symbol,
      shares,
      currentPrice: price,
    });
  }

  return items;
}

/**
 * 執行雙向逐檔庫存差額比對
 */
export function reconcileWithBrokerSnapshot(
  calculatedHoldings: HoldingPosition[],
  brokerSnapshot: BrokerSnapshotItem[],
  brokerName: string = '預設券商'
): ReconciliationReport {
  const holdingsMap = new Map<string, HoldingPosition>();
  for (const h of calculatedHoldings) {
    holdingsMap.set(h.symbol.trim().toUpperCase(), h);
  }

  const snapshotMap = new Map<string, BrokerSnapshotItem>();
  for (const item of brokerSnapshot) {
    snapshotMap.set(item.symbol.trim().toUpperCase(), item);
  }

  const allSymbols = Array.from(new Set([...holdingsMap.keys(), ...snapshotMap.keys()])).sort();
  const items: ReconciliationDiscrepancy[] = [];
  let matchedCount = 0;
  let discrepancyCount = 0;

  for (const symbol of allSymbols) {
    const holding = holdingsMap.get(symbol);
    const snapshot = snapshotMap.get(symbol);

    const expectedShares = holding ? holding.shares : 0;
    const actualShares = snapshot ? snapshot.shares : 0;
    const diffShares = actualShares - expectedShares;

    const expectedPrice = holding?.currentPrice || snapshot?.currentPrice || 0;
    const actualPrice = snapshot?.currentPrice || holding?.currentPrice || 0;

    const expectedMarketValue = expectedShares * expectedPrice;
    const actualMarketValue = actualShares * actualPrice;

    if (!holding && snapshot) {
      // 券商有但系統無
      discrepancyCount++;
      items.push({
        symbol,
        broker: brokerName,
        discrepancyType: 'MISSING_IN_SYSTEM',
        expectedShares: 0,
        actualShares,
        diffShares,
        expectedMarketValue: 0,
        actualMarketValue,
        suggestedAction: 'AUTO_ADJUST',
      });
    } else if (holding && !snapshot) {
      // 系統有但券商無 (外部已賣出或轉出)
      discrepancyCount++;
      items.push({
        symbol,
        broker: brokerName,
        discrepancyType: 'ORPHAN_IN_SYSTEM',
        expectedShares,
        actualShares: 0,
        diffShares: -expectedShares,
        expectedMarketValue,
        actualMarketValue: 0,
        suggestedAction: 'AUTO_ADJUST',
      });
    } else if (Math.abs(diffShares) < 0.0001) {
      // 完全吻合
      matchedCount++;
      items.push({
        symbol,
        broker: brokerName,
        discrepancyType: 'MATCH',
        expectedShares,
        actualShares,
        diffShares: 0,
        expectedMarketValue,
        actualMarketValue,
        suggestedAction: 'NONE',
      });
    } else {
      // 股數落差
      discrepancyCount++;
      items.push({
        symbol,
        broker: brokerName,
        discrepancyType: 'DIFF_SHARES',
        expectedShares,
        actualShares,
        diffShares,
        expectedMarketValue,
        actualMarketValue,
        suggestedAction: 'AUTO_ADJUST',
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalComparedSymbols: allSymbols.length,
    matchedCount,
    discrepancyCount,
    items,
    splitLotMatches: [],
  };
}

/**
 * 偵測同日零股分批拆合智能匹配
 */
export function detectMultiLotMatches(
  incomingTrade: Partial<TradeRecord>,
  existingTrades: TradeRecord[]
): MultiLotMatchCandidate | null {
  const targetDate = (incomingTrade.date || '').trim();
  const targetSymbol = (incomingTrade.symbol || '').trim().toUpperCase();
  const targetType = (incomingTrade.type || 'BUY').trim().toUpperCase();
  const targetShares = Number(incomingTrade.shares) || 0;

  if (!targetDate || !targetSymbol || targetShares <= 0) return null;

  // 篩選同日、同標的、同類型的既有歷史交易
  const sameDayTrades = existingTrades.filter((t) => {
    return (
      (t.date || '').trim() === targetDate &&
      (t.symbol || '').trim().toUpperCase() === targetSymbol &&
      (t.type || '').trim().toUpperCase() === targetType
    );
  });

  if (sameDayTrades.length < 2) return null;

  const totalExistingShares = sameDayTrades.reduce((sum, t) => sum + (t.shares || 0), 0);

  if (Math.abs(totalExistingShares - targetShares) < 0.0001) {
    return {
      date: targetDate,
      symbol: targetSymbol,
      aggregatedIncomingShares: targetShares,
      matchingExistingTrades: sameDayTrades,
      isExactSumMatch: true,
    };
  }

  return null;
}

/**
 * 產生非侵入式無損審計調整單交易分錄
 */
export function generateAuditAdjustmentTrade(
  symbol: string,
  diffShares: number,
  market: MarketType = 'TW',
  currency: Currency = 'TWD',
  reason: string = '對賬差額自動校準'
): TradeRecord {
  const cleanSymbol = symbol.trim().toUpperCase();
  const today = new Date().toISOString().split('T')[0];

  return {
    id: `adj_${Date.now()}_${cleanSymbol}_${Math.random().toString(36).substring(2, 7)}`,
    date: today,
    symbol: cleanSymbol,
    market,
    currency,
    type: 'ADJUSTMENT',
    shares: diffShares,
    price: 0,
    fee: 0,
    tax: 0,
    note: `[對賬審計調整] ${reason} (${diffShares > 0 ? '+' : ''}${diffShares} 股)`,
    createdAt: Date.now(),
  };
}
