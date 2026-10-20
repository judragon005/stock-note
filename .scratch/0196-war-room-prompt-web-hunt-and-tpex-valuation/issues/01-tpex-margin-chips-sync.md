# 01 — TPEx 官方信用交易全市場整包同步與解析

**What to build:**
在每日 16:00 盤後同步腳本中加入櫃買中心信用交易官方 JSON 端點（`margin_bal_result.php`）抓取與解析，提取上櫃個股融資餘額、融券餘額，並與 TWSE 信用交易合併寫入 SQLite `tw_institutional_chips` 表，消除 4979 華星光、3260 威剛等上櫃標的融資券為 NULL 的盲區。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `scripts/market-sync/ingest-tw-extended-chips.cjs` 新增 `parseTpexMargin(rawData)` 函式，解析櫃買中心信用交易欄位（代號、融資餘額、融券餘額）。
- [ ] 在 `scripts/market-sync/sync-tw-market.cjs` 中加入對櫃買官方端點 `https://www.tpex.org.tw/web/stock/margin_trading/margin_bal/margin_bal_result.php` 的非阻塞抓取。
- [ ] 將 TPEx 資券與 TWSE `marginMap` 融合後透過 `saveTwExtendedChipsToSqlite` 寫入 `tw_institutional_chips`。
- [ ] 撰寫單元測試覆蓋櫃買信用交易資料解析與入庫邏輯，驗證 4979 與 3260 融資融券數值正確。
