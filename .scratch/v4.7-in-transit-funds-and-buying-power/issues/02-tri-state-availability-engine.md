# 02 — 三層會計可用性計算核心 (Tri-State Availability Engine)

**What to build:**
升級 `calculateAccountBalances` 與相關型別，計算並回傳三層可用性金額：
- `settledCash`：實質已交割可用現金（`settlementStatus === 'SETTLED'` 且 `date/settlementDate <= today`）。
- `pendingReceivables`：在途應收總額（所有未到期或待交割的正向流入款，如賣出款、股息待發放款）。
- `pendingPayables`：在途應付總額（所有未到期或待交割的負向流出款，如買進扣款）。
- `projectedBalance`：預估交割後總餘額（`settledCash + pendingReceivables - pendingPayables`）。
- 支援按個別帳戶與全市場雙幣別 (TWD / USD) 匯總。

**Blocked by:** 01-settlement-calendar-engine

**Status:** completed

- [x] 擴充 `AccountBalanceSummary` 與 `CashLedgerSummary` 型別支援三層可用性欄位。
- [x] 實作正向在途應收與負向在途應付之獨立累計邏輯。
- [x] 驗證到期自動轉為實質已交割之時態推進運算。
- [x] 撰寫單元測試覆蓋多帳戶、多幣別與混合在途情境。
