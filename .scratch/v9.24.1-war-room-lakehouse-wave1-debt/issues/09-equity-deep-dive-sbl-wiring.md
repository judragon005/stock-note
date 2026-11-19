# 09 — 個股 7 步深度投研彈窗借券餘額 (sblBalance) 接線

**What to build:** 擴充個股 7 步深度投研輸入契約與彈窗 Props 支援可選 `sblBalance`，由主力戰情室注入湖倉借券賣出餘額，並於深度投研第 2 步主力籌碼分析呈現借券空方壓力資訊。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 擴充深度投研輸入契約與彈窗介面新增 `sblBalance?: number`
- [ ] 主力戰情室傳遞湖倉 `sblBalance` 至深度投研彈窗
- [ ] 深度投研引擎第 2 步籌碼分析在有有效 `sblBalance` 時呈現借券餘額，缺值時優雅省略，並通過單元測試
