# Issue 01: 肌肉書僮自訂觀察清單 (Watchlist) 本地持久化儲存與狀態管理

## 狀態

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`storage`, `muscle-booker`

## 需求說明

1. 在 `src/utils/storage.ts` 中新增肌肉書僮自訂觀察清單的讀寫函式：
   - `getMuscleBookerWatchlist(): string[]`
   - `saveMuscleBookerWatchlist(symbols: string[]): void`
   - `addMuscleBookerWatchlistSymbol(symbol: string): string[]`
   - `removeMuscleBookerWatchlistSymbol(symbol: string): string[]`
2. 自動處理去重、清理空白與全大寫標準化。
3. 撰寫 `src/utils/storage.test.ts` 單元測試，確保 CRUD 正常運作。

## 實作成果

- 已於 `src/utils/storage.ts` 定義 `MUSCLE_BOOKER_WATCHLIST_STORAGE_KEY` 並實作完整 CRUD 函式，自動去重、清理空白並標準化為大寫。
- 在 `src/utils/storage.test.ts` 新增 Seam 11 單元測試，驗證讀寫、新增防重複與移除邏輯，100% 綠燈通過。
