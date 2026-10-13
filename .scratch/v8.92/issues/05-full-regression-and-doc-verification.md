# Ticket 05: 全量迴歸測試、TypeScript 健全性與文檔完整性驗證 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - 全專案測試檔案
  - `docs/specs/0179-tdcc-card-stale-state-repair-and-dynamic-signals-multi-perspective-refactor-spec.md`
  - `docs/adr/0179-tdcc-card-stale-state-repair-and-dynamic-signals-multi-perspective.md`
  - `CONTEXT.md`

## 2. 需求描述 (Description)
1. **全量單元與整合測試**：
   - 執行 `npm test`，確保既有 210+ 測試檔案與本次新增之測試 100% 綠燈通過。
2. **生產環境建置驗證**：
   - 執行 `npm run build`，確保 TypeScript 0 型別錯誤，Vite 打包無異常。
3. **文檔完整性與死鏈驗證**：
   - 執行 `node scripts/verify-docs.cjs`，確保所有 Markdown 檔案超連結與 Spec/ADR 配對 100% 通過。

## 3. 測試縫隙 (Test Seams)
* 全自動 CI / CLI 腳本驗證。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0179 之 **AC 6**。
* [ ] `npm test` 100% 通過。
* [ ] `npm run build` 0 型別錯誤。
* [ ] `node scripts/verify-docs.cjs` 100% 通過。
