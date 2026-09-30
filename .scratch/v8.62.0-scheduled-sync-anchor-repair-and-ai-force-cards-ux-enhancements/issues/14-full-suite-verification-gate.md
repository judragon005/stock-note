# 14 — 全案 TDD 回歸與 TypeScript 0 錯誤驗證

**What to build:**
執行全案自動化驗證門禁，包含單元測試（`npm test` 全數通過）與 TypeScript 編譯檢查（`npm run build` 0 Error），驗證本地快取生成、Tooltip 穿透與視覺自適應響應性，確保整體程式碼品質高標準交付。

**Blocked by:** 04 — 前端快取熱載入與 IndexedDB 自動沉澱修復, 06 — 多字元輸入與響應式排版測試, 09 — 全站 15 張卡片 Tooltip 穿透無死角檢視, 11 — 熱力格柱列與圖例垂直均勻拉伸適配, 13 — 5 軸文字與數值字級放大 (10px ➔ 13px)

**Status:** ready-for-agent

- [ ] `npm test` 100% 通過。
- [ ] `npm run build` 0 錯誤。
- [ ] 端到端驗證五大痛點完全修復。
