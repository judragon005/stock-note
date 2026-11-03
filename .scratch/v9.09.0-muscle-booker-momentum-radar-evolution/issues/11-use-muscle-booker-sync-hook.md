# 11 — 抽取 useMuscleBookerSync 與 IndexedDB 批次查詢 (IDB Batch Hydration Hook)

**What to build:**
重構非同步資料流，將生命週期自上帝組件中抽離：
1. 建立 `src/components/muscleBooker/hooks/useMuscleBookerSync.ts` 自定義 Hook。
2. 廢除初次快取檢查時 50 檔標的的順序單線程 `for await`，改為使用 `Promise.all` 批次查詢 IndexedDB，將初始快取水合時間從 300ms 驟降至 20ms。
3. 對外暴露乾淨的 `cachedCandlesMap`、`syncState`、`syncCandles` 與 `refreshSingleSymbol` 介面。
4. 編寫 Hook 單元測試驗證批次水合行為。

**Blocked by:** Ticket 10

**Status:** open

- [x] 建立 `src/components/muscleBooker/hooks/useMuscleBookerSync.ts`
- [x] 採用 `Promise.all` 實作 IndexedDB 批次查詢水合
- [x] 封裝並發回補排程與錯誤重試邏輯
- [x] 撰寫 Hook 單元測試確保狀態回傳與非同步呼叫正確

