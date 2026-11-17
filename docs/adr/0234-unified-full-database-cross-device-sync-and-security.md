# ADR 0234: 全態資料庫封包 V2 跨端同步架構與 API 金鑰雙軌安全規範

## 狀態 (Status)
已採納 (Accepted)

## 背景與問題脈絡 (Context)
使用者在進行跨端（如本地開發機至家用 NAS 私有雲環境）資料遷移時，發現以下關鍵資料孤島與資料遺失問題：
1. **現金流水丟失 41 筆**：匯出端有 729 筆現金帳，匯入後僅剩 688 筆。根本原因在於原 `EnhancedImportModal` 僅處置股票交易紀錄，在確認匯入時透過 `syncTradesWithCashTransactions(finalTrades, prev)` 僅根據 696 筆交易逆向推導交割款（688 筆），非交易類手動出入金、跨行轉帳、利息與融資借貸流水遭破壞性覆蓋。
2. **待發放股利遺失 1 筆**：匯出端有 2 筆待發放股利，匯入後僅剩 1 筆。因為待發放股利強依賴於 `corporateActions` 快取，NAS 冷啟動時資料庫為空，無法即時除權息平滑補償。
3. **券商交割帳戶設定清空**：舊版 Header JSON 匯出僅匯出純交易陣列，遺失了 `brokerAccounts` 自訂帳戶資料。
4. **不限用途款項借貸合約丟失**：股票質押與借貸合約未納入舊版資料庫備份鏈。
5. **API 金鑰資安風險**：跨裝置備份時，FinMind / FMP 等 API 金鑰若未經授權即明文導出，易隨 JSON 檔案外洩；但若直接強制抹除，家用私有雲/NAS 用戶又必須重複繁瑣設定。

## 決策 (Decision)
1. **確立 `StockTrackerUnifiedArchiveV2` 標準全態封包**：
   - 包含 `schemaVersion: '2.0.0'`、`exportedAt`、`appVersion`、`isRedacted` 與實體指標摘要 `metrics`。
   - `payload` 完整收錄六大領域實體：`trades` (696筆)、`brokerAccounts`、`cashTransactions` (729筆)、`loanRecords` (不限用途借貸/股票質押)、`corporateActions` (除權息事件)、`settings` (系統與金鑰設定)。
2. **落地 API 金鑰雙軌安全匯出模式 (`ExportDatabaseModal`)**：
   - **預設模式 (安全脫敏備份)**：自動抹除 FinMind、FMP 等所有第三方 API KEY (`isRedacted: true`)，杜絕任何金鑰外洩風險。
   - **NAS / 私有雲遷移模式 (完整無損備份)**：保留 API KEY (`isRedacted: false`)，但在 UI 以高對比琥珀色醒目警示「請勿將此備份分享或上傳至公開雲端儲存空間」。
3. **多型解包引擎與同態還原 (`archiveParser.ts`)**：
   - 自動識別 `UNIFIED_V2`、`LEGACY_DB_V1` 與 `TRADES_ONLY`。
   - 若匯入封包內具備完整 `cashTransactions`，直接全態寫入資料庫，物理阻斷 `syncTradesWithCashTransactions` 破壞性覆蓋。
   - 支援外鍵懸空自動對齊至合法券商帳戶。
4. **防禦性快照與回滾機制**：
   - 在執行全態資料庫寫入前，自動於 IndexedDB 建立 `PRE_IMPORT_BACKUP` 快照，確保可一鍵還原。

## 影響與後續效益 (Consequences)
- **正面效益**：
  - 本地機與家用 NAS 遷移達成 100% 同態：696 筆交易、729 筆現金帳、2 筆待發放股利、不限用途借貸合約、券商交割帳戶完全一致。
  - 金鑰安全性達到金融級防禦，預設即脫敏，消除意外洩漏隱患。
  - 完美向下相容舊版 JSON 備份檔。
- **維護注意事項**：
  - 未來若新增系統實體（如新湖倉指標快取），必須同步更新 `StockTrackerUnifiedArchiveV2` 之 `payload` 介面與測試案例。
