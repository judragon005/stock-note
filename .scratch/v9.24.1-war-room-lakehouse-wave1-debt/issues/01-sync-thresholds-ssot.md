# 01 — 湖倉 7 維健康度門檻常數 SSOT 收斂

**What to build:** 建立單一 `MARKET_HEALTH_THRESHOLDS` 常數模組作為湖倉 7 維欄位健康度判定之唯一事實來源，讓歷史回補腳本與市場新鮮度服務共同引用，消除跨檔魔術數字重複。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 匯出不可變之 7 維門檻常數（日 K、法人、融資、借券、當沖、估值、ETF 淨值）
- [ ] 歷史回補腳本與市場新鮮度服務移除本地門檻魔術數字，統一改為解構匯入
- [ ] 新增／通過單元測試驗證雙邊判定口徑 100% 一致
