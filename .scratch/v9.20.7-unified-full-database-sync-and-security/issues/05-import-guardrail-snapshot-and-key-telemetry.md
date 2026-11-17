# 05 — 匯入安全防護、快照備份與金鑰留存遙測

**What to build:** 在執行覆蓋性匯入前，自動觸發 `IndexedDB` 交易層級之 `PRE_IMPORT_BACKUP` 快照；在匯入解析後，若目標環境無金鑰且封包有脫敏，在 UI 彈出醒目防護提示「API 金鑰已安全脫敏，請至系統設定輸入連線金鑰」，避免冷啟動後報價中斷困惑。

**Blocked by:** 04-cash-ledger-fidelity-and-loan-dividend-hydration

**Status:** completed

- [x] 在全態匯入執行前自動建立回滾快照至 LocalStorage / IndexedDB
- [x] 偵測 `isRedacted === true`，若本地設定缺少金鑰，主動標註「金鑰已脫敏保護」
- [x] 整合 `securitySanitizer.ts` 深度校驗，攔截畸形或惡意結構注入
- [x] 單元測試驗證安全攔截與防護機制
