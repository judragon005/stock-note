# 06 — 全鏈路回歸審計與自動化建置驗證 (Full Regression Audit & Build)

**What to build:**
建立針對五大財務審計問題的專屬整合測試套件，並執行專案全域單元測試與 TypeScript 編譯建置驗證，確保在解決 5 大財務視覺與數值缺陷的同時，專案 923 個單元測試維持 100% 綠燈，建置 0 錯誤。

**Blocked by:** 
- 01 — 成長率基期擴充與缺失基期平整化 (Growth Baseline Expansion & Flattener)
- 02 — 毛利成長率離群值視覺封頂防禦演算法 (Gross Profit Outlier Visual Capping)
- 03 — 真實 SVG 估值河流圖色帶引擎 (SVG Valuation River Bands Engine)
- 04 — 價值評估七大子分頁視圖重構與分流 (Seven Valuation Subtabs Redesign)
- 05 — 動態流通股數推導與 FCF Yield / DCF 估值修正 (Dynamic Shares, FCF Yield & DCF)

**Status:** ready-for-agent

- [x] 在 `src/engine/analysisMetricsAudit.test.ts` 新增審計測試案例，驗證 5 大核心問題全部獲得物理修復
- [x] 執行 `npm test` 確保 95 個測試檔案、923 個單元測試 100% 綠燈通過
- [x] 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤、打包輸出無異常
