# Ticket 03: 影格提取純函數 (getTemporalBubbleFrameData) 法人張數動態抽取與診斷連動

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:bugfix`
- **領域**：`area:engine`
- **優先級**：`priority:high`
- **分流標籤**：`ready-for-agent`

## 需求描述
在 `src/engine/smartMoneyEngine.ts` 中：
1. `calculateSmartMoneyFlowDynamics` 在產生 `trail` 陣列時，將輸入項目的 `foreignNetShares`、`trustNetShares`、`dealerNetShares`、`cmf` 轉換並記錄至各影格點。
2. `getTemporalBubbleFrameData` 從當前影格 `trailPoint` 提取該日的法人張數與 CMF，並傳入當日實質淨流向金額以重新評估生活化診斷。

## 驗收條件
1. `getTemporalBubbleFrameData` 在不同的 `dateIndex` 時回傳該日對應的特定法人張數。
2. 相關單元測試完整覆蓋並通過。
