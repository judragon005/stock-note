# 01 — 全態資料庫封包 V2 核心架構與雙軌脫敏序列化引擎

**What to build:** 建立 `StockTrackerUnifiedArchiveV2` 標準資料結構與核心匯出管線，能從 IndexedDB 與 LocalStorage 完整序列化六大實體（交易 696 筆、券商帳戶、現金流水 729 筆、不限用途借貸合約、除權息事件與設定），並支援 `isRedacted: true` 自動脫敏抹除第三方 API 金鑰與 `false` 完整保留。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 定義 `StockTrackerUnifiedArchiveV2` 封包型別與結構校驗函式
- [x] 升級全庫匯出函式，完整打包 `trades`、`brokerAccounts`、`cashTransactions`、`loanRecords`、`corporateActions`、`settings`
- [x] 實作脫敏抹除邏輯，當 `isRedacted === true` 時遍歷所有 API 金鑰欄位並清空為空字串
- [x] 包含完整與脫敏雙軌序列化之單元測試，確保 JSON 結構合規與資料完整性
