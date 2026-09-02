# 03 — 跨幣別換匯調撥、活存利息與電匯費記錄 (FX Transfers & Miscellaneous Cash Flows)

**What to build:**
支援台股與美股交割戶之間的雙向換匯調撥（TWD ⇄ USD，含匯率記錄與手續費扣除），以及閒置交割款活存利息收入、銀行電匯費、帳戶保管費等非股票日常金流記錄。

**Blocked by:** 01 — 現金流水與多帳戶餘額試算引擎 (Types & Cash Ledger Engine), 02 — 股票交易交割自動同步與流水關聯機制 (Trade Settlement Auto-Sync Hook)

**Status:** ready-for-agent

- [x] 實作 `processFxTransfer(...)` 邏輯，一鍵產生來源帳戶轉出 (FX_TRANSFER_OUT) 與目標帳戶轉入 (FX_TRANSFER_IN) 雙向關聯流水。
- [x] 支援附加電匯手續費 (`WIRE_FEE`) 與自訂換匯匯率。
- [x] 支援一般帳戶間同幣別內部資金調撥。
- [x] 支援交割戶活存利息 (`INTEREST_INCOME`) 記錄。
- [x] 撰寫單元測試驗證換匯後兩端帳戶餘額與總折算資產之正確性。
