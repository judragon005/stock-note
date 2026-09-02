# 技術債 #0016: 移動停損停利風控線設定與觸價警示標籤 (Stop-Loss / Take-Profit Alerts)

- **狀態**：`RESOLVED` (已於 v5.7.0 ADR #0041 完整解決)
- **優先級**：`P2`
- **發現來源**：證券核心系統與交易員深度審查 (Trader & Quant Audit)
- **建立日期**：2026-08-26
- **標籤**：`Risk` · `Trader` · `Discipline` · `UI`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前 `TradeRecord` 包含 `note` 與 `tags`，但尚未提供結構化的停損價（Stop-Loss Price）與停利目標價（Take-Profit Price）欄位。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  專業交易員嚴格遵循交易紀律（如跌破成本 8% 停損、到達目標價 20% 停利）。當前系統無法在盤中價格觸及停損/停利點位時主動警示，投資人容易因人性猶豫而錯失出場時機。
* **暫緩理由**：
  1. 系統已有基本自訂鎖定價格與損益呈現。
  2. 停損停利警示需與交易計畫模組（技術債 #0002）協同設計，列入 P2 技術債。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **資料結構擴充**：
   - 在 `HoldingPosition` 或 `TradeRecord` 加入 `stopLossPrice?: number` 與 `takeProfitPrice?: number`。
2. **風控狀態判定 (`RiskStatus`)**：
   - 若 `currentPrice <= stopLossPrice` ➔ 標記 `STOP_LOSS_TRIGGERED (🚨 觸及停損)`。
   - 若 `currentPrice >= takeProfitPrice` ➔ 標記 `TAKE_PROFIT_TRIGGERED (🎯 達成停利)`。
3. **UI 視覺化**：
   - 於 `HoldingsTable.tsx` 個股列即時顯示風控警示 Badge 與離停損/停利之距離百分比。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者希望建立進階交易紀律與停損停利自動提醒。
2. 開發交易計畫與覆盤模組時。
