# T02: all_etf.txt 零新增請求衍生全市場 367 檔台股 ETF 實時 AUM 與初級市場淨申贖流
- 關聯 Issue: #596 / Spec 0241 / Debt 0061 #3
- 目標檔案: `scripts/market-sync/ingest-macro-sentiment.cjs`
- 驗收: `parseTwseEtfNavResponse` 解析 `c`/`d` 推導 `issuedUnits`, `unitChange`, `aumBillion` 並寫入 `etf_daily_nav`。
