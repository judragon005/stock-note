# Ticket 04: XIRR 現金流透視與收斂診斷彈窗 (`XirrDetailModal.tsx`)

## 需求說明
- 建立獨立元件 `src/components/XirrDetailModal.tsx`。
- 提供深色玻璃擬態 UI，展示選定標的或整戶的 XIRR 詳細分析：
  1. 關鍵指標看板：XIRR 年化報酬率、累積絕對報酬率、總投入本金、期末總值、歷時天數、數值迭代收斂次數與演算法狀態（Newton-Raphson / Bisection）。
  2. 現金流時序明細表：逐筆展示日期、事件類型（入金/出金/買進/賣出/股息/期末市值）、金額、幣別與各筆現金流在公式中的折現權重比例。
  3. 財務口徑說明與防呆提示（如持有未滿 30 天之非年化說明）。
- 在 `App.tsx`、`SummaryCards.tsx`、`HoldingsTable.tsx` 串接 Modal 開啟與關閉狀態。

**Status:** todo

- [ ] 實作 `src/components/XirrDetailModal.tsx` 元件與現金流時序表格。
- [ ] 實作數值收斂診斷卡片與權重比例可視化。
- [ ] 串接全域 Modal 控制狀態。
