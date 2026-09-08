# Issue 01: 肌肉書僮市場篩選連動與美股標的池隔離

## 狀態
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`feature`, `ui`

## 需求
1. `App.tsx` 傳遞 `currentMarket` 至 `MuscleBookerWorkspace`。
2. `MuscleBookerWorkspace` 內部根據 `currentMarket`：
   - 篩選 `holdings`（US 僅保留 USD 或美股；TW 僅保留 TWD）。
   - 切換標的池：美股模式下切換美股焦點 Top 30 與「🏛️ 美股巨頭 Top 50」。
   - 按鈕標籤動態相應切換。
3. 杜絕美股模式下出現台股 50 大清單。

## 驗收條件
- 單元測試驗證美股模式下僅返回美股標的，台股模式下僅返回台股標的。
