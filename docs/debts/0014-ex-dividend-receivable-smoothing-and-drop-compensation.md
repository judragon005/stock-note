# 技術債 #0014: 除息日至發放日應收股息平滑機制與假性虧損補償 (Ex-Dividend Receivable Smoothing)

- **狀態**：`RESOLVED` (已於 v6.1.0 依 PRD #0049 完整解決)
- **優先級**：`P2`
- **發現來源**：證券核心系統與交易員深度審查 (Trader & Quant Audit)
- **建立日期**：2026-08-26
- **標籤**：`Dividend` · `Accounting` · `Precision` · `Engine`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統在標的除息日（Ex-Date）時，市場報價會直接反映除息跌價（例如由 100 元降至 95 元），而投資人通常在 3~4 週後的「發放日（Pay-Date）」才會登錄現金股利。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  在「除息日 ➔ 發放日」這段 1 個月的時間空窗期內，持股表格與總覽儀表板的未實現損益會出現「除息假性虧損（Ex-Dividend Paper Drop）」，投資人帳面市值看似蒸發，但實質上即將收到該筆股息。
* **暫緩理由**：
  1. 目前券商原生 App（如國泰、三竹等）多半亦直接呈現除息後市值，屬金融軟體常見現象。
  2. 此平滑補償需依賴全市場公司行動掃描器之發放日數據，列入 P2 技術債優化。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **定義應收股利狀態 (Receivable Dividends)**：
   - 當標的滿足 `exDate <= today < payDate` 時，自動計算 `receivableDividend = holdingShares * cashDividendPerShare`。
2. **總報酬平滑視圖 (Smoothed Total Return)**：
   - 於未實現損益欄位或提示 Tooltip 顯示：「含應收股息之調整後損益：+$X,XXX (含待發放股利 $XXX)」。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者反映除息當天總資產未實現損益驟降、需要平滑顯示時。
2. 進行股息月曆與現金流深度整合時。
