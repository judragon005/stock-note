# 04 — 實作在庫持股除息日與重大公司行動自動匯流 (src/utils/catalystStorage.ts)

**Parent:** #281

**What to build:**
打破宏觀日曆與個人庫存的孤島，自動將投資人手中持股之即將除息與配息日程合流至倒數雷達：
1. 實作純函式 `mergeHoldingsDividends(baseCatalysts, receivableDividends, asOfDate)`。
2. 傳入 `ReceivableDividend[]`（來自 `receivableDividendEngine.ts`），篩選未來 30 天內即將除息的在庫標的（例如台積電 2330、00878 等）。
3. 將其自動封裝為 `UpcomingCatalyst` 格式：
   - `id`: `div-${item.symbol}-${item.exDividendDate}`
   - `name`: `${item.symbol} ${item.name} 除息`
   - `date`: `item.exDividendDate`
   - `category`: `'EARNINGS_DIVIDEND'`
   - `impact`: `'MEDIUM'`
   - `symbol`: `item.symbol`
   - `description`: `預估配息每股 ${item.estimatedDividendPerShare} 元，預計入帳日 ${item.payDate || '待公告'}`
4. 合併至催化劑清單並依日期重新升冪排序與去重。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 傳入台積電 2330 之除息紀錄（除息日為 10 天後），能正確被轉換為 `EARNINGS_DIVIDEND` 事件。
- [ ] 已過期（除息日在基準日前）或非在庫持股的除息事件會被自動過濾。
- [ ] 撰寫單元測試驗證轉換正確性與排序去重邏輯。
