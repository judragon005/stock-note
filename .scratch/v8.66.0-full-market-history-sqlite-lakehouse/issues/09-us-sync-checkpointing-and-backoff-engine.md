# 09 — 美股 Checkpoint 斷點續傳與重試狀態機 (US Sync Checkpointing & Backoff Engine)

**What to build:**
實作 `scripts/market-sync/us-sync-checkpoint-engine.cjs`。
管理美股 1,500 檔標的的批量同步進度狀態機：
1. 查詢待同步標的清單：自動排除今日已同步成功 (`status = 'SUCCESS' AND last_success_date = TODAY`) 的標的。
2. 斷點續傳：程式重啟或網路中斷後，從未完成或失敗標的繼續執行。
3. 遭遇 HTTP 429 限流時，自動啟動指數退避 (Exponential Backoff，暫停 30 秒、60 秒、120 秒) 並轉移至失敗重試隊列。
4. 狀態更新：同步成功標的更新 `sync_checkpoints.status = 'SUCCESS'`，失敗則記錄錯誤訊息。

**Blocked by:** 08 — 美股 Yahoo Chart 日 K 限流採集器與還原價計算

**Status:** ready-for-agent

- [ ] 實作 `getPendingUsSymbols(targetDate: string): Promise<string[]>`。
- [ ] 實作 `recordSyncCheckpoint(symbol: string, status: string, error?: string): Promise<void>`。
- [ ] 支援 429 觸發指數退避等待與佇列切換。
- [ ] 模擬在中斷 50% 進度後重啟，能精確跳過前 50% 標的並繼續執行剩餘 50%。
- [ ] 單元測試 `us-sync-checkpoint-engine.test.cjs` 驗證 Checkpoint 狀態切換與中斷恢復邏輯 100% 通過。
