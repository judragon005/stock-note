# 交接手冊: v8.21.0 肌肉書僮動能雷達任意代碼即時外部回補診斷與自訂觀察清單

## 1. 本次迭代成果

- **PRD / Spec**：[0102-muscle-booker-adhoc-scanner-and-custom-watchlist-spec.md](file:///d:/APP/股票紀錄/docs/specs/0102-muscle-booker-adhoc-scanner-and-custom-watchlist-spec.md)
- **ADR**：[0102-muscle-booker-adhoc-scanner-and-custom-watchlist.md](file:///d:/APP/股票紀錄/docs/adr/0102-muscle-booker-adhoc-scanner-and-custom-watchlist.md)
- **核心實作**：
  1. `src/utils/storage.ts`：實作肌肉書僮自訂觀察清單持久化讀寫（`getMuscleBookerWatchlist`, `saveMuscleBookerWatchlist`, `addMuscleBookerWatchlistSymbol`, `removeMuscleBookerWatchlistSymbol`）。
  2. `src/engine/muscleBookerEngine.ts`：擴充 `AssetPoolType` 支援 `'CUSTOM_WATCHLIST'`。
  3. `src/components/MuscleBookerWorkspace.tsx`：
     - 搜尋框支援 Enter 快捷觸發或點擊「連線診斷」按鈕。
     - 自動推斷市場代碼（純數字判定為 `TW`，英文字母判定為 `US`），整合 `backfillSymbolOhlcvAndIndicators` 拉取日 K 並寫入快取。
     - 內嵌式置頂高光卡片 (Spotlight Card)：三色信號、箱頂底線、布林壓縮與停損防守位，支援「⭐ 釘選至自訂觀察」與「✕ 關閉」。
     - 標的池按鈕新增「⭐ 自訂觀察 (N)」，支援名單管理面板、快速新增與膠囊標籤一鍵移除。
     - 綜合動能監控總表中，每列均加入「⭐ 觀察」快捷按鈕。
  4. 單元測試與建置檢查：全專案 57 個測試套件、635 項測試 100% 綠燈，TypeScript 0 錯誤。

## 2. 測試驗證指令

```bash
# 單元測試驗證
npx vitest run src/utils/storage.test.ts
npx vitest run src/components/MuscleBookerWorkspace.test.ts

# 全量測試驗證
npm test

# TypeScript 編譯與打包驗證
npm run build
```
