# [Spec 0226 / Ticket 03] DividendMonthlyChart 幾何坐標對齊、scaleMax 口徑修復與生活費持久化

## 狀態
READY_FOR_AGENT

## 關聯規格
- Spec: `docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md`
- 關聯 Issue: #507

## 任務細節
1. 修改 `src/components/dividend/DividendMonthlyChart.tsx`：
   - 統一柱狀圖高度係數與生活費虛線係數為 `120px`。
   - 消除 `+26px` 魔術數字，錨定實體底座高度 `30px`，公式改為：
     `bottom = 30px + Math.round((targetMonthlyExpenseTwd / chartMaxVal) * 120)`。
   - 當 `displayVal === targetMonthlyExpenseTwd` 時，柱頂與虛線 0 像素誤差重合。4 月份 82,959 元顯著高過 60,000 元虛線。
   - 修復 `chartMaxVal`：在 `GROSS` 模式下正確依據 `maxMonthlyGross` 計算，防止分母溢出。
   - 生活費虛線設為 `zIndex: 0`（背景層），長條圖設為前景，解決虛線橫切長條破版問題。
2. 生活費目標持久化：
   - 將 `targetMonthlyExpenseTwd` 寫入/讀取 `localStorage` (`STOCK_TRACKER_DIVIDEND_TARGET_EXPENSE`)。
3. 更新 `DividendMonthlyChart.test.tsx` 覆蓋驗證。

