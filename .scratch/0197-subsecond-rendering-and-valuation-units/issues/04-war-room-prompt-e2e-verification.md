# 04 — 端到端 Master Prompt 整合驗證與全套測試回歸

**What to build:**
針對華星光 4979 建立端到端整合測試，全面驗證生成之外聯 Master Prompt 包含官方真實 PE/PB、最新 2026-09 月營收、23.7% 外資佔比、循環股標籤與宏觀快取；執行全套測試套件確保 100% 綠燈，`npm run build` TypeScript 0 錯誤。

**Blocked by:** Ticket 01, Ticket 02, Ticket 03

**Status:** ready-for-agent

- [ ] 在 `src/engine/warRoomPromptE2E.test.ts` 新增華星光 4979 完整 Master Prompt 測試
- [ ] 執行 `npm test` 確認全部通過
- [ ] 執行 `npm run build` 確認 TypeScript 0 錯誤
