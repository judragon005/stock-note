# 02 — 三大法人 T86 欄位映射相容性修復與數值非零驗證

**What to build:** 
修正 `scripts/market-sync/market-sync-core.cjs`、`scripts/market-sync/ingest-tw-t86.cjs` 與 `scripts/market-sync/sync-tw-market.cjs` 間的鍵名不匹配缺陷。支援 `foreignNetShares` 與 `foreignNet`、`trustNetShares` 與 `trustNet`、`dealerNetShares` 與 `dealerNet` 雙向相容取值，杜絕日常同步數值被洗成 0。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 升級 `ingest-tw-t86.cjs` 的 `saveTwT86ToSqlite`，相容支援 `item.foreignNetShares ?? item.foreignNet` 等欄位名稱
- [x] 升級 `market-sync-core.cjs` 產出完整雙鍵相容物件
- [x] 撰寫單元測試 `tests/market-sync/t86-mapping.test.ts` (實作於 `src/engine/t86MappingRepair.test.ts`)，傳入包含負數買賣超物件，驗證入庫數值精確且非 0
- [x] 驗證台積電 (2330) 傳入範例資料入庫後能正確讀取外資淨買賣張數
