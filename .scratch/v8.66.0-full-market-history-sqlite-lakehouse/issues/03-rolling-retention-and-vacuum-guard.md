# 03 — 歷史數據滾動窗口修剪與增量 VACUUM (Rolling Window 500-Day Retention & Vacuum Guard)

**What to build:**
實作 `scripts/market-sync/retention-cleaner.cjs`。
設計滾動視窗修剪演算法：針對資料表 `daily_candles` 與 `tw_institutional_chips`，以標的為分組，保留每個標的最新 500 個交易日數據，刪除超過 500 交易日前的舊數據。
實作增量儲存空間釋放機制 `runIncrementalVacuum(pages?: number)`，調用 SQLite `PRAGMA incremental_vacuum`，將數據庫容量穩定控制在 150MB 以內。

**Blocked by:** 01 — SQLite 資料庫引擎連線層與核心 Schema 初始化

**Status:** ready-for-agent

- [ ] 實作 `pruneExpiredCandles(symbol?: string, keepDays?: number): Promise<{ deletedCandles: number }>`。
- [ ] 實作 `pruneExpiredChips(symbol?: string, keepDays?: number): Promise<{ deletedChips: number }>`。
- [ ] 實作 `runIncrementalVacuum()` 定期釋放未使用的頁面。
- [ ] 驗證當單檔股票注入 600 筆數據時，執行修剪後精確只保留最新 500 筆，舊筆數被安全刪除。
- [ ] 單元測試 `retention-cleaner.test.cjs` 驗證修剪邏輯、邊界保留與 VACUUM 執行無異常。
