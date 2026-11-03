# 16 — 雙層戰情架構──頂部作戰 HUD 組件 (Action Directives HUD)

**What to build:**
解決交易員在 4 套看板間垂直滾動、認知超載的痛點：
1. 建立 `src/components/muscleBooker/subcomponents/ActionDirectivesHUD.tsx`。
2. 橫向對稱整合「今日買進先鋒 Top 3」與「在庫賣出停損看板」：
   - 頂部第一眼呈現當天最急迫的操作動詞，消滅過往滾動 10~15 秒才能看完關鍵資訊的決策延遲。
3. 支援一鍵快速定位至下方數據表格對應列。
4. 撰寫組件單元測試驗證買進先鋒與賣出看板在空狀態與滿載時的渲染。

**Blocked by:** Ticket 15

**Status:** open

- [x] 建立 `ActionDirectivesHUD.tsx`
- [x] 左右水平對齊渲染「🟢 今日買進先鋒」與「🔴 在庫賣出停損」
- [x] 支援空狀態正向防護盾（無賣出訊號時顯示持股安全綠盾）
- [x] 編寫組件測試驗證買賣看板渲染正確

