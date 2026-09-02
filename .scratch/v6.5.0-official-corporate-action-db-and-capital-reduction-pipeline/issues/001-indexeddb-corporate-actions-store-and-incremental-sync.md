# 001 — indexeddb-corporate-actions-store-and-incremental-sync

**What to build:**
升級 `StockTrackerDB`，新增 `corporate_actions` Store，實作 CRUD、批次寫入、以 `${symbol}-${type}-${date}` 為主鍵之去重與增量同步函式，並在 `db.test.ts` 驗證其持久化與索引查詢能力。

**Blocked by:** None — can start immediately

**Status:** closed

- [x] `src/utils/db.ts` 升級 IndexedDB 版本，新增 `corporate_actions` Object Store 及 `by_symbol`, `by_date`, `by_type` 索引
- [x] 實作 `getCorporateActionsFromDB`, `saveCorporateActionsToDB`, `getCorporateActionsBySymbol` 等核心 API
- [x] 支援增量合併與去重（以 `${symbol}-${type}-${date}` 為 SSOT Key）
- [x] 擴充 `src/utils/db.test.ts` 單元測試覆蓋 Store 讀寫與索引檢索

