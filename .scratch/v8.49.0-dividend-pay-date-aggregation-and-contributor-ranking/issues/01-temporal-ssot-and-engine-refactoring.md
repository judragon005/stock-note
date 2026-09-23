# 01 — 時序 SSOT 建立與股利統計聚合引擎重構 (Temporal SSOT & Aggregator Refactoring)

**What to build:**
1. 建立並導出統一時間解析函數 `getEffectiveDividendPayDate(trade: TradeRecord): string`：
   - 優先讀取顯式 `trade.payDate`。
   - 若無則透過 `estimatePaymentDate(trade.exDate || trade.date, trade.market)` 解析。
2. 擴充 `src/types/dividend.ts` 中的 `DividendSummaryReport`：
   - 新增 `currentYearGrossTWD: number;`（當年度應發毛額）。
   - 新增 `currentYearTaxTWD: number;`（當年度扣繳稅費/二代健保）。
3. 重構 `src/engine/dividendAggregator.ts` 核心迴圈：
   - 年度累計與 YoY：全面改用 `effectivePayDate.startsWith(currentYearStr)` 與 `effectivePayDate <= currentDateStr`，解決 2024 年底除息、2025 年初入帳之跨年漏計與偷跑問題。
   - 月度現金流分佈：全面改用 `parseInt(effectivePayDate.substring(5, 7), 10)`，徹底修復 7 月除息 8 月入帳被錯置於 7 月柱狀圖之缺陷。
   - TTM 近 12 個月滾動統計：改依 `effectivePayDate >= twelveMonthsAgoStr && effectivePayDate <= currentDateStr` 篩選，並套用 `resolveEffectiveDividendTaxAndNet` 完整計算稅費。

**Blocked by:** None — can start immediately.

**Status:** closed
- [x] 於 `dividendAggregator.ts` 實現並導出 `getEffectiveDividendPayDate`
- [x] 擴充 `DividendSummaryReport` 類型定義，納入 `currentYearGrossTWD` 與 `currentYearTaxTWD`
- [x] 將年度、去年同期、YoY 計算時序重構為 `effectivePayDate`
- [x] 將 1~12 月月度現金流分佈重構為 `effectivePayDate`
- [x] 重構 TTM 滾動現金流計算邏輯
