# 05-header-search-autocomplete-and-quick-chips

## Description
在戰情室頂部搜尋列整合本地 SQLite `/api/market/symbols` 模糊搜尋端點，實裝 30ms 防抖即時下拉補全清單（支援代碼與中文名稱搜尋），並常駐核心熱門標的快速切換膠囊。

## Target Files
- `src/components/aiForceDashboard/HeaderMarketBar.tsx`
- `src/components/aiForceDashboard/HeaderMarketBar.test.ts`

## Acceptance Criteria
- [x] 搜尋框輸入文字時，具備 30ms 防抖機制向 `/api/market/symbols` 請求候選清單。
- [x] 支援輸入中文（如「台積電」、「聯發科」、「鴻海」）或代碼，顯示下拉卡片並點擊秒載入。
- [x] 在頂部行情列常駐 `0050`、`2330`、`2454`、`NVDA`、`AAPL` 快速切換膠囊，點擊即分析。
- [x] 編寫 `HeaderMarketBar.test.ts` 單元測試覆蓋下拉清單展示與快捷切換行為。

## Status
- [x] completed
