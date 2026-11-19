# 02 — 湖倉 7 維欄位級完好度探針與半殘日自動自癒同步

**Parent:** #590 (Spec 0238)
**What to build:** 將市場新鮮度檢查 (`checkMarketFreshness`) 升級為涵蓋最近 5 個已結算交易日的 7 維欄位完好度向量（日 K、三大法人、上市櫃融資融券、借券賣出 `sbl_balance`、現股當沖 `day_trade_rate`、個股估值 `tw_valuation_daily`、ETF 淨值 `etf_daily_nav`）。當任一平面未達門檻時自動標記 `incompleteDates` 並透過 `triggerCatchupTask` 精準補抓；同步解除 `backfill-tw-history-web` 的盲目跳過並補齊 `TWT93U` / `TWTB4U` 與美股/董監質押追趕。
**Blocked by:** 01 — ETF 全分組淨值入庫解析器修復與實庫補齊
**Status:** ready-for-agent

- [ ] `checkMarketFreshness` 查核近 5 個已結算日之 `margin_balance >= 1500`、`sbl_balance >= 500`、`day_trade_rate >= 500`、`tw_valuation_daily >= 1500`、`etf_daily_nav >= 100`，準確回傳 `isStale: true` 與 `incompleteDates`。
- [ ] `backfill-tw-history-web` 納入 `TWT93U` 與 `TWTB4U`，且僅在該日資券/估值/借券皆達標時才跳過快取。
- [ ] `triggerCatchupTask` 支援依 `incompleteDates` 自動補抓缺漏欄位，並在 `us.isStale` 時呼叫美股日 K 同步。
- [ ] 針對半殘日偵測補齊單元測試並 100% 通過。
