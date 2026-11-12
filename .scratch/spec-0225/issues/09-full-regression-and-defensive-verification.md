# 09 — 全流程迴歸測試與防禦性驗證

**What to build:**
建立完整的單元與整合測試套件，涵蓋永豐金配股合併健保、ETF 23天時序推估、一鍵已入帳即時結算、質押利差抵沖、YOC 與填息標籤，驗證 `npm test` 100% 通過與 `npm run build` TypeScript 0 錯誤。

**Blocked by:** 08 — `DividendLogView.tsx` 極簡協調器收斂與 2×2 金融控制台排版

**Status:** ready-for-agent

- [ ] 補全 `DividendLogView.test.ts` 及各子組件專屬單元測試。
- [ ] 確保既有 35+ 個測試檔案無任何迴歸損壞，100% 綠燈通過。
- [ ] 確保 `npm run build` 驗證 TypeScript 零警告與零錯誤。

