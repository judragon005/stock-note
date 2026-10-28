# 05 — 大盤基準直連本機 SQLite 湖倉 API 與日 K 快取

**What to build:**
打通前端大盤基準資料載入器與後端本機 SQLite 湖倉數據庫。在 `src/engine/benchmarkData.ts` 中實作非同步 API 讀取函式，直接請求 `/api/market/history/:symbol?limit=all`（標的包含 SPY、0050、TAIEX），取得完整歷史真實日 K 收盤價，並提供記憶體快取與超時降級保護，消滅資料斷頭。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 在 `src/engine/benchmarkData.ts` 擴充 `loadBenchmarkDailyPricesAsync(symbol: string): Promise<Record<string, number>>`
- [ ] 串接 `/api/market/history/:symbol?limit=all` 提取真實日 K 收盤價
- [ ] 實作記憶體 Map 快取避免重複請求
- [ ] 具備超時與空資料時的安全 fallback，確保離線或中斷時系統不崩潰
- [ ] 單元測試驗證湖倉 API 回傳資料正確轉換為每日價格字典
