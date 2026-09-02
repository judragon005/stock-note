# 03 — 現金帳本實收金額優先入帳與減資後在庫股數時序前置扣減 (Cash Ledger Net Payout Priority & Reduction Accuracy)

**What to build:** 
重構 `cashLedgerEngine.ts` 中現金股利（`DIVIDEND`）自動流水的產生邏輯：若 `trade.cashAmount` 已明確定義且 > 0，優先以 `cashAmount` 作為現金帳本入帳金額；否則以 `(shares * price) - (tax || 0)` 扣除稅費/二代健保後金額入帳，確保現金帳本 100% 呈現扣繳後的真實入帳金額（33,250 元）。同時確保留存現金減資（如 9927 泰銘 2025 減資 28.28%）時序前置扣減，使 10,000 股除息基準日持股與發放日計算完全恆等。

**Blocked by:** Ticket 02 (依賴 TradeRecord 的 tax 與 cashAmount 欄位)

**Status:** RESOLVED

- [x] 重構 `cashLedgerEngine.ts` 的 `DIVIDEND` 自動流水生成邏輯，實作 `Net Cash Payout Priority`。
- [x] 驗證 2890 永豐金自動連動流水產生為 `+NT$ 33,250`（已交割狀態），帳戶可用餘額精確吻合。
- [x] 9927 泰銘減資 28.28% 與後續交易後在庫 10,000 股，除息基準日持股精確為 10,000 股，除息總額 50,000 元（發放日 2026-10-29）。
- [x] 單元測試 379/379 全數通過，TypeScript 0 錯誤。
