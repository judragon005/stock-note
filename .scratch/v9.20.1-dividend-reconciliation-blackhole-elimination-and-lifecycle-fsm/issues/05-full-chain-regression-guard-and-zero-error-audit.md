# 05 — 全鏈路端到端回歸測試與 TypeScript 零錯誤驗證 (Full-Chain Regression Guard & Zero-Error Audit)

**What to build:**
為整個股利生命週期狀態機、持股回溯、一鍵入帳、卡片數值一致性進行全鏈路驗收與防禦性回歸審查。確保包含 0056 的除息與發放日情境、卡片數值閉環、以及使用者交互流程均有完備的 Vitest 測試覆蓋，並執行全專案 `npm test`（100% 通過）與 `npm run build`（TypeScript 0 錯誤）驗證，杜絕修復 A 破壞 B。

**Blocked by:**
04 — 歷史明細表待核實專區與一鍵確認入帳閉環 (Due Reconciliation Banner & Instant Settle Pipeline)

**Status:** done

- [x] 執行 Vitest 執行全量單元測試與整合測試，確保涵蓋 0056 待對帳情境。
- [x] 驗證全專案編譯：執行 `npm run build`，確保 TypeScript 零錯誤、零警告。
- [x] 執行 `npm test`，確保既有模組 100% 綠燈，無任何破壞性回歸。
- [x] 檢查 Git 工作區並驗證程式碼乾淨度。
