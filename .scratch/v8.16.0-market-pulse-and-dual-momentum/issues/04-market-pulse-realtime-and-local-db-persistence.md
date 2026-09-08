# Issue 04: 市場四柱在地持久化資料庫與離線檢索

## 狀態
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`feature`, `storage`, `macro`

## 需求
1. 建立 `src/services/macroPulseStorage.ts`，提供本地持久化管理（LocalStorage / IndexedDB）：
   - `saveDailyMacroPulse(snapshot: MacroIndicatorSnapshot): void`
   - `getLatestMacroPulse(): MacroIndicatorSnapshot | null`
   - `getAllMacroPulseHistory(): MacroIndicatorSnapshot[]`
   - `exportMacroPulseHistoryAsCsv(): string`
2. 在 `WarRoomWorkspace` 整合 `macroPulseStorage`：
   - 載入時優先讀取本地歷史資料庫最新快照。
   - 支援「📥 導出歷史脈搏數據 (CSV)」按鈕。
   - 支援「🔄 即時同步/更新」觸發。
   - 支援「📜 展開過往歷史數據檢視器」。

## 驗收條件
- 單元測試驗證儲存、檢索與導出邏輯正確無誤。
