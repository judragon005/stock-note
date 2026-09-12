# 08 — Smart Money & Technical Confluence Hook

**What to build:** 
實作籌碼與技術面質變共振檢查 `evaluateChipsConfluence`。若技術評分 ≥ 70 分（偏多），但可選傳入的主力籌碼數據顯示近 5 日主力淨賣超或法人同步大賣時，輸出 `ALERT_CHIPS_DIVERGENCE`（籌碼背離：主力倒貨戒備），並給予 10 分的風險扣分。

**Blocked by:** 02 — ADX Chop Discount & Contradiction Penalty Scorer

**Status:** ready-for-agent

- [x] 在 `OmniScoreInput` 擴充可選籌碼欄位 `chipsContext`
- [x] 實作籌碼背離判定純函式
- [x] 單元測試驗證多頭均線遇主力連續賣超時觸發背離警示與適度降權
