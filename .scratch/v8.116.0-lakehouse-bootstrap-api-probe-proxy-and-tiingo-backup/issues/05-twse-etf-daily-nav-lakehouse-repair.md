# 05 — 證交所 ETF 每日淨值與折溢價湖倉修復 (消滅 0 筆)

**Category:** bug
**Status:** closed
**Blocked by:** None — can start immediately

**What to build:**
使用者在戰情室與 ETF 儀表板檢視 ETF 折溢價時，不再是一片空白（0 筆）。修復證交所 `all_etf.txt` 解析邏輯，正確解包官方巢狀結構並精確映射代碼、市價、淨值 (NAV) 與折溢價率，成功將真實資料入庫 SQLite `etf_daily_nav` 資料表。

**Acceptance criteria:**
- [x] 重構 `scripts/market-sync/ingest-macro-sentiment.cjs` 之 `parseTwseEtfNavResponse`
- [x] 支援解包證交所真實 `all_etf.txt` 之 `{ a1: [{ msgArray: [...] }] }` 結構
- [x] 欄位正確映射：`a=代碼, e=市價, f=官方淨值(NAV), g=折溢價率(%)`
- [x] 執行同步後 `etf_daily_nav` 資料表成功寫入全市場 ETF 淨值且大於 0 筆
- [x] 編寫解析與入庫單元測試確保回歸防護

