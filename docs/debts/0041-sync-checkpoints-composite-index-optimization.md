# 技術債 0041: 同步檢查點表 (sync_checkpoints) 複合狀態索引優化

- **建立日期**: 2026-10-03
- **來源**: Code Review (Spec 0164 / Issue #163)
- **狀態**: `RESOLVED`
- **解決版本**: v8.83.0 (Spec 0171 / Issue #193)
- **優先級**: `P3 (Low)`
- **標籤**: `Performance` · `Database` · `Lakehouse` · `Indexing`

---

## 1. 現況與背景 (Context)

在 Spec 0164 中，美股排程引入了 `status = 'DELISTED'` 狀態跳過機制。
在 `scripts/market-sync/us-sync-checkpoint-engine.cjs:69` 的 `getPendingUsSymbols` 查詢中：
```sql
SELECT symbol FROM sync_checkpoints 
WHERE market = 'US' AND ((status = 'SUCCESS' AND last_success_date = ?) OR status = 'DELISTED')
```
目前 `sync_checkpoints` 僅以 `(market, symbol)` 作為 PRIMARY KEY。雖然目前美股標的數約 1,800 筆，查詢耗時 < 1ms，但若日後美股標的擴展至萬檔以上，缺少包含 `status` 的複合索引將導致 SQLite 進行全表掃描。

---

## 2. 改善方案 (Proposed Solution)

在 `scripts/market-sync/sqlite-db-core.cjs` 的資料表初始化中新增複合索引：
```sql
CREATE INDEX IF NOT EXISTS idx_sync_checkpoints_lookup 
ON sync_checkpoints(market, status, last_success_date);
```
此索引可確保在萬級標的規模下，狀態過濾與日期範圍查詢均保持常數時間 ($O(1)$) 檢索。

---

## 3. 預計觸發時機

當系統註冊標的數擴大或進行 SQLite 效能調優迭代時納入處理。

---

## 4. 解決紀錄 (Resolution)

- **實作日期**: 2026-10-08
- **實作 PR**: Issue #193 (Spec 0171)
- **變更詳情**: 於 `scripts/market-sync/sqlite-db-core.cjs` 新增 `CREATE INDEX IF NOT EXISTS idx_sync_checkpoints_lookup ON sync_checkpoints(market, status, last_success_date);`，並於 `src/engine/sqliteLakehouseCore.test.ts` 加入測試驗證查詢計劃命中複合索引，保障萬級標的狀態檢索效能維持 $O(1)$。
