# Ticket 05: daily_candles 1,000 檔櫃買標的去 O 事務性安全遷移 (Spec 0170)

## 1. 任務核心 (Core Objective)
建立並執行資料庫安全遷移腳本 `scripts/market-sync/merge-otc-split-symbols.cjs`，將 `daily_candles` 中 1,000 檔以數字開頭且帶 `O` 尾綴的標的（如 `00679BO`、`3293O`）全量合併至標準代碼（`00679B`、`3293`），徹底消滅 10/2 斷層。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/merge-otc-split-symbols.cjs` (新建)
- `scripts/market-sync/merge-otc-split-symbols.test.cjs` (新建)

## 3. 遷移演算法與衝突裁決 (Migration Logic & Conflict Resolution)
1. 查詢所有待遷移標的：
   - `SELECT DISTINCT symbol FROM daily_candles WHERE symbol GLOB '[0-9]*O'`（共 1,000 檔）。
2. 對每一檔標的（如 `3293O` -> 目標代碼 `3293`）：
   - 提取 `3293O` 的所有日 K 記錄。
   - 透過 `INSERT INTO daily_candles ... ON CONFLICT(symbol, date) DO UPDATE SET ...` 覆蓋至 `3293`（若同日期兩者皆有資料，以數據非空、成交量大者優先覆蓋）。
   - 刪除 `3293O` 的舊資料：`DELETE FROM daily_candles WHERE symbol = '3293O'`。
3. 事務原子性與備份保護：
   - 遷移前自動對資料庫進行 WAL checkpoint；全過程包裹在單一事務內，異常即時回滾。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 執行遷移後，資料庫中 `daily_candles WHERE symbol GLOB '[0-9]*O'` 的標的數從 1,000 檔嚴格降為 **0 檔**。
- [ ] 標的 `00679B` 與 `3293` 之最新交易日推進至 **2026-10-07**，不再停在 10/02。
- [ ] 歷史 250 天 K 線數列維持升冪無縫連續，無重複日期。
