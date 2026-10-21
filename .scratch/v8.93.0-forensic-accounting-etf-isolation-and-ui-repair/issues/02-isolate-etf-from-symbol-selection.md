# Ticket 02: 標的選單物理阻斷 ETF 與初始標的防呆 (ETF Gatekeeper)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/StockAnalysisWorkspace.tsx`
* **測試檔案**：`src/components/analysis/StockAnalysisWorkspace.test.tsx`

## 2. 需求描述 (Description)
1. 在 `initialSymbol` 與持倉下拉候選清單中，透過 `!isEtfSymbol(symbol)` 強制過濾排除所有 ETF（如 0050、0056、00878、SPY、QQQ 等）。
2. 若使用者持倉完全為 ETF 或為空，初始標的自動回退至台股權值王 `2330` 或美股指標 `NVDA`。
3. 確保持倉切換清單只保留普通股。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 持倉中存在 0050 時，下拉選單不出現 0050。
* [ ] 初始標的保證為普通股。
