# 技術債 #0008: 多批次沖銷會計 (FIFO/LIFO/HIFO/Specific Lot) 與稅務最佳化沖銷 (Lot-based Accounting & Tax-Loss Harvesting)

- **狀態**：`RESOLVED`
- **結案版本**：`v5.3` (ADR #0035)
- **優先級**：`P1`
- **發現來源**：專業金融軟體架構審查 (Financial Software Engineering Audit)
- **建立日期**：2026-08-26
- **標籤**：`Accounting` · `Tax` · `Engine` · `Quant`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統於 `src/engine/calculator.ts` 中一律採用「移動加權平均法 (Moving Weighted Average Cost)」計算持有成本與已實現損益。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **稅務最佳化需求 (Tax-Loss Harvesting)**：美股海外投資人或特定高資產稅務申報時，常採用 **HIFO (Highest In, First Out)** 優先沖銷高成本批次以最小化已實現利得，或採用 **FIFO (先進先出)** 契合特定官方申報標準。
  2. **無法指定批次賣出 (Specific Identification)**：投資人若在不同時段買入相同標的，無法選擇單獨沖銷某次買進 Lot，限制了精確的策略歸因分析。
* **暫緩理由**：
  1. 移動加權平均法符合台灣大部分散戶投資人與券商 App 慣例，核心計算正確性已獲 100% 測試覆蓋。
  2. 多批次沖銷需於 `HoldingPosition` 與 `TradeRecord` 引入 `lotId` 追蹤與時序拆單邏輯，架構跨度較大，立案為 P1 技術債後續統一推進。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **擴充沖銷策略枚舉 (`AccountingMethod`)**：
   ```typescript
   export type AccountingMethod = 
     | 'MOVING_AVERAGE' // 移動加權平均 (預設)
     | 'FIFO'           // 先進先出
     | 'LIFO'           // 後進先出
     | 'HIFO'           // 最高成本先出 (Tax-Loss Harvesting)
     | 'SPECIFIC_LOT';  // 指定批次沖銷
   ```
2. **重構批次追蹤器 (`LotTrackingEngine`)**：
   - 每次 `BUY` 產生一個獨立 `Lot { id, date, shares, price, remainingShares, originalFee }`。
   - 每次 `SELL` 依選定之沖銷演算法依序扣減對應 Lot 剩餘股數，並逐筆計算對應已實現損益。
3. **UI 支援賣出時「指定 Lot 選擇器」**：
   - 在 `TradeModal` 選擇 `SELL` 時，可展開現有持倉批次列表，供進階使用者手動勾選欲沖銷之批次。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者提出美股稅務最佳化 (Tax-Loss Harvesting) 或指定特定批次賣出之需求。
2. 開發多會計準則對帳功能時。
