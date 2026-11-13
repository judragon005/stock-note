# [Spec 0226 / Ticket 02] 抽離 DividendTopContributorsCard 並於 DividendLogView 實踐 2/3 + 1/3 並列網格

## 狀態
READY_FOR_AGENT

## 關聯規格
- Spec: `docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md`
- 關聯 Issue: #507

## 任務細節
1. 自 `src/components/dividend/DividendHistoryTable.tsx` 抽離出獨立元件 `DividendTopContributorsCard.tsx`。
2. 在 `src/components/DividendLogView.tsx` 建立流式網格列：
   - 採用 `display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: stretch`。
   - 左側 2/3 放 `DividendMonthlyChart`。
   - 右側 1/3 放 `DividendTopContributorsCard`。
   - 行動端 `<900px` 自動退回單欄。
3. 確保高度自然等高（約 290px），且維持 10~12 月份長條 Tooltip 向左展開之避讓演算法，不遮擋右側卡片。

