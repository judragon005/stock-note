# 03 — 多型封包識別解析器與相容相容性預覽

**What to build:** 建立 `archiveParser.ts` 具備多型自動探測引擎（支援 V2 Unified、舊版 V1 完整備份、純交易陣列），並升級 `EnhancedImportModal.tsx` 的預覽畫面，精準展現封包型態、六大實體筆數對照，若偵測到交易關聯之外鍵帳戶不存在，自動引導對齊或補建帳戶。

**Blocked by:** 01-unified-envelope-v2-schema-and-export-engine

**Status:** completed

- [x] 實作 `detectArchiveFormat(json)` 自動判別 `UNIFIED_V2`、`LEGACY_DB_V1` 或 `TRADES_ONLY`
- [x] 在 `EnhancedImportModal` Step 1 與 Step 3 識別 V2 封包並解構 payload
- [x] 增加外鍵懸空自動對齊邏輯，確保匯入後交易之 `accountId` 不發生孤兒參照
- [x] 單元測試驗證舊版與新版封包之平滑向下相容
