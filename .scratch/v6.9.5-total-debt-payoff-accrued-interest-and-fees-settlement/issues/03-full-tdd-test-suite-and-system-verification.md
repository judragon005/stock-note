# 03 — TDD 單元測試套件完備化與全系統驗證

**What to build:** 
為全額借款負債（本利和+規費）計算與一鍵結清邏輯建立完整單元測試，並驗證全系統型別與測試綠燈：
1. **`cashLedgerEngine.test.ts` 測試擴充**：
   - 驗證 `calculateOverallLeverageMetrics` 涵蓋多筆借款、質押規費、跨幣別匯率、計息天數推進下的負債總額與 NAV 精確性。
   - 驗證零負債與結清後負債歸零之邊界條件。
2. **`riskExposureEngine.test.ts` 測試對齊**：
   - 驗證 `calculatePortfolioExposure` 在本利和規費負債下計算之槓桿等級與淨資產。
3. **全系統測試與構建驗證**：
   - 執行 `npm test` 確保全部測試 100% 通過。
   - 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤。

**Blocked by:** Ticket 01, Ticket 02

**Status:** completed

- [x] 在 `cashLedgerEngine.test.ts` 新增借款本利和規費負債計算測試
- [x] 在 `riskExposureEngine.test.ts` 更新並補強曝險負債測試
- [x] 本地執行 `npm test` 與 `npm run build` 全量通過
