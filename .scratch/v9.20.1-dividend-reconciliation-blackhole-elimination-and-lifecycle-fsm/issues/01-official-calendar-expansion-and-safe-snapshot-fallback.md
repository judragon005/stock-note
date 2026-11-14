# 01 — 官方除息常態庫擴充與在席持股快照容錯防禦 (Official Calendar Expansion & Safe Snapshot Fallback)

**What to build:**
補齊主流高股息 ETF（0056、00878、00919、00713 等）於 `OFFICIAL_DIVIDEND_CALENDAR` 的官方除權息常態日曆庫（包含 2026-10-22 除息、2026-11-11 發放之 0056 收益分配事件）。同時在 `calculateReceivableDividends` 中為歷史在席持股快照加入安全回退防禦：當除息日前一日歷史交易推估股數因時序結算未及時產出時，若在席活躍持倉有在籍庫存，安全回退至在庫持股，徹底杜絕 `sharesHeld <= 0` 導致產出金額為 0 之幽靈應收記錄。

**Blocked by:**
None — can start immediately.

**Status:** done

- [x] 於 `src/engine/receivableDividendEngine.ts` 的 `OFFICIAL_DIVIDEND_CALENDAR` 增補 0056 官方除息事件 (exDate: 2026-10-22, payDate: 2026-11-11, price: 1.07)。
- [x] 補齊 00878、00919、00713 於 2026 年度之官方除息行事曆。
- [x] 於 `calculateReceivableDividends` 強化除息在席股數解析：當 `getHoldingsAsOfDate` 回傳 `<= 0` 但當前持倉部位大於 0 時，且除息日在在席有效時間窗口內，安全回退採納在庫持股。
- [x] 撰寫單元測試驗證 0056 在除息日與發放日之官方日曆解析正確，且持股股數大於 0。
