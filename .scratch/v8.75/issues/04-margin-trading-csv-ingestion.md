# 04 — 591 檔融資融券全歷史 CSV 解析與入庫模組

**What to build:** 解析 `CHIPS_DIR` 下 591 檔 `_融資融券全歷史數據.csv`，將最近 250 日之融資買賣超、融資餘額、融券餘額批量更新至 `tw_institutional_chips` 對應欄位。

**Blocked by:** 03 — 642 檔三大法人全歷史 CSV 解析與入庫模組

**Status:** done

- [x] 撰寫融資融券 CSV 解析模組，解析融資餘額、融券餘額與買賣張數
- [x] 批量更新至 `tw_institutional_chips(margin_balance, short_balance)`
- [x] 撰寫測試驗證 2330 之資券餘額資料完整性
