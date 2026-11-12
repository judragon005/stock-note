# [Spec 0226 / Ticket 04] 0056 官方發放日 11/11 補入與 FinMind CashDividendPaymentDate 映射貫通

## 狀態
READY_FOR_AGENT

## 關聯規格
- Spec: `docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md`
- 關聯 Issue: #507

## 任務細節
1. 修改 `src/engine/receivableDividendEngine.ts`：
   - 在 `OFFICIAL_TW_PAY_DATE_MAP` 常態庫補入：
     `'0056:2026-10-22': '2026-11-11'`
   - 確保 0056 待入帳日顯示為 `2026-11-11`，標籤亮起綠色 `[官方公告]`。
2. 修改 `src/engine/corporateActionScanner.ts`：
   - 在 `fetchFinMindCorporateActions` 中，提取 `item.CashDividendPaymentDate` 賦值予 `RawCorporateEvent.payDate`。
   - 貫通日後台股所有股票與 ETF 的原生官方發放日自動映射，告別手動維護。
3. 更新 `receivableDividendEngine.test.ts` 確保 0056 與官方對照字典 100% 綠燈。

