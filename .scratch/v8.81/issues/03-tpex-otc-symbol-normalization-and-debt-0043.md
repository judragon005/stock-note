# 03-tpex-otc-symbol-normalization-and-debt-0043

## Description
結案技術債 0043 (`docs/debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md`)。在 `scripts/market-sync/backfill-local-csv.cjs` 與 SQLite 湖倉中執行代碼標準化遷移，將過去因 CSV 檔名帶尾綴 `O` 之櫃買標的（如 `00411AO`、`3293O`、`00679BO`）歸併至正規無 `O` 代碼。同時在 `src/engine/marketCacheLoader.ts` 增加別名回退探測作為防禦底線。

## Target Files
- `src/engine/marketCacheLoader.ts`
- `scripts/market-sync/normalize-otc-symbols.cjs`
- `docs/debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md`
- `docs/debts/README.md`

## Acceptance Criteria
- [x] 撰寫並執行代碼標準化遷移腳本，將 `daily_candles` 中帶 `O` 的歷史數據（如 `00411AO` 37 筆）遷移歸正為 `00411A`。
- [x] 在 `marketCacheLoader.ts` 中讀取 `daily_candles` 時，若傳入 `00411A` 查無資料，自動探測 `00411AO` 別名作為相容防禦。
- [x] 更新 `docs/debts/0043-*.md` 狀態為 `RESOLVED`，並同步更新 `docs/debts/README.md` 索引表。
- [x] 單元測試驗證以 `00411A` 或 `3293` 查詢均能順利取出既有歷史日 K。

## Status
- [x] done
