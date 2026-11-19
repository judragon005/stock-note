# 03 — TDCC 集保 10 週、月營收 12 月與歷史配息按需序列補齊

**Parent:** #590 (Spec 0238)
**What to build:** 當查詢標的於本地湖倉之集保 `tw_tdcc_distribution` 少於 4 週、非 ETF 個股之 `tw_monthly_revenue` 少於 6 個月、或缺乏歷史近四季除權息紀錄時，透過 `/api/market/history/:symbol`（或按需回補管線）自動從公開歷史源（FinMind / Yahoo / 權威基準庫）拉取歷史時間序列並永久沉澱至本地 SQLite 湖倉，消除新部署環境僅有單筆快照的斷層。
**Blocked by:** None — can start immediately
**Status:** ready-for-agent

- [ ] 當 `tw_tdcc_distribution` 少於 4 週時，支援按需補齊近 10 週歷史集保大戶比例並寫入 SQLite。
- [ ] 當台股個股 `tw_monthly_revenue` 少於 6 個月時，支援按需補齊近 12 個月營收並寫入 SQLite。
- [ ] `/api/market/history/:symbol` 之 `corporateActions` 能合併歷史除權息紀錄（不再僅限 `TWT48U` 未來預告）。
- [ ] 具備 Circuit Breaker / 靜默降級防護，外部失敗時不阻塞主畫面渲染。
