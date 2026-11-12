# [Spec 0226 / Ticket 01] DividendCalendarCard 月曆卡片改為 3 列（3x4 Grid）、字體與金額放大優化

## 狀態
READY_FOR_AGENT

## 關聯規格
- Spec: `docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md`
- 關聯 Issue: #507

## 任務細節
1. 修改 `src/components/dividend/DividendCalendarCard.tsx`：
   - 將原本 `repeat(12, 1fr)` 網格改為 `repeat(4, 1fr)`（3 行 × 4 欄）。
   - 窄螢幕 `<768px` 支援自適應退回 `repeat(2, 1fr)`。
   - 內距由 `8px 4px` 放大為 `12px 14px`。
2. 字體層級升級：
   - 月份標籤放大至 `13px`（加粗白字）。
   - 預估金額放大至 `16px`（`tabular-nums`），並完整顯示金額（如 `NT$ 56,000`），不截斷為 `k`。
   - 枯水期標籤放大至 `11px`，升級為膠囊 Badge。
3. 更新 `DividendCalendarCard.test.tsx` 確保測試通過。

