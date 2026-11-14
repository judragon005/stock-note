# 05 — 全路徑整合回歸測試與端到端驗收防護 (End-to-End Regression Guard & Quality Audit)

**Parent:** https://github.com/judragon005/stock-note/issues/539

**What to build:**
建立全域整合與回歸測試，覆蓋本次重構的所有使用者路徑（包含：清倉股票查看填息膠囊、未來預約交易在行事曆顯示並一鍵入帳、美股 VT 換算與時態標籤檢視），確保 TypeScript 0 錯誤、`npm test` 100% 綠燈通過、無任何孤兒資料或畫面分裂。

**Blocked by:** 02 — 股利歷史表格四態膠囊完整渲染與防隱形防禦, 04 — 現金流時態標籤解耦與各月份長條圖口徑清晰化

**Status:** ready-for-agent

- [ ] 執行全量單元與整合測試（`npm test`），確保 100% 通過
- [ ] 執行 `npm run build`，確保 TypeScript 0 錯誤
- [ ] 驗證全域操作無任何隱形膠囊、無雙軌分裂
