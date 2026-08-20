# 01 — 事件流模型擴充與特殊公司行動會計核心 (Accounting Engine & Special Actions)

**What to build:**
擴充 `src/types/stock.ts`、`src/engine/calculator.ts` 與 `src/utils/storage.ts`。擴充 `TradeType` 支援 12 種交易與公司行動（新增 `STOCK_MERGER` 換股合併、`PREFERRED_REDEMPTION` 特別股贖回、`SPIN_OFF` 企業分拆、`CB_CONVERSION` 可轉債換股、`TENDER_OFFER` 公開收購）；在計算引擎中實作跨標的成本平移、分拆成本拆分、債券轉股數、減資自動縮股與損益結算；擴充 CSV/JSON 雙向解析，並撰寫 Vitest 單元測試確保 100% 通過。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] `TradeType` 擴充為 12 種型別，`TradeRecord` 擴充 `targetSymbol`, `allocationRatio`, `conversionPrice` 欄位。
- [x] 擴充純函式 `applyTradeToShares` 支援所有型別之股數異動計算。
- [x] 擴充 `calculateHoldingsAndSummary` 支援換股合併成本平移、分拆成本拆分、特別股/收購結算與 9927 現金減資縮股。
- [x] 擴充 `storage.ts` 支援 12 種型別之 CSV 匯出匯入與 JSON Schema 雙向驗證。
- [x] 撰寫 `calculator.test.ts` 與 `storage.test.ts` 單元測試覆蓋所有特殊事件與減資縮股。
