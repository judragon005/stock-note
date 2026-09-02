# ADR #0037: 整戶總曝險、淨槓桿率與質押維持率極端壓力測試系統 (Portfolio Leverage Exposure & Margin Stress Testing System)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **決策者**：系統架構師、量化工程師、交易員代表
- **關聯 PRD**：[docs/specs/0037-portfolio-leverage-exposure-and-margin-stress-testing.md](../specs/0037-portfolio-leverage-exposure-and-margin-stress-testing.md)
- **解決技術債**：
  - [docs/debts/0017-portfolio-leverage-ratio-and-holding-period-quant.md](../debts/0017-portfolio-leverage-ratio-and-holding-period-quant.md)
  - [docs/debts/0009-margin-pledge-stress-testing-and-margin-call-simulator.md](../debts/0009-margin-pledge-stress-testing-and-margin-call-simulator.md)

---

## 1. 背景與脈絡 (Context)

隨著系統陸續支援了現金帳本、多帳戶管理、XIRR 績效引擎、股票質押與批次沖銷 (Lot-based Accounting)，投資人在管理多元資產時面臨兩大核心量化風控挑戰：
1. **真實槓桿盲區**：在同時存在質押借款、在途交割款與手頭現金時，無法直觀掌握「扣除防守現金後的真實槓桿倍數 (Net Leverage)」，容易在牛市不知不覺過度擴張曝險。
2. **大盤暴跌斷頭風險**：現行質押模組僅能呈現「靜態維持率」，無法回答投資人關鍵問題：「若大盤或質押持股下跌 10%~40%，維持率會跌到多少？是否會觸發 130% 斷頭追繳線？需要立即補繳多少現金或擔保品？」
3. **持股週期量化**：長線存股與短線動能標的混雜，缺乏依加權買進時序量化的持有天數與資金週轉週期分析。

---

## 2. 決策內容 (Decisions)

### 2.1 實作整戶總曝險與淨槓桿率計算引擎 (`src/engine/riskExposureEngine.ts`)
- **總曝險 (Gross Exposure)**：$\text{Gross Exposure} = \sum (\text{shares}_i \times \text{price}_i \times \text{fxRate})$。
- **淨槓桿率 (Net Leverage)**：$\text{Net Leverage} = \frac{\text{總股票市值} - \max(0, \text{可用現金})}{\text{淨資產 NAV}}$。
- **四階風險色階標籤**：
  - `CONSERVATIVE` (≤1.0x)：🟢 穩健無槓桿
  - `MODERATE` (1.0x~1.3x)：🔵 溫和槓桿
  - `ELEVATED` (1.3x~1.6x)：🟡 積極擴張
  - `HIGH_RISK` (>1.6x 或資不抵債)：🔴 極度危險
- **防禦邊界**：$\text{NAV} \le 0$ 時自動以安全警示上限處理，不發生除以零或 NaN 例外。

### 2.2 實作質押維持率極端壓力測試與追繳逆運算引擎 (`src/engine/marginStressEngine.ts`)
- **動態跌幅情境推演**：支援大盤通用跌幅（$-5\% \sim -50\%$）與個股自訂跌幅。
- **最大耐受跌幅 (Max Drop Tolerance to 130%)**：
  $$\text{Max Drop Tolerance} = 1 - \frac{1.30 \times \text{Total Loan}}{\text{Current Collateral Value}}$$
- **追繳差額現金補足款逆運算 (Required Margin Call Cash)**：
  $$\text{Required Cash} = \max\left(0, \text{Total Loan} \times \frac{\text{Target Ratio}}{100} - \text{Stressed Collateral Value}\right)$$
  精確支援恢復至法定 $130\%$ 門檻或 $160\%$ 安全水位兩種模式。

### 2.3 實作加權持股天數與資金週轉量化引擎 (`src/engine/holdingPeriodEngine.ts`)
- 結合 `TaxLot[]` 依各批次買進成本加權計算持有天數，並劃分「⚡ 超短線 / 🚀 短線波段 / 📈 中期波段 / 💎 長線存股 / 🛡️ 稅務長期 (≥1年)」。

### 2.4 UI/UX 全面視覺化與互動升級
- **SummaryCards**：總資產卡片下方整合淨槓桿率徽章與「壓力模擬」快捷按鈕。
- **MarginStressModal**：動態壓力滑桿、即時維持率儀表盤、斷頭安全距離與追繳計算機。
- **HoldingsTable**：標的單元格整合持股天數與策略週期標籤。

---

## 3. 影響評估 (Consequences)

### 正面影響 (Positive)
- 投資人具備專業量化機構級的槓桿與曝險監控能力，徹底消除資產爆倉與追繳斷頭盲區。
- 100% 繁中金融詞典與 Hover Tooltips，兼顧極致專業與新手友善。
- 19 個測試檔案、229 個測試案例 100% 綠燈，TypeScript 0 錯誤。

### 負面影響 / 權衡 (Trade-offs)
- 增加了整戶現金與質押數據在頂層 App 的聯動計算，透過 `useMemo` 確保毫秒級響應與渲染效能。
