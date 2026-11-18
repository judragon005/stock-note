# 04 — 現金流水保全與股票質押借貸同態還原

**What to build:** 改造 `EnhancedImportModal` 與資料庫匯入流程，徹底根除「匯入時強制呼叫 `syncTradesWithCashTransactions` 導致 41 筆非交易現金流水被抹除」的 Bug；將封包內的 `cashTransactions` 與 `loanRecords` 100% 完整還原至目標端資料庫。

**Blocked by:** 03-polymorphic-ingestion-parser-and-preview

**Status:** completed

- [x] 重構確認匯入邏輯，若封包內包含完整 `cashTransactions`（如 729 筆），直接落盤寫入，絕不以合成方式覆蓋
- [x] 將 `loanRecords`（不限用途借貸/股票質押合約）還原至 LocalStorage 與 state，維護維持率與質押標的計算
- [x] 將 `corporateActions` 快取還原至本地快取與資料庫，確保 2 筆待發放股利在冷啟動後能立即精確計算
- [x] 單元與整合測試驗證：匯入後現金流水精確等於 729 筆，待發放股利精確等於 2 筆
