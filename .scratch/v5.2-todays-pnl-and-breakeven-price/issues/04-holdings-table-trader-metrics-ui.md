# Ticket 04: 持股清單「今日損益」與「保本價」交易員看板 (HoldingsTable Trader Metrics UI)

## 需求說明
- 修改 `src/components/HoldingsTable.tsx`：
  - 市價欄位增強：在單價與漲跌百分比旁，直接顯示「今日損益金額 (`todaysPnL`)」，支援紅綠色彩主題。
  - 成本欄位增強：在平均買進成本旁新增「保本價 Badge (Breakeven Price)」，標示計入稅費後的損益平衡出場價。
  - Tooltip 提示：懸停保本價時顯示稅費計算依據（例如：`「計入賣出證交稅與券商手續費折讓，賣出大於此單價方為真實獲利」`）。
  - 已平倉 (CLOSED) 標的或庫存為 0 時優雅隱藏或標記。
- 驗證各欄位寬度與在各螢幕解析度下的排版。

**Status:** done

- [x] 於 `HoldingsTable.tsx` 整合今日損益金額與保本價 Badge。
- [x] 加入詳細 Tooltip 說明。
- [x] 驗證排版美觀度與無障礙操作。
