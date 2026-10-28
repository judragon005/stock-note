# 06 — 首屏快取日 K 水合與 XIRR 匯率期末資產修復 (Lakehouse Hydration & XIRR Wiring)

**What to build:**
首屏冷啟動水合快取中已儲存之昨日收盤價與日 K 數據，保障離線損益與技術膠囊不降級。`calculatePortfolioXirr` 貫通傳遞 `fxMap`，期末終值納入現金結餘與負債，修正單筆入金扭曲。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 離線模擬載入時，個股技術膠囊依然能自快取水合昨日收盤價與日 K，不顯示破圖或降級空白
- [x] 美股全戶 XIRR 計算正確採用當前全域匯率折算，不再回退寫死之 32.0
- [x] XIRR 報酬率考量期末現金與負債，真實反映投資組合內部報酬
