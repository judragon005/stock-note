# 02-tw-volume-unit-alignment-lots-conversion

## Description
修復 `src/engine/aiForceDashboardEngine.ts` 中將台股歷史日 K 本地 CSV 之「成交股數」直接填入 UI 面板當作「成交量(張)」顯示，導致 0050 與全市場 2361 檔標的成交量數值被放大 1000 倍的嚴重單位錯置缺陷。

## Acceptance Criteria
- [x] 在 `src/engine/aiForceDashboardEngine.ts` 的 `generateAiForceReportFromCandles` 與相關邏輯中，針對台股市場（`market === 'TW'`），當頂部 Bar 單位為「張」時，成交量數值必須精確換算為 `Math.round(rawVolume / 1000)`。
- [x] 針對美股市場（`market === 'US'`），成交量維持以「股」為單位，使用原始 `rawVolume` 數值。
- [x] 驗證 0050 於 2026-10-02 之成交量由 `68,606,769` 正確修正為 `68,607` 張。
- [x] 於 `src/engine/aiForceDashboardEngine.test.ts` 與 `src/engine/zeroMockPolicy.test.ts` 中新增單元測試，斷言台股與美股的成交量單位轉換邏輯正確無誤。

## Status
- [x] done
