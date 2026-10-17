# 05 — 實作本地持久化儲存與自訂事件管理器 (src/utils/catalystStorage.ts)

**Parent:** #281

**What to build:**
建立催化劑日曆之本地持久化管理器（模式對齊 `macroPulseStorage.ts`）：
1. 儲存鍵定義：`STORAGE_KEY_CATALYSTS = 'STOCK_TRACKER_UPCOMING_CATALYSTS_V1'`。
2. 實作 API：
   - `loadStoredCustomCatalysts(): UpcomingCatalyst[]`：讀取使用者手動新增之自訂事件。
   - `saveCustomCatalyst(catalyst: Omit<UpcomingCatalyst, 'daysLeft' | 'isCustom'>): UpcomingCatalyst`：持久化一筆自訂事件。
   - `deleteCustomCatalyst(id: string): void`：刪除自訂事件。
   - `resetCatalystsToDefault(): void`：清除快取並恢復預設。
   - `getAggregatedCatalysts(options: { asOfDate?: string; receivableDividends?: ReceivableDividend[] }): UpcomingCatalyst[]`：整合「自訂事件 + 庫存除息 + 滾動前瞻種子」，調用 `calculateUpcomingCatalysts` 回傳最終陣列。

**Blocked by:** Ticket 03, Ticket 04

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 本地自訂事件能正確儲存於 `localStorage`，刷新後不遺失。
- [ ] `getAggregatedCatalysts()` 能完成多來源去重與日期排序，優先保留自訂事件。
- [ ] 撰寫 `src/utils/catalystStorage.test.ts` 單元測試覆蓋 CRUD 與重置行為。
