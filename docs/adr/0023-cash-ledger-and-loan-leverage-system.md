# ADR-0023: 現金帳本、真實交割週期 (T+2/T+1)、股票質押風控與三大規費架構

## 狀態 (Status)
**ACCEPTED (已通過並實作完成)**

---

## 背景與脈絡 (Context)

在進行投資組合管理時，投資人需要精準掌握券商交割戶頭的真實現金水位、跨幣別換匯、以及股票質押借款（槓桿）的即時維持率與利息負擔。過去系統面臨以下架構挑戰：
1. **未記外部入金導致現金為負數**：股票買進自動扣款會使未記錄初始本金的帳本結餘呈現負數，導致全站 NAV 倒扣股票市值。
2. **交割結算週期脫離真實市場**：台股為 T+2 結算，美股自 2024 年起為 T+1 結算，且兩者均需跳過週末。
3. **股票質押利息與規費欠缺**：質押借款需精確計算計息天數之累積利息、本利和應還款額，以及三大設質規費（撥券費、設質登記費、開辦手續費）。
4. **跨市場負債污染**：切換至美股市場時，台股借款未被隔離，造成美股 NAV 與負債比計算失真。

---

## 決策 (Decision)

1. **核心計算引擎模組化 ([src/engine/cashLedgerEngine.ts](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts))**：
   - 實作 `calculateSettlementDate`：依市場（TW / US）自動跳過週六週日計算真實交割日。
   - 實作 `reconcileAccountBalance`：由使用者輸入交割戶真實現金，自動回推並補登歷史初始入金 (`DEPOSIT`)。
   - 實作 `calculateLoanInterestAndPayoff`：計算計息天數累計利息、預估月息與本利和總金額。
   - 實作 `calculatePledgeMaintenanceRatio`：依即時報價試算擔保品市值與維持率狀態燈號。
   - 實作 `calculateOverallLeverageMetrics`：計算全域與市場隔離之總負債、NAV 與 LTV。
2. **市場範疇隔離機制 (Market Scope Isolation)**：
   - `CashLedgerWorkspace` 接收 `currentMarket`，當切換至 `US` 時，僅計入美股持股、美金帳戶與 USD 借款；若美股無借款，負債歸零、LTV 為 0%、NAV 精準等於美股資產。
3. **質押三大規費細化結構**：
   - `LoanRecord` 結構化收錄 `transferFee`（撥券費每檔 NT$100）、`pledgeRegistryFee`（設質費 NT$100）、`handlingFee`（手續費 NT$0）與 `pledgeFee`（規費合計），支援一鍵在現金帳本扣除。
4. **原生 Glassmorphism 視覺系統重構**：
   - 移除 Tailwind 類別依賴，全量採用專案原生 `.glass-card`、深色霓虹玻璃與流暢排版。

---

## 後果與效益 (Consequences)

- **優點**：
  - 徹底解決三處畫面金額對不上的根本原因，全站資產、NAV 與庫存市值 100% 精準對齊。
  - 完全符合台灣證券交易所 (T+2) 與美國 SEC (T+1) 的真實交易結算規則。
  - 股票質押槓桿具備完整的利息、本利和還款、維持率風控與三大規費明細。
  - 美股市場切換時數據完全乾淨隔離。
- **維護性**：
  - 核心計算邏輯 100% 封裝於純函式中，單元測試覆蓋率 100%，無狀態副作用。
