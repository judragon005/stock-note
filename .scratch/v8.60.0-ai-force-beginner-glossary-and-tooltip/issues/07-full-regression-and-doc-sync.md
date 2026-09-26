# 07 — 全量回歸驗證、ADR 補全與文檔同步 (Regression & Handoff)

**What to build:**
完成全模組掛載後的端到端驗證與文檔同步：
1. **全量單元測試驗證**：
   - 執行 `npm test`，確保所有既有卡片與新增之詞庫、Tooltip 測試 100% 綠燈通過。
   - 執行 `npm run build`，確保 TypeScript 0 型別錯誤。
2. **ADR 撰寫**：
   - 建立 `docs/adr/0147-ai-force-beginner-decision-glossary-and-tooltip.md`，詳述架構決策、防跑版策略與三段式決策設計。
3. **專案手冊與術語同步**：
   - 更新 `CONTEXT.md`，同步新增「新手白話決策字典 (Beginner Decision Glossary)」與「TermTooltip」領域術語。
   - 更新 `README.md`，登錄 Spec 0147 與 ADR 0147 進度。

**Blocked by:** 06-mount-row4-cards-and-task-views

**Status:** completed

- [x] `npm test` 100% 綠燈通過
- [x] `npm run build` 0 型別錯誤
- [x] 產出 ADR 0147
- [x] 同步 `CONTEXT.md` 與 `README.md`
