# 06 — 全市場董監持股設質官方開放資料注水 (剷除 5 檔 Mock)

**Category:** bug
**Status:** closed
**Blocked by:** None — can start immediately

**What to build:**
使用者在戰情室與個股籌碼分析時，不再受制於寫死 5 檔（2330、1217 等）的 Mock 假資料。介接台灣證交所官方開放資料 `https://openapi.twse.com.tw/v1/opendata/t187ap11_L`，取得全體上市櫃 2,400+ 檔標的之真實董監事設質股數、持有股數與質押比例，並全量寫入 SQLite `tw_insider_pledge_records`。

**Acceptance criteria:**
- [x] 於 `scripts/market-sync/ingest-tw-pledge.cjs` 介接證交所 OpenAPI `t187ap11_L`
- [x] 支援批次解析全市場董監設質月報並正規化寫入 `tw_insider_pledge_records`
- [x] 徹底移除 `bootstrap-lakehouse-full.cjs` 等腳本中寫死的 5 檔常數 Mock
- [x] 實測入庫筆數達 2,000+ 筆真實數據
- [x] 撰寫爬取與資料庫清洗測試案例

