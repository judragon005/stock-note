# 11-ingest-tw-ex-dividend-official-pipeline

## Description
撰寫後端定時抓取腳本 `scripts/market-sync/ingest-tw-corporate-actions.cjs`，自動由台灣證券交易所（TWSE）官方 OpenAPI (`TWT48U`) 與櫃買中心（TPEX）官方 OpenAPI 拉取未來 30 天內全市場除權除息預告表，去重後寫入 Lakehouse `corporate_action_calendar`。

## Target Files
- `scripts/market-sync/ingest-tw-corporate-actions.cjs`
- `scripts/market-sync/sync-tw-market.cjs`

## Acceptance Criteria
- [x] 實作請求 TWSE `https://openapi.twse.com.tw/v1/exchangeReport/TWT48U`（除權除息預告表，無需 Key）。
- [x] 實作請求 TPEX `https://www.tpex.org.tw/openapi/v1/tpex_mainboard_ex_dividend`（上櫃除權息預告，無需 Key）。
- [x] 清洗官方欄位：民國年轉換為西元年（YYYY-MM-DD）、去除逗號、格式化每股配發現金股利與股票股利。
- [x] 寫入 SQLite 時使用 `INSERT OR REPLACE` 實現冪等性（Idempotency）。
- [x] 整合進 `sync-tw-market.cjs` 每日定時任務中，並加入執行結果審核記錄。

## Status
- [x] done
