# 08 — 實戰一鍵下單、自選星號與動態多維排序快篩

**What to build:**
1. `MuscleStockCard.tsx` 右上角微圖標群組加入：
   - 「⚡ 一鍵下單」微按鈕：BUY 標的顯示綠色買進、SELL 或破線標的顯示紅色停損平倉，直通 `onQuickTrade`。
   - 「⭐ 自選星號」微按鈕：一鍵將標的加入/移除自選觀察名單，直通 `onToggleWatchlist`。
2. Header 搜尋列旁加入多維動態排序下拉選單：
   - 按風益比 (R-Multiple 降序)
   - 按量比 (Vol Ratio 降序)
   - 按防守緩衝距離 (Buffer % 升序 - 貼近防守優先)
   - 按今日漲跌幅 (%)
3. Header 新增 5 顆實戰快篩膠囊：`[🔥 爆量發動]`、`[⚡ 極致壓縮]`、`[🎯 高賠率]`、`[💼 在庫持股]`、`[🚨 瀕臨破線]`。

**Blocked by:** 07 — 在倉持股瀕臨破防雙重預警與大盤 Regime 真接通

**Status:** ready-for-agent

- [x] 卡片接入 `onQuickTrade` 與 `onToggleWatchlist`
- [x] Header 加入動態排序選單
- [x] Header 加入 5 顆實戰快篩 Chips
- [x] 單元測試驗證一鍵下單、加自選與多維排序過濾
