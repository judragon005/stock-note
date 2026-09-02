# 01 — 解除 2890 永豐金硬編碼過濾與除權股票股利精準捕獲 (Unrestricted Stock Dividend & 2890 Scanning)

**What to build:** 
徹底移除 `corporateActionScanner.ts` 中對 2890 永豐金 2026 年度除權事件的硬編碼過濾代碼。在官方備援庫中完整登錄 2890 永豐金 2026-07-23 除權 0.02（每千股配 20 股，預計 2026-08-24 發放），並將 `isAlreadyRecorded` 判定調整為精確比對行動類型與除權基準日（相差 ≤ 7 天），確保除權股票股利 100% 納入待補登清單。

**Blocked by:** None — can start immediately.

**Status:** RESOLVED

- [x] 移除 `corporateActionScanner.ts` 內 `if (!(symbol.toUpperCase() === '2890' && d.startsWith('2026')))` 歷史過濾。
- [x] 官方重大除權息日曆新增 2890 永豐金 2026-07-23 配息 1.10 與配股 0.02 官方數據。
- [x] 線上事件合併時自動自備援庫回填缺失之 `payDate` 與公告說明。
- [x] 調整 `isAlreadyRecorded`，杜絕同年度其他配股導致新除權事件被誤殺。
- [x] 單元測試驗證 31,000 股持股精準掃描出配股 620 股（發放日 2026-08-24）。
