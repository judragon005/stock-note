# 02 — 股票交易交割自動同步與流水關聯機制 (Trade Settlement Auto-Sync Hook)

**What to build:**
實作股票買賣、股息發放與減資退款與現金流水帳本的自動關聯同步機制。當使用者在交易帳本新增、修改或刪除股票交易時，系統能自動維護對應券商帳戶之交割款流水，並支援手動補登與同步開關。

**Blocked by:** 01 — 現金流水與多帳戶餘額試算引擎 (Types & Cash Ledger Engine)

**Status:** ready-for-agent

- [x] 實作 `syncTradesWithCashTransactions(trades, currentTransactions)` 核心純函式，具備防重複與自動對齊邏輯。
- [x] 買進時自動建立 `STOCK_BUY` 扣款記錄（含手續費）。
- [x] 賣出時自動建立 `STOCK_SELL` 入帳記錄（扣除手續費與證交稅）。
- [x] 現金股息發放時自動建立 `DIVIDEND_PAYOUT` 入帳記錄（扣除預扣稅/二代健保）。
- [x] 減資退款時自動建立 `CAPITAL_RETURN` 入帳記錄。
- [x] 刪除或修改交易時，自動同步更新或清除對應之連動流水。
- [x] 擴充單元測試驗證同步與解除關聯之一致性。
