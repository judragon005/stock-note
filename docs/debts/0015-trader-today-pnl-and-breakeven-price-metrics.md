# 技術債 #0015: 交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) (Today's PnL & Breakeven Price)

- **狀態**：`RESOLVED` (已於 v5.2 / ADR #0034 解決)
- **優先級**：`P1`
- **發現來源**：證券核心系統與交易員深度審查 (Trader & Quant Audit)
- **建立日期**：2026-08-26
- **標籤**：`Trader` · `Metrics` · `Holdings` · `UI`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統持股表格 `HoldingsTable.tsx` 與頂部總覽 `SummaryCards.tsx` 主要揭露「累計未實現損益」與「累計已實現損益」，報價引擎 `priceFetcher.ts` 雖已抓取 `previousClose`（昨日收盤價）與 `change`（漲跌幅），但未進一步計算整戶與個股的「當日總損益金額」與「保本賣出價」。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **交易員盤中核心指標缺失**：專業交易員在盤中時段最關注「今天總共賺賠多少（Today's PnL）」，現行無法一目了然得知當日所有持股之波動總金額。
  2. **保本出場價 (Breakeven Price) 需心算**：投資人準備賣出持股保本或解套時，需手動計算計入買進手續費、預估賣出手續費（含券商折讓）與證交稅後的「精確損益平衡單價」。
* **暫緩理由**：
  1. 目前表格已有當日漲跌百分比與累計損益，基本檢視功能完整。
  2. 列入 P1 優先級，待進行持股表格與頂部卡片增強時一併實作。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **擴充 `HoldingPosition` 與計算引擎 (`src/engine/calculator.ts`)**：
   - `todaysPnL = shares * (currentPrice - previousClose)` (折算本幣)
   - `todaysPnLPercent = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0`
   - `breakevenPrice`：逆推公式使 $\text{Net Proceeds}(\text{breakevenPrice}) = \text{Total Cost Basis}$。
2. **UI 呈現**：
   - `SummaryCards.tsx` 新增「今日損益 (Today's PnL)」獨立卡片（含紅/綠背景色與金額）。
   - `HoldingsTable.tsx` 支援切換或新增「今日損益」與「保本價」欄位。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者指示強化持股清單之交易員維度與即時看盤體驗。
2. 優化首頁頂部總覽卡片時。
