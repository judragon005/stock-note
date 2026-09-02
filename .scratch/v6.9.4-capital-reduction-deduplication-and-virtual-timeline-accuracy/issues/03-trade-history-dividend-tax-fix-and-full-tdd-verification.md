# 03 — 歷史交易帳本台股股息結算金額重複扣稅修復與全量TDD驗證

**What to build:** 
修正 `TradeHistoryTable.tsx` 針對台股現金股利之結算金額呈現，並以 TDD 測試套件進行全量迴歸驗證：
1. **修復股息結算金額重複扣稅**：台股現金股利若已明確提供實收金額 `cashAmount`（已扣繳二代健保補充保費），直接取用 `cashAmount` 作為結算金額呈現，杜絕二次扣減 `tax`，使歷史交易帳本與台股現金流水帳 100% 吻合（如 9927 泰銘股息顯示 +NT$ 48,945）。
2. **全量 TDD 測試與構建驗證**：在 `corporateActionScanner.test.ts` 中建立涵蓋 TWSE 減資去重、虛擬時序扣減減資、減資後買回與次年配息之端到端測試，確保全案 386 題單元測試 100% 綠燈通過且 `npm run build` 0 錯誤。

**Blocked by:** 02 — 虛擬時序動態扣減減資股數與官方6位精準減資比率對齊

**Status:** completed

- [x] 在 `TradeHistoryTable.tsx` 中修復台股股息結算金額重複扣除 `tax` 的問題
- [x] 在 `corporateActionScanner.test.ts` 中新增減資去重與持股回溯配息計算之單元測試
- [x] 執行 `npm test` 確保 386 個測試全數通過，`npm run build` 0 TypeScript 錯誤
