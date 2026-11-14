# 06 — SSOT 應收股利與月度長條圖數據同源融合 (SSOT Unified Receivables into Reporting)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
統一報表聚合引擎與行事曆卡片的數據源，將 `DividendLogView` 調用 `aggregateDividendReport` 的輸入由未融合的 `scopedReceivables` 替換為融合去重後的單一事實來源 `activeReceivables`。使「除息待入帳行事曆面板」與「各月份現金流分佈長條圖」消費 100% 同源的待入帳數據，修復待入帳卡片有款項但對應月份長條圖待入帳柱狀圖顯示為 0 的畫面脫節 Bug。

**Blocked by:** 03 — 金融事件除息日自然鍵防撞去重協定

**Status:** ready-for-agent

- [ ] 在 `DividendLogView` 將 `report` 計算中傳入 `aggregateDividendReport` 的應收清單調整為 `activeReceivables`
- [ ] 驗證當本地有預約待入帳股利時，月度長條圖對應月份正確渲染橘色條紋柱狀圖
- [ ] 驗證待入帳卡片所列款項總額與長條圖待入帳總計 100% 平衡一致
- [ ] 更新 `src/components/DividendLogView.test.ts` 與長條圖渲染整合測試
