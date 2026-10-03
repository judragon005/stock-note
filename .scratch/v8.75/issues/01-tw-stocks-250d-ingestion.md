# 01 — 台股 2,361 檔歷史 CSV 250+ 交易日日 K 批次入庫模組

**What to build:** 建立/升級日 K 批次入庫模組，自本機歷史庫（2,361 檔）讀取真實日 K，解除 60 根截斷限制，將最近 250~300 個交易日真實日 K 以交易事務批量寫入 SQLite `daily_candles`，原生支援 MA250（年線）與全年度指標。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 升級 `scripts/market-sync/backfill-local-csv.cjs` 中的 SQLite 日 K 入庫邏輯，支援 250~300 根交易日
- [x] 撰寫單元測試驗證台積電 (2330) 與元大台灣50 (0050) 入庫後日 K 筆數 `>= 250`
- [x] 確保交易事務批次寫入時間在可接受範圍內且日 K 升冪對齊
