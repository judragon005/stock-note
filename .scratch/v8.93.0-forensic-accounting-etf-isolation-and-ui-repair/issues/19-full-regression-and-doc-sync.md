# Ticket 19: 全量自動化迴歸、領域手冊同步與最終驗收 (Full Regression)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - `README.md`
  - `CONTEXT.md`
  - `docs/specs/0180-stock-analysis-forensic-accounting-etf-isolation-and-ui-repair-spec.md`
* **驗收指令**：
  - `npm test`
  - `npm run build`
  - `npm run lint:docs`

## 2. 需求描述 (Description)
1. 執行全量自動化單元測試，確保 100% 綠燈無受損。
2. 執行 TypeScript 編譯檢查，確保 0 報錯。
3. 執行文件檢查 `npm run lint:docs`，確保無死鏈。
4. 同步更新 `README.md` 與 `CONTEXT.md` 領域術語與架構清單。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] `npm test` 100% 綠燈通過。
* [ ] `npm run build` 通過。
* [ ] 領域文檔同步完成。
