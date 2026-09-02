# Issue 01: Tooltip 靠左對齊防截斷與邊界排版強化

## 狀態
`COMPLETED`

## 說明
持股膠囊位於清單最左側，預設 `align="center"` 導致 Tooltip 向左溢出螢幕。本票券要求將定調徽章與膠囊 Tooltip 統一設為 `align="left"` 與 `position="top"`，徹底杜絕文字截斷。

## 驗收條件
- [x] 將滑鼠移至持股名稱下方的定調徽章與各膠囊時，Tooltip 自膠囊左緣開始往右側開展。
- [x] 在小螢幕或表格滾動邊緣無文字截斷。
