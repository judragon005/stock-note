# 01A — Card 19 台股標的確認與散戶持股剪刀差 (Retail Scissors Ratio)

**Parent:** #290

**What to build:**
戰情室 Card 19 (TDCC 集保趨勢) 標題顯式綁定當前標的確認（`CARD 19 · {symbol} TDCC 集保趨勢`），杜絕靜態假圖誤會；同時讀取本地已有的 `tw_tdcc_distribution` 資料庫中的 `under_10_ratio`（10 張以下散戶持股比），與千張大戶持股比交叉比對，計算並標註「大戶增持 vs 散戶退場」之剪刀差籌碼狀態。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] Card 19 標題明確包含當前查詢標的代碼（例如 `0050` 或 `2330`）。
- [x] 整合 `under_10_ratio` 散戶持股比，當千張大戶增持且散戶減少時，標註「大戶增持·散戶退場 (籌碼集中)」剪刀差狀態。
- [x] 既有雙軸 SVG 集保走勢圖正常呈現，單元測試通過。
