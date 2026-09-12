# 05 — Holdings Table Activation & Regression Verification

**What to build:**
1. 在 `src/components/HoldingsTable.tsx` 針對「📊 財報穿透」按鈕補強點擊處理與日誌輸出。
2. 驗證點擊按鈕後彈窗正常浮動呈現，數據載入流暢。
3. 執行全量 `npm test`，確保 88 個測試檔案與 867+ 個單元測試 100% 通過。
4. 執行 `npm run build`，確保 TypeScript 零報錯與 Production bundle 正常建置。

**Blocked by:** 04-deep-audit-layer-styling-and-clipboard-refactor.md

**Status:** done

- [x] `HoldingsTable.tsx` 點擊回呼防禦性呼叫與日誌追蹤
- [x] 完整單元測試 100% 綠燈 (88/88 測試套件，867/867 測試通過)
- [x] `npm run build` 通過無報錯 (tsc 0 錯誤，Vite 成功打包)
