# 技術債 #0017: 整戶總曝險與淨槓桿率 (Leverage Ratio) 及部位持有天數統計 (Leverage Ratio & Holding Period Quant)

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：證券核心系統與交易員深度審查 (Trader & Quant Audit)
- **建立日期**：2026-08-26
- **標籤**：`Quant` · `Leverage` · `Risk` · `Summary`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統具備資產總市值、質押借款金額（`LoanModal.tsx`）與現金帳本餘額（`CashLedgerWorkspace.tsx`），但各指標分散在不同工作區，缺乏頂層統一的「總曝險與淨槓桿率」指標。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **缺乏總體槓桿監控 (Leverage Ratio)**：交易員在牛市容易不知不覺擴張融資或質押部位。若缺乏 $\text{Leverage Ratio} = \frac{\text{總股票資產}}{\text{淨資產 (NAV)}}$ 的常態揭露，無法直觀掌握整戶財務槓桿風險。
  2. **缺乏持股週期（Holding Days）量化**：長線存股與短線波段混在一起，無法衡量不同持倉時間之資金週轉率與年化資金使用效率。
* **暫緩理由**：
  1. 目前質押維持率與現金帳本已有獨立介面。
  2. 槓桿率與持有天數屬於頂層量化統計，列入 P2 技術債集中開發。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **計算整戶槓桿與曝險指標 (`calculatePortfolioExposure`)**：
   - 總曝險（Gross Exposure）：$\text{股票市值} + \text{借出擔保品市值}$。
   - 淨槓桿率（Net Leverage）：$\frac{\text{總股票市值} - \text{現金餘額}}{\text{淨資產 NAV}}$。
2. **計算個股持股天數 (`calculateHoldingDays`)**：
   - 計算自首次開倉（First In）或加權買進日（Weighted Entry Date）至今日的持股天數，並標註「短線 (<30天) / 中期 (1~6月) / 長線 (>1年)」。
3. **UI 整合**：
   - 在 `SummaryCards.tsx` 或風控總覽區顯示淨槓桿率（如 `1.25x`）與持股平均週期。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者希望全面監控整體投資組合之融資質押槓桿倍數。
2. 進行量化風控與週轉率分析時。
