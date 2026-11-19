# 06 — Expand：戰情室人體工學字級契約、Layer 6 雙欄矩陣與頂部 Bar 升級

**Parent:** #590 (Spec 0238)
**What to build:** 定義戰情室人體工學字級與對比度基準常數（最小字級 `12px / 0.75rem`，次要對比色 `#94a3b8` 取代 `#64748b`）；將 `AiForceDashboardView` 之 Layer 6 網格從擁擠 4 欄（`minmax(260px, 1fr)`）擴展為 2×2 雙欄大視野矩陣（`minmax(440px, 1fr)`）；並同步升級 `AiForceDashboardView`、`HeaderMarketBar`、`HeaderExportBar`、`TaskViewsSwitcher` 與 `WarRoomPromptCard` 中所有 `< 12px` 微字與暗灰文字。
**Blocked by:** None — can start immediately
**Status:** ready-for-agent

- [ ] 匯出 `WAR_ROOM_TYPOGRAPHY_FLOOR` 契約常數供全戰情室引用。
- [ ] Layer 6 (`data-layer="6-energy-sentiment"`) 網格升級為 `minmax(440px, 1fr)` 雙欄矩陣。
- [ ] `AiForceDashboardView`、`HeaderMarketBar`、`HeaderExportBar`、`TaskViewsSwitcher` 與 `WarRoomPromptCard` 中 `< 12px` 字級與 `#64748b` 文字清零。
- [ ] 既有測試與 `npm run build` 保持 100% 通過。
