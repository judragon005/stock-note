# Ticket #1: [Data/Domain] 官方 21 檔標的名稱資料庫全面校準與歷史交易清理

- **狀態**: Completed
- **GitHub Issue**: [#88](https://github.com/judragon003/-/issues/88)
- **規格書**: [SPEC-0011](../../../docs/specs/0011-dual-accounting-mode-and-official-symbols-alignment.md)
- **架構決策**: [ADR-0011](../../../docs/adr/0011-dual-accounting-mode-and-official-symbols-alignment.md)

## 任務清單
- [x] 全面校對並更新 `docs/json/clean_trades_import_latest.json` 中所有標的名稱：
  - `00403A` ➔ `主動統一升級50`
  - `009816` ➔ `凱基台灣TOP50`
  - `00981A` ➔ `主動統一台股增長`
  - `009826` ➔ `貝萊德世界股票`
- [x] 同步更新 `CONTEXT.md` 與 `README.md` 領域名詞對照表。
- [x] 在 `src/utils/storage.ts` 中加入官方標的標準名稱映射表 (Official Security Name Map)，當使用者載入既有 localStorage 資料時，自動校準修正舊有或誤植的標的名稱。
- [x] 撰寫單元測試驗證 `storage.ts` 載入舊交易時能自動校準官方標的名稱。
