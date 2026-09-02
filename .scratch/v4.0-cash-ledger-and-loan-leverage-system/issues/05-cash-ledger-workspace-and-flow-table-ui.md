# 05 — 現金帳本專屬工作區與流水明細管理介面 (Cash Ledger Workspace & Flow Table UI)

**What to build:**
建立獨立的「現金與借貸」工作區視圖 (`CashLedgerWorkspace`)，包含頂部核心資產/負債/維持率 KPI 指標、各券商交割戶卡片網格、質押借貸清單與安全維持率進度條、全量流水明細表（含篩選、搜尋、編輯、刪除）以及多合一快速記帳 Modal。

**Blocked by:** 01 — 現金流水與多帳戶餘額試算引擎, 02 — 股票交易交割自動同步機制, 03 — 跨幣別換匯調撥, 04 — 股票質押借款與即時擔保維持率風控引擎

**Status:** ready-for-agent

- [x] 實作頂部總覽看板：總現金、總負債、淨資產、綜合維持率與整體負債比。
- [x] 實作帳戶資金卡片 (Account Cards)：呈現台幣/美金結餘、累計出入金與快捷按鈕。
- [x] 實作質押借貸卡片 (Loan Cards)：呈現擔保品、維持率進度條、安全燈號與一鍵繳息/還款。
- [x] 實作全功能現金流水明細表 (Cash Transaction Table)：支援類別/帳戶/日期篩選與分頁。
- [x] 實作記帳 Modal (`CashTransactionModal` / `LoanModal`)：支援出入金、換匯調撥、利息登記與借款。
