# 04 — 端到端 TDD 與全專案防禦性回歸驗證 (End-to-End TDD & Regression Verification)

**What to build:**
建立公開測試縫隙驗證，涵蓋除息發放推算、排序比較器、永豐金與兆豐金實例檢驗，並進行全專案 45 個測試套件與 TypeScript 打包之無回歸驗證。

**Blocked by:** 03 — 入帳日期欄位主次並列展示 UI 系統

**Status:** closed

## 驗收標準 (Acceptance Criteria)
- [x] 在 `src/components/DividendLogView.test.ts` 新增第 3 節測試，驗證入帳日推算與排序正確性。
- [x] 先紅後綠：確認 2890 舊發放日紅燈被精確捕獲，修復後轉綠。
- [x] 專案全量 45 個測試檔案、491 項單元測試 100% 綠燈通過。
- [x] `npm run build` 成功完成，TypeScript 0 錯誤。
