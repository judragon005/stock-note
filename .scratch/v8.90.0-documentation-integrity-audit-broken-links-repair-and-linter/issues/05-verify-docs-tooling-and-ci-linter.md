# 05 — 建立文檔完整性與死鏈自動化守門機制 (verify-docs.cjs & lint:docs)

**Parent Issue:** #220
**Parent Spec:** [Spec 0178](file:///d:/APP/股票紀錄/docs/specs/0178-documentation-integrity-audit-broken-links-repair-and-linter-spec.md)

**What to build:**
建立永久性自動化守門防線，徹底杜絕文檔再次腐爛：
1. **建立 `scripts/verify-docs.cjs` 驗證器**：
   - 遞迴掃描全專案 `.md` 檔案（跳過 `node_modules`, `.git`, `dist`）。
   - 解析 Markdown 內部超連結，查核目標實體路徑是否存在。
   - 提取 `docs/specs/` 與 `docs/adr/` 編號，檢查 1:1 成對性（相容 SKIPPED 標記）。
   - 檢查 `docs/specs/` 檔案命名是否合規。
   - 遇有錯誤則輸出清晰錯誤報告並以非零 exit code 退出。
2. **註冊 package.json 指令**：
   - 新增 `"lint:docs": "node scripts/verify-docs.cjs"`。
3. **全量驗收測試**：
   - 執行 `npm run lint:docs`，確認全專案 0 錯誤通過。
   - 執行 `npm test`，確認 210 個測試套件與 1,553 個測試用例維持 100% 通過。
   - 執行 `npm run build`，確認 TypeScript 0 錯誤。
   - 確認 `git status` 工作區完全乾淨。

**Blocked by:** Ticket 01, Ticket 02, Ticket 03, Ticket 04

**Status:** ready-for-agent

- [x] `scripts/verify-docs.cjs` 已建置，程式碼簡潔、零第三方依賴。
- [x] `npm run lint:docs` 可一鍵執行並輸出 100% 綠燈報告。
- [x] `npm test` 與 `npm run build` 維持完全綠燈。
