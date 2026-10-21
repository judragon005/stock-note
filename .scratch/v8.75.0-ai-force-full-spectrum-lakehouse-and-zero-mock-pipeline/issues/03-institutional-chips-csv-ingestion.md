# 03 — 642 檔三大法人全歷史 CSV 解析與入庫模組

**What to build:** 解析 `CHIPS_DIR` 下 642 檔 `_三大法人全歷史數據.csv`，截取最近 250 日之外資、投信、自營商買賣超，批量寫入 SQLite `tw_institutional_chips`，徹底終結法人表筆數為 0 的問題。

**Blocked by:** 01 — 台股 2,361 檔歷史 CSV 250+ 交易日日 K 批次入庫模組

**Status:** done

- [x] 撰寫三大法人 CSV 解析器，正確解析日期、股票代碼、外資/投信/自營商淨買賣超 (張)
- [x] 批量入庫至 `tw_institutional_chips`，以事務優化批次效能
- [x] 撰寫測試驗證 2330 於 `tw_institutional_chips` 具備 250 筆法人記錄
