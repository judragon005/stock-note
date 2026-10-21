# 02 — TWSE 除權息預告端點修復與全量除權息入庫

**What to build:**
1. 修正 `scripts/market-sync/ingest-tw-corporate-actions.cjs` 中的官方端點：由已廢棄並導向 404 之 `openapi.twse.com.tw` 替換為官方正式可用端點 `https://www.twse.com.tw/rwd/zh/exRight/TWT48U?response=json`。
2. 正確解析 TWSE 除權除息預告表格式（除權除息日期、股票代號、名稱、除權息、無償配股率、現金股利等）。
3. 批次寫入 Lakehouse SQLite `corporate_action_calendar` 表，消滅該表筆數為 0 的缺漏。
4. 驗證 Vite 中介層 `/api/market/corporate-actions/:symbol` 正常回傳已宣告之除權除息明細，不再回傳 404/空陣列。

**Blocked by:** None.

**Status:** done

- [x] 修正 `ingest-tw-corporate-actions.cjs` 資料來源 URL 為 `https://www.twse.com.tw/rwd/zh/exRight/TWT48U?response=json`
- [x] 支援 TWSE RWD 陣列格式解析
- [x] 執行入庫並驗證 `corporate_action_calendar` 筆數大於 0 (已成功寫入 25 筆)
- [x] 單元測試通過 (`src/engine/ingestTwCorporateActions.test.ts`)
