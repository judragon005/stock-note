# 技術債 #0028: 跨券商持倉對賬審計與匯入衝突智能消解器 (Multi-Broker Reconciliation & Smart Import Conflict Resolver)

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 跨券商資料對賬與匯入資料完整性調研
- **建立日期**：2026-09-02
- **標籤**：`Architecture` · `Reconciliation` · `Import` · `Accounting` · `Integrity` · `DataSafety`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備增強型 CSV 匯入器（[src/engine/brokerTemplates.ts](file:///d:/APP/股票紀錄/src/engine/brokerTemplates.ts)）與交易去重引擎（[src/engine/tradeDeduplicator.ts](file:///d:/APP/股票紀錄/src/engine/tradeDeduplicator.ts)）：
1. **多來源記帳之對賬落差 (Ledger vs Broker Snapshot Drift)**：
   - 使用者常混合使用多個券商（如富邦、國泰、永豐、Firstrade、IB）並透過「手動即時記帳 + 定期匯入 CSV」。
   - **實質盲區**：在遭遇「券商零股合併/分批成交」、「除權息手動預記與官方流水單微小時間差」或「現金減資退款與碎股折讓」時，累積歷史交易推算出的持倉股數與金額，常與券商 App 實際庫存產生幾股或幾十元的微小誤差，使用者極難排查哪一筆流水單失真。
2. **缺乏獨立的「三方對賬審計 (3-Way Reconciliation)」與「無損調整單」機制**：
   - 既有系統若發現庫存不合，使用者只能手動修改不可變的歷史交易單，容易破壞 XIRR 與過去年度的實現損益準確度。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **庫存快照對賬審計 (Holdings Snapshot Reconciliation)**：
   - 支援直接上傳或貼上券商當前「庫存餘額截圖/CSV」：包含 `(Symbol, Broker, Shares, AvgPrice, MarketValue)`。
   - 引擎自動執行差額比對：
     $$\Delta \text{Shares} = \text{券商實際股數} - \text{系統理論累積股數}$$
     $$\Delta \text{Cash} = \text{券商交割餘額} - \text{系統現金帳本餘額}$$
   - 快速標示出不吻合的標的與疑似遺漏交易的時間區間。
2. **智能模糊除重與拆合匹配 (Fuzzy Match & Merge Resolver)**：
   - 能辨識同日發生的「3 筆零股買進（例如 300股 + 300股 + 400股）= 券商報表 1 筆 1000 股整股」。
   - 提供「合併 (Merge) / 取代 (Replace) / 忽略 (Ignore)」三鍵式智能消解推薦。
3. **審計差額調整單 (Audit Adjustment Entry)**：
   - 允許產生專屬型別 `ADJUSTMENT` 分錄，補平歷史微小差額，而無需竄改原始不可變交易記錄。

### 暫緩理由 (Deferral Rationale)
1. 現有 `tradeDeduplicator` 已能有效阻擋 100% 完全相同的重複交易匯入。
2. 跨券商對賬與差額審計屬於專業級數據完整性維護功能，收錄於技術債中待系統架構進一步模組化後實施。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. 對賬報告資料結構 (Reconciliation Schema)

```typescript
export interface DiscrepancyItem {
  symbol: string;
  broker: string;
  expectedShares: number;          // 系統理論計算股數
  actualShares: number;            // 券商快照實際股數
  shareDiff: number;               // 差異股數 (actual - expected)
  expectedCostBasis: number;       // 系統理論成本
  actualCostBasis?: number;        // 券商回報成本
  suggestedAction: 'GENERATE_ADJUSTMENT' | 'FIND_MISSING_TRADE' | 'IGNORE';
  candidateTransactions: TradeRecord[]; // 疑似導致差異的歷史交易
}

export interface ReconciliationReport {
  timestamp: string;
  broker: string;
  matchedCount: number;
  discrepancyCount: number;
  items: DiscrepancyItem[];
}
```

### B. 核心對賬比對演算法

```typescript
// src/engine/reconciliationEngine.ts
export function reconcileHoldingsWithSnapshot(
  calculatedHoldings: HoldingPosition[],
  brokerSnapshot: { symbol: string; shares: number; costBasis?: number }[]
): ReconciliationReport {
  // 1. 逐檔比對 symbol 與 shares
  // 2. 標記完全吻合、股數不合、系統多出標的、券商多出標的四種狀態
  // 3. 生成審計差異清單與一鍵平衡建議
}
```

---

## 4. 觸發處理時機 (Trigger Conditions)

1. 當使用者反應手動記帳與券商 CSV 多次匯入後出現「庫存股數不平」或「現金帳本微小落差」時。
2. 開發多券商獨立子帳戶視圖與年度總決算審計模組時。
