# 04 — 台股擴展籌碼 (融資融券、借券賣出 SBL、當沖率) 串聯至每日定時同步

**What to build:** 
在 `scripts/market-sync/sync-tw-market.cjs` 中完整接入 `ingest-tw-extended-chips.cjs`。在每日 16:00 執行時，同步抓取 TWSE 融資融券彙總 (MI_MARGN)、借券賣出與還券 (TWT93U) 與當日沖銷統計 (TWTB4U)，連同三大法人 T86 一併持久化至 SQLite `tw_institutional_chips`。

**Blocked by:** 02-t86-and-extended-chips-field-mapping-repair.md

**Status:** done

- [x] 在 `sync-tw-market.cjs` 加入抓取 TWSE MI_MARGN、TWT93U、TWTB4U 之安全重試請求管線
- [x] 整合呼叫 `saveTwExtendedChipsToSqlite`，確保融資餘額、融券餘額、借券賣出餘額與當沖比率同步落庫
- [x] 撰寫整合測試 `tests/market-sync/tw-extended-chips-pipeline.test.ts` (實作於 `src/engine/twExtendedChipsPipeline.test.ts`)，驗證全量同步時四類指標皆有數值
- [x] 確保無資料日（如休市日）安全降級不拋錯
