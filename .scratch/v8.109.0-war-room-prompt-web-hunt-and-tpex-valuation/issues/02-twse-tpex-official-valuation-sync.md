# 02 — TWSE & TPEx 官方每日 PE / PB / 殖利率整包抓取與 SQLite 快取

**What to build:**
在每日 16:00 盤後同步腳本中整合證交所官方 `BWIBBU_d` 與櫃買中心 `pera_result.php`，批次抓取全市場個股之官方每日本益比 (PE)、股價淨值比 (PB) 與殖利率 (Yield)，寫入 SQLite 輕量快取表 `tw_valuation_daily` 並同步至 `tw_market_summary.json`，消滅估值 N/A 盲區。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `scripts/market-sync/sqlite-db-core.cjs` 建立或遷移 `tw_valuation_daily` 資料表架構 (`symbol`, `date`, `pe`, `pb`, `dividend_yield`)。
- [ ] 在 `scripts/market-sync/sync-tw-market.cjs` 新增 TWSE `BWIBBU_d` 與 TPEx `pera_result.php` 批次解析器。
- [ ] 事務寫入 SQLite 並同步更新 `tw_market_summary.json` 個股節點之 `valuation` 物件。
- [ ] 撰寫排程守護測試，驗證 4979 (TPEx) 與 2330 (TWSE) 估值資料完整入庫。
