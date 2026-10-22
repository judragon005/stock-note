# 07 — 台股官方產業別代碼注入與股票字典對齊

**Category:** enhancement
**Status:** closed
**Blocked by:** None — can start immediately

**What to build:**
使用者在檢視個股或進行族群輪動分析時，擁有權威的證交所官方產業分類標籤（如 24 半導體、25 電腦週邊、32 綠能環保等）。對接證交所 OpenAPI `https://openapi.twse.com.tw/v1/opendata/t187ap03_L`，在 SQLite 字典表 `symbols_meta` 擴充並填入官方產業別欄位。

**Acceptance criteria:**
- [x] 於 `scripts/market-sync/sqlite-db-core.cjs` 擴充 `symbols_meta.industry TEXT` 欄位（冪等無損遷移）
- [x] 實作從證交所開放資料 `t187ap03_L` 抓取並更新全體上市櫃標的產業代碼
- [x] 前端股票搜尋與字典檢索能正確讀取到產業分類標籤
- [x] 撰寫遷移與資料注入單元測試

