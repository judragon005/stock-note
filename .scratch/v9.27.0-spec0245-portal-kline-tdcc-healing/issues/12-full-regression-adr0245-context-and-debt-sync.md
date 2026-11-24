# 12 — 全量測試／建置回歸驗收、ADR 0245、領域詞彙表與 14 彈窗技術債同步

**Parent:** #605 (Spec 0245)

**What to build:** 執行全專案單元測試、架構適應度守門、戰情室字級對比度守門與 TypeScript／Vite 生產建置零錯誤驗收；同步建檔 **ADR 0245**、於根目錄 `CONTEXT.md` 補錄三項新領域術語（Viewport-Portaled Modal Shell、Regime-Gated Technical Resonance、Calendar-Anchored TDCC Gap Healing），並於技術債目錄登記其餘 14 顆舊彈窗漸進遷移至 `ModalShell` 之追蹤項目，備妥跨家族 `/code-review` 與 PR 交付包。

**Blocked by:** 02 — ExportDatabaseModal 視口置中遷移與全站 .modal-backdrop 靜態守門, 07 — 主力戰情室 ZONE 01 雙向聯動整合（Card 18 → Card 01 → Card 01B）與 ADR 0244 防回歸, 10 — Card 19 真實 28 天日曆窗大戶變動計算與斷層虛線誠實視覺化, 11 — 核心持股 21 檔 + 2344 集保 12 週批次補齊與散戶口徑湖倉校正

**Status:** ready-for-agent

- [ ] 全專案 `npm test` 100% 綠燈通過（含 4 大 Test Seams、架構適應度守門與字級底線）
- [ ] `npm run build` 達成 TypeScript 0 錯誤與 Vite 生產建置成功（外部套件增量 0 KB）
- [ ] 完成 **ADR 0245** 建檔並更新 `CONTEXT.md` 領域術語與 ADR 索引
- [ ] 於技術債目錄登錄其餘 14 顆舊彈窗漸進遷移至 `ModalShell` 之結構化追蹤債券並更新索引
