# Ticket 02: 軌跡節點 (trail) 與時序流向 (historicalDailyFlows) 法人明細型別擴充

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:refactor`
- **領域**：`area:types`
- **優先級**：`priority:high`
- **分流標籤**：`ready-for-agent`

## 需求描述
在 `src/types/stock.ts` 中，為 `SmartMoneyBubbleData.trail` 與 `SmartMoneyInputItem.historicalDailyFlows` 擴充選用欄位：
`foreignNetShares?: number; trustNetShares?: number; dealerNetShares?: number; cmf?: number;`。

## 驗收條件
1. TypeScript 型別通過編譯檢查。
2. 既有單元測試向下相容。
