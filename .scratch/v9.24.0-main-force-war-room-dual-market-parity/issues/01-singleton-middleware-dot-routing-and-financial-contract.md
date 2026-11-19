# 01 — 單例快取中介層、含點號代碼路由 (BRK.B)、財報雙向欄位契約與 meta 復用

**Parent:** #592 (Spec 0239)
**What to build:** 將本地市場 API 中介層改為單例快取實例（僅在同步模組熱重載時重置），並於市場資料入庫後主動失效市場寬度快取，消除每請求重複開庫與多表聚合掃描；擴展全市場 API 路由支援含點號代碼（如 `BRK.B`）與雙向別名探測（`BRK.B` ↔ `BRK-B`、OTC `O` 尾綴剝除）；讓前端湖倉載入器直接消費歷史端點回傳的 `meta` 消除冗餘 `/quote` 請求；對齊季度財報讀寫欄位契約（`cash_dividends_paid` 等）；修復即時報價抓手在 HTTP 429/500 時的代理熔斷處理。
**Blocked by:** None — can start immediately
**Status:** ready-for-agent

- [ ] 連續請求市場 API 與靜態資源時，中介層僅初始化資料庫與執行新鮮度檢查一次（熱重載後才重新初始化），本地歷史查詢 P95 延遲 $\le 80\text{ms}$。
- [ ] 資料寫入本地湖倉後，`breadthAnchorCache` 自動失效並回傳最新寬度統計。
- [ ] 請求 `/api/market/history/BRK.B`、`/api/market/quote/BRK.B`、`/api/market/financials/BRK.B` 與 `/api/market/corporate-actions/BRK.B` 均回傳合法 JSON（不穿透至 HTML 200），且自動支援 `BRK.B` ↔ `BRK-B` 與 OTC `O` 雙向別名。
- [ ] `loadSymbolFullLakehouseData` 直接保留並輸出 `meta`（含 `name`, `type`, `status`），階段二不再對已取得 `meta` 的標的重複發起 `/api/market/quote/:symbol`。
- [ ] 透過湖倉財報用戶端寫入並讀回季度財報時，`cashDividendsPaid`、`periodDate`、`cashAndEquivalents` 與 `source` 雙向無損保留（不再寫入 `NULL`）。
- [ ] 即時報價抓手於本地代理回傳 HTTP 429 或 500 時正確觸發熔斷/退避，不再盲目穿透至 CORS 失敗直連。
