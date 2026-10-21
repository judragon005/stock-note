# 02 — 解決歷史序號斷層、目錄去重整併與根目錄淨化

**Parent Issue:** #220
**Parent Spec:** [Spec 0178](file:///d:/APP/股票紀錄/docs/specs/0178-documentation-integrity-audit-broken-links-repair-and-linter-spec.md)

**What to build:**
解決目錄分裂、歷史斷層與根目錄雜物污染：
1. **0153 斷層備忘標記**：
   - 建立 `docs/specs/0153-SKIPPED-MILESTONE.md`：記錄 Commit `4d85319` 時因需求序號誤判直接跳至 0154，此號碼保留為歷史空號。
   - 建立 `docs/adr/0153-SKIPPED-MILESTONE.md`：標記狀態為 RESERVED / SKIPPED。
2. **目錄整併去重**：
   - 將 `docs/handover/0069-full-project-ui-ux-design-system-and-modern-glassmorphism.md` 移動至 `docs/handoff/`。
   - 將 `docs/handover/0070-trade-history-table-layout-and-pagination.md` 移動至 `docs/handoff/`。
   - 將 `docs/handover/0071-color-theme-toggle-label-and-tooltip-ux.md` 移動至 `docs/handoff/`。
   - 徹底移除空的 `docs/handover/` 目錄。
3. **根目錄雜物歸檔與 LICENSE 補齊**：
   - 將根目錄 `stock_trades_backup_2026-10-09.json` 移入 `docs/json/stock_trades_backup_2026-10-09.json`。
   - 於專案根目錄建立 `LICENSE`（標準 MIT License 條款，Copyright 2026 judragon005）。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] `docs/specs/0153-smart-strategic-prompt-engine-and-workspace-generator-spec.md` 與 `docs/adr/0153-smart-strategic-prompt-engine.md` 存在，使 0001~0178 無任何編號中斷。
- [x] `docs/handover/` 目錄已被完整清除，0069~0071 移至 `docs/handoff/`。
- [x] 根目錄無殘留 json 備份檔，資料安全收斂於 `docs/json/`。
- [x] 根目錄 `LICENSE` 存在，消除 README 的 MIT License 404 斷鏈。
