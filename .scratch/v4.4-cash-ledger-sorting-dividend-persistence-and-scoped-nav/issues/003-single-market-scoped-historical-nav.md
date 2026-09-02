# Issue #3: 單一市場視圖（台股 TWD）資產成長 (NAV) 嚴格過濾與對齊

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`bug`, `nav`, `market-scope`
- **關聯規格**：`docs/specs/0027-cash-ledger-sorting-dividend-persistence-and-scoped-nav.md` (AC-4)

## 任務描述 (Description)
修復當切換至「台股 (TWD)」市場時，資產成長 (NAV) 歷史折線圖計算混入美股資產（換算台幣）導致淨資產金額嚴重虛高的問題。

## 驗收標準 (Acceptance Criteria)
1. 在 `App.tsx` 中計算 `historicalNavSeries` 時，依據 `currentMarket` 嚴格過濾 `scopedTrades`、`scopedCash` 與 `scopedLoans`。
2. 切換至台股時，歷史折線圖上方淨資產金額與台股持股市值精準一致。
3. 單元測試驗證單一市場範疇下的 NAV 序列計算正確性。
