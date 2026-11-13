# [Spec 0226 / Ticket 05] 除息填息判定傳參 Bug 修復、質押利差連通與 Zavy 動態活水轉向

## 狀態
READY_FOR_AGENT

## 關聯規格
- Spec: `docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md`
- 關聯 Issue: #507

## 任務細節
1. 修改 `src/components/dividend/DividendHistoryTable.tsx`：
   - 修復 `determineDividendFillStatus` 呼叫端 Bug：禁止將 `holding.avgCost` 當作 `exPrice` 傳入。改為正確傳入除息前基準價或標的現價差額，徹底修正只要持股獲利就被誤標「實質填息」的錯誤。
2. 修改 `src/components/DividendLogView.tsx`：
   - 串接 `src/engine/cashLedgerEngine.ts`，計算質押融資利息支出並傳入 `DividendKpiSummary` 之 `estimatedLoanInterestTWD`，激活真實淨利差。
   - 串接 `src/engine/zavySlowWealthEngine.ts`，將原本寫死的靜態字串改為動態總經活水轉向指引（純公債 00687B 與黃金 00635U 增量對沖）。

