# 12 — 實施快取狀態批次節流更新 (Batched State Throttling)

**What to build:**
徹底消滅背景回補 50 檔股票時引發的「50 次 Re-render 瀑布」：
1. 在 `useMuscleBookerSync.ts` 中引入批次更新緩衝區 (Batch Buffer)：
   - 每完成一檔股票回補，先將結果寫入本地 Map Buffer。
   - 透過節流/微任務（每 5 檔或每 300ms）呼叫一次 `setCachedCandlesMap`。
2. 50 檔標的連續回補時，將 React 觸發的 Virtual DOM Diff 與 11 個衍生陣列運算次數從 50 次降至 2~3 次。
3. 撰寫單元測試驗證節流更新次數受控。

**Blocked by:** Ticket 11

**Status:** open

- [x] 在回補 worker 迴圈中加入批次緩衝區與節流機制
- [x] 限制每批次至少累積 5 檔或 300ms 才 flush 一次 State 更新
- [x] 保持進度條數值與當前股票名稱平滑過渡
- [x] 編寫測試驗證 50 檔同步時 State 更新次數不超過 4 次

