# 03 — 全面修復全域 Markdown 死鏈、錯位與命名規範化

**Parent Issue:** #220
**Parent Spec:** [Spec 0178](file:///d:/APP/股票紀錄/docs/specs/0178-documentation-integrity-audit-broken-links-repair-and-linter-spec.md)

**What to build:**
徹底修復專案中累積的檔名不對稱、平移錯位與相對路徑死鏈：
1. **重命名 Spec 0171**：
   - 將 `docs/specs/0171-technical-debt-batch-cleanup-sync-checkpoints-and-api-key-manager.md` 重命名為 `docs/specs/0171-technical-debt-batch-cleanup-sync-checkpoints-and-api-key-manager-spec.md`。
2. **修復交接總手冊 (`docs/handoff/handoff_stock_tracker_final.md`)**：
   - 修正 Spec 0132～0135 平移錯位（0132 Scheduled Market Sync, 0133 Header Sync, 0134 Market History Backfill, 0135 Sync Badge Modal）。
   - 修正 Spec 0138 檔名拼寫（加入 `-market-`）。
   - 修正 Spec 0171 檔名對應。
   - 修正 ADR 0175 與 `.scratch/v8.87/issues/` 鏈結。
3. **修復架構核心文檔**：
   - `CONTEXT.md`：修正 ADR-0049 引用路徑為 `docs/adr/0049-ex-dividend-smoothing-and-dividend-log-architecture.md`。
   - `docs/specs/0151` 與 `docs/specs/0152`：修正 `../adr/0140-ai-force-decision-dashboard.md` 為 `../adr/0140-ai-force-decision-dashboard-architecture.md`。
4. **修復技術債文檔 (`docs/debts/`) 相對路徑**：
   - 將 0020~0029 等文檔中出現的 `[src/engine/...](src/engine/...)`、`[src/components/...](src/components/...)`、`[src/db/...](src/db/...)` 全數修復為包含 `../../` 之正確相對路徑。

**Blocked by:** Ticket 01, Ticket 02

**Status:** ready-for-agent

- [x] Spec 0171 具有規範之 `-spec.md` 後綴。
- [x] `handoff_stock_tracker_final.md` 內 17 處死鏈全數修復。
- [x] `CONTEXT.md`、Spec 0151/0152、`docs/debts/` 內死鏈歸零。
