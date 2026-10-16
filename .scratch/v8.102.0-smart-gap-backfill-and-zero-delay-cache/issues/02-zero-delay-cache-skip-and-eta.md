# Ticket 02 — 真·零延遲快取跳過與 ETA 時間權重校準 (Zero-Delay Cache Skip)

**What to build:**
修復 `scripts/market-sync/backfill-tw-history-web.cjs` 中主迴圈之冷卻邏輯缺陷：
若 `res.cached === true`，以 0ms 瞬間略過，絕對不呼叫 `await sleep(throttleMs)`。
同時優化 ETA 剩餘時間計算器，避免將已快取的極速跳過誤算入網路抓取耗時權重，使進度條剩餘預估時間真實反映待抓取負載。

**Blocked by:**
None — can start immediately.

**Status:**
closed

**Acceptance criteria:**
- [x] 在 `runTwDateDrivenBackfill` 的主迴圈冷卻處，加入 `!res.cached` 守護條件，確保僅有實體網路抓取才沉睡。
- [x] 撰寫單元/整合測試：模擬 10 個全部快取命中之歷史交易日，執行回補耗時必須 $< 150\text{ms}$（證明未發生 10 次 3000ms 睡眠）。
- [x] 驗證進度條與日誌輸出格式正常，`cached` 命中時即時輸出。
