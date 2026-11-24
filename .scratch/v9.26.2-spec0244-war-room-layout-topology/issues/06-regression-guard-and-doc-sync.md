# 06 — 全域字級/建置回歸守門與 ADR / CONTEXT.md 領域文檔同步

**Parent:** #603 (Spec 0244)

**What to build:** 執行全量單元測試、戰情室字級對比度守門與生產建置零錯誤驗收，並同步建立本次佈局拓撲決策之 ADR 與更新領域模型文檔，備妥可發起 PR 合併的完整交付包。

**Blocked by:** 03 — Card 20 12 期配息無滑軌全展開與月配息（>12 期）溢位護欄, 05 — ZONE 04 左欄 15 緊湊定錨與 09 縱向拉高對齊底線

**Status:** ready-for-agent

- [ ] `npm test` 100% 綠燈通過（含 `WAR_ROOM_TYPOGRAPHY_FLOOR` 守門）
- [ ] `npm run build` 通過 TypeScript 0 錯誤與 Vite 生產建置
- [ ] 補齊對應 ADR 與 `CONTEXT.md` 戰情室佈局契約紀錄
