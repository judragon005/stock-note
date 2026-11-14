# Spec 0230 Mirror: 股利現金流全域同態收縮、時序因果阻斷、跨境稅制隔離與自然鍵防撞規格書

完整規範請參閱：[docs/specs/0230-dividend-cashflow-global-scoping-chrono-decoupling-and-tax-isolation-spec.md](../../docs/specs/0230-dividend-cashflow-global-scoping-chrono-decoupling-and-tax-isolation-spec.md)

## 核心任務清單 (Task Checklist)

- [ ] Task 1: 在 `dividendAggregator.ts` 中改造 `extractHistoricalPayoutMonths`，加入 `payDate <= currentDateStr` 門禁。
- [ ] Task 2: 在 `dividendAggregator.ts` 中改造 `buildUnifiedPendingReceivables`，改用 `Market_Symbol_ExDate` 自然鍵去重。
- [ ] Task 3: 在 `dividendAggregator.ts` 中擴充 `aggregateDividendReport`，輸出 `currentYearTwDividendsTWD`。
- [ ] Task 4: 在 `projectedCashflowEngine.ts` 中擴充 `DEFAULT_DIVIDEND_PROFILES`（納入 2344 華邦電常態 8 月發放）。
- [ ] Task 5: 在 `DividendLogView.tsx` 中建立 `scopedHoldings` 與 `scopedLoans`，同態收縮所有輸入流。
- [ ] Task 6: 在 `DividendLogView.tsx` 中將 `activeReceivables` 傳入 `aggregateDividendReport`，解決長條圖待入帳脫節。
- [ ] Task 7: 在 `DividendLogView.tsx` 中修復 `annualReconciliationList`，加入 `payDate <= todayStr` 門禁。
- [ ] Task 8: 在 `DividendLogView.tsx` 中將 `currentYearTwDividendsTWD` 傳入 `taxStats`，隔離美股所得。
- [ ] Task 9: 在 `DividendHistoryTable.tsx` 中為 YOC 加入年化乘數，並優先調用 `trade.exchangeRate`。
- [ ] Task 10: 在 `DividendCalendarCard.tsx` 中為自訂生活費加入數值邊界防禦。
- [ ] Task 11: 撰寫全量單元測試驗證上述 10 大項目，確保 `npm test` 100% 通過。
