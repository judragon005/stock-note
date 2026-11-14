# 01 — 填息研判引擎四態擴充與清倉回溯計算 (Fill Status Engine Tri-State Evolution)

**Parent:** https://github.com/judragon005/stock-note/issues/539

**What to build:**
擴充 `src/engine/dividendMetricsEngine.ts` 填息計算純函數。新增 `CLOSED_POSITION`（已結清部位）與 `PENDING_DATA`（待補除息價）兩種狀態枚舉。當傳入空持股（部位已全數賣出）或缺乏除息價格時，不再回傳 `undefined`，而是精準回傳結構化狀態與對應繁體中文標籤，為 UI 膠囊提供確定性資料源。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 擴充 `DividendFillStatus` 包含 `'FILLED' | 'UNFILLED' | 'CLOSED_POSITION' | 'PENDING_DATA'`
- [ ] 擴充 `determineDividendFillStatus` 支援接收可選的歷史持有/清倉標記與除息價校驗
- [ ] 擴充 `formatDividendFillStatusLabel` 支援新狀態之繁體中文標籤（「已結清」、「待補除息價」）
- [ ] 編寫/更新 `src/engine/dividendMetricsEngine.test.ts` 確保 100% 單元測試覆蓋
