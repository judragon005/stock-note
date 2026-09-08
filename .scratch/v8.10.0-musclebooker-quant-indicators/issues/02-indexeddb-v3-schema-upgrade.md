# Issue #0091-02: IndexedDB v3 結構平滑升級與日 K / 指標持久化 (IndexedDB v3 Schema Upgrade)

- **標籤**：`ready-for-agent` · `Storage` · `IndexedDB` · `Database`
- **對應規格**：[PRD #0091](../../../docs/specs/0091-local-historical-indicators-and-external-backfill-engine-spec.md)
- **優先級**：`P1`

---

## 任務描述
升級底層資料庫架構：
1. `src/utils/db.ts` 中 `DB_VERSION` 由 `2` 升級為 `3`。
2. 在 `onupgradeneeded` 中新增兩個專屬 Object Stores：
   - `historicalOhlcv`（主鍵 `symbol`，存放全量日 K 線）
   - `technicalIndicators`（主鍵 `symbol`，存放計算完成之指標時序）
3. 增加讀取與寫入輔助函式：`saveSymbolOhlcv`、`getSymbolOhlcv`、`saveSymbolIndicators`、`getSymbolIndicators`。
4. 確保既有 `trades`、`brokerAccounts`、`snapshots`、`loanRecords` 等儲存結構 100% 零破壞零丟失。

## 驗收條件 (Acceptance Criteria)
- [ ] 撰寫/擴充 `src/utils/db.test.ts`，驗證 v2 升級至 v3 流程正確，兩個新 Store 支援 CRUD 且歷史資料無損。
