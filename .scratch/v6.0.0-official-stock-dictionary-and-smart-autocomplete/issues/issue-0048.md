# 主看板：PRD #0048 台股與美股本地官方股票名稱字典庫、全域解析與智慧自動補齊系統

## 🎯 迭代目標
建立完整的本地股票名稱字典庫（TWSE/TPEx 全量台股 2,000+ 檔與美股熱門標的 500+ 檔），結合 IndexedDB 持久化快取、TWSE/TPEx 官方 OpenAPI 一鍵同步、交易表單雙向即時檢索與自動帶入，以及全站全域一致繁中名稱解析。

---

## 📋 任務看板 (Task Board - Triaged)

| 票券 ID | 任務名稱 | Triage 標籤 | 優先級 | 狀態 | 負責模組與相依性 |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **#01** | [01-static-stock-dictionary-and-data-models.md](01-static-stock-dictionary-and-data-models.md) | `ready-for-agent` | P0 | ✅ DONE | `src/data/stockDictionary.ts` (無相依) |
| **#02** | [02-stock-name-resolver-and-indexeddb-cache.md](02-stock-name-resolver-and-indexeddb-cache.md) | `ready-for-agent` | P0 | ✅ DONE | `stockNameResolver.ts`, `storage.ts` (相依 #01) |
| **#03** | [03-trade-modal-smart-autocomplete-and-form-ux.md](03-trade-modal-smart-autocomplete-and-form-ux.md) | `ready-for-agent` | P0 | ✅ DONE | `TradeModal.tsx` (相依 #01, #02) |
| **#04** | [04-settings-openapi-sync-and-full-regression.md](04-settings-openapi-sync-and-full-regression.md) | `ready-for-agent` | P0 | ✅ DONE | `stockDictionarySync.ts`, `SettingsWorkspace.tsx` (相依 #01-#03) |

---

## 驗收指標 (Definition of Done)
- [x] 1. 內建全量台股（TWSE/TPEx 2,000+ 檔）與美股精選（500+ 檔）繁體中文靜態種子資料庫。
- [x] 2. `resolveOfficialSecurityName` 升級支援動態與靜態字典庫，全站視圖（庫存、歷史、Treemap 等）一致顯示繁中名稱。
- [x] 3. `TradeModal` 交易表單支援輸入代碼自動帶入名稱，且下拉清單支援代碼與中文名稱雙向檢索。
- [x] 4. 設定頁提供「一鍵同步臺灣證交所與櫃買中心官方清單」與狀態展示。
- [x] 5. 全專案單元測試 100% 通過 (320 tests passed)，TypeScript 構建 0 錯誤。
