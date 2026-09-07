# Ticket 04: 在庫持倉時序法人數據注入與 Tooltip 浮窗張數動態跳動

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:ui-enhancement`
- **領域**：`area:ui`
- **優先級**：`priority:high`
- **分流標籤**：`ready-for-agent`

## 需求描述
1. 在 `ChipsWorkspace.tsx` 生成 `histFlows` 時，動態計算並注入各日（T-4, T-3, T-2, T-1, T）對應的 `foreignNetShares`、`trustNetShares`、`dealerNetShares`。
2. 在 `SmartMoneyBubbleChart.tsx` 中，將 `formatInstitutionalDetailText` 改為接收當前影格資料 `activeFrameData`，使 Tooltip 底部的法人張數隨播放進度真實跳動，不再死鎖在最後一天。

## 驗收條件
1. 時間軸切換日期時，Tooltip 底部的外資、投信、自營商張數即時更新。
2. 美股標的 CMF 流向數值隨影格同步跳動。
