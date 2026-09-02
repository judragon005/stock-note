# 需求規格說明書：在途資金與交易購買力會計帳本系統 (In-Transit Funds & Buying Power Ledger System)

## Problem Statement

目前投資記帳與資產分析系統中，現金帳本僅能粗略記錄交易與餘額，缺乏專業券商級別的清算交割（Clearing & Settlement）時效感知機制。

投資人在日常操作時面臨以下三大痛點：
1. **交割時效與可用資金脫鉤 (Settlement Desynchronization)**：股票買賣存在市場交割週期（台股 T+2、美股 T+1），現金股息從除息到入帳亦有數週落差。使用者無法精確分辨帳面現金中有多少是「已交割可隨時提領回銀行」的實質現金，容易因誤判現金水位而面臨違約或調度困境。
2. **缺乏即時再投資購買力試算 (Missing Trading Buying Power)**：在真實券商交易中，賣出股票後雖然資金尚未到期交割（不可出金提現），但券商系統會立即釋放等額交易購買力供投資人即時買入其他標的。目前系統缺乏獨立的購買力計算公式，無法支援賣出即刻再買入的動態試算。
3. **在途金流缺乏時序預測可視化 (Blind In-Flight Cash Flows)**：使用者無法一目了然未來幾天（今日、明日、本週、本月）具體有哪些款項即將交割扣款或發放入帳，缺乏交割行事曆與一鍵手動核銷機制。

---

## Solution

建立符合券商清算標準的**「三層可用性在途資金與購買力會計體系」**，提供：
1. **三層會計可用性計算核心**：精確計算並區分「實質已交割現金 (Settled Cash - 可提領)」、「在途應收/應付款 (In-Flight Receivables/Payables)」、「交易購買力 (Trading Buying Power)」與「預計交割後總餘額 (Projected Cash Balance)」。
2. **全場景業務在途涵蓋**：完整覆蓋股票買賣交割 (台股 T+2 / 美股 T+1)、現金股息發放期 (除息日 ➔ 發放日)、減資退款、跨行/跨國電匯調撥在途與股票質押借款撥款。
3. **混合雙軌生命週期流轉 (Hybrid Lifecycle Engine)**：預設依交易市場規則與行事曆自動推算交割日並在到期日時自動轉為已交割，同時支援單筆流水手動一鍵切換狀態 (`⏳ 待交割` $\leftrightarrow$ `✅ 已交割`) 與自訂交割日。
4. **頂級券商工作台 UI**：在現金帳本頂部提供四核心動態指標卡片（實質可用、在途應收、在途應付、交易購買力），並以時序展開即將交割排程看板，支援列表膠囊標籤與在途快速篩選器。

---

## User Stories

1. As an active trader, I want my stock sales to immediately release trading buying power, so that I can reinvest in other securities immediately without waiting for T+1/T+2 settlement.
2. As a bank account manager, I want to clearly see my "Settled Cash Balance" that is actually withdrawable today, so that I never accidentally initiate a wire withdrawal exceeding my available balance.
3. As a dividend investor, I want my declared cash dividends between ex-dividend date and payment date to be tracked as pending receivables, so that I can forecast my upcoming cash inflows without inflating my current buying power.
4. As a Taiwan stock investor, I want stock purchases to automatically calculate T+2 settlement dates (skipping weekends), so that I know exactly when funds will be debited.
5. As a US stock investor, I want stock purchases to automatically calculate T+1 settlement dates according to US SEC regulations, so that my Schwab/IBKR accounts reflect accurate settlement timing.
6. As a user reviewing my accounts, I want top-level dashboard metric cards displaying Settled Cash, Pending Inflows, Pending Outflows, and Buying Power, so that I can grasp my full liquidity situation in one second.
7. As a disciplined investor, I want a settlement timeline grouping upcoming in-flight transactions by date (Today, Tomorrow, This Week, Future), so that I can prepare adequate settlement funds to prevent settlement defaults.
8. As a user checking my bank passbook, I want to click a quick toggle button on any transaction to manually flip its status between "Pending" and "Settled", so that I can reconcile manual discrepancies.
9. As an international investor wiring funds overseas, I want wire transfers to be marked as in-transit during the 1-3 day banking clearance window, so that my money is not counted twice or lost from view.
10. As a borrower using stock pledge loans, I want pledge loan disbursements to be tracked in transit until the funds arrive in my settlement account, so that my debt and cash flow timelines match reality.
11. As an organized investor, I want a quick filter button on my cash transaction list to view "In-Transit Only", so that I can audit pending items without wading through settled history.
12. As a meticulous accountant, I want custom settlement date overrides on any cash flow item, so that unexpected bank holidays or typhoon closures can be accurately adjusted.

---

## Implementation Decisions

### 1. 三層會計可用性計算模型 (Tri-State Availability Ledger)
- **實質已交割現金 (Settled Cash)**：
  $$\text{Settled Cash} = \sum_{\text{settledStatus} = \text{'SETTLED'} \land \text{effectiveDate} \le \text{today}} \text{amount}$$
- **交易購買力 (Trading Buying Power)**：
  $$\text{Buying Power} = \text{Settled Cash} + \text{Pending Stock Sells} - \text{Pending Stock Buys}$$
  *規則*：尚未入帳之現金股利、減資退款與電匯在途入金不計入即時下單購買力（防禦超額下單），股票賣出在途款則立即全額釋放。
- **預估交割後淨額 (Projected Cash Balance)**：
  $$\text{Projected Balance} = \text{Settled Cash} + \sum \text{Pending Inflows} - \sum \text{Pending Outflows}$$

### 2. 涵蓋之在途金流類別 (In-Flight Cashflow Scope)
- 股票買進交割款 (`STOCK_BUY` - 待扣款 Payables)
- 股票賣出交割款 (`STOCK_SELL` - 待入帳 Receivables)
- 現金股利發放款 (`DIVIDEND_PAYOUT` - 待入帳 Receivables)
- 現金減資退款 (`CAPITAL_RETURN` - 待入帳 Receivables)
- 跨國/跨行電匯調撥 (`WIRE_FEE`, `FX_TRANSFER_IN/OUT`, `DEPOSIT/WITHDRAWAL` - 待入/扣款)
- 質押借款撥款/還款 (`LOAN_DISBURSEMENT`, `LOAN_REPAYMENT` - 待入/扣款)

### 3. 交割週期推算核心 (Settlement Calendar Engine)
- 台股交易：預設 `T+2` 交易日（自動略過週六與週日）。
- 美股交易：預設 `T+1` 交易日（依 SEC 最新規範，自動略過週末）。
- 現金股息：預設以公告發放日 `paymentDate` 作為 `settlementDate`。
- 支援使用者於介面自訂與覆寫特定日期的 `settlementDate`。

### 4. 混合雙軌狀態流轉 (Hybrid State Machine)
- 預設狀態判定：若 `tx.settlementStatus === 'SETTLED'` 且 `tx.settlementDate <= today`，視為實質已交割。
- 若 `tx.settlementStatus === 'PENDING'` 或 `tx.settlementDate > today`，視為在途待交割。
- 提供單筆即時覆寫開關，使用者點擊確認後將 `settlementStatus` 持久化儲存為 `'SETTLED'`。

### 5. UI/UX 與視覺元件架構 (Component Architecture)
- 現金帳本工作區頂部建置「四核心指標發光看板」：
  - 🟢 實質已交割現金 (Settled Cash)
  - 🟡 在途待入帳 (Pending Inflows)
  - 🔴 在途待扣款 (Pending Outflows)
  - ⚡ 交易購買力 (Trading Buying Power)
- 「在途交割時序排程面板 (Settlement Timeline Card)」：按今天、明天、本週、未來排程分組展示各筆在途項目與一鍵核銷按鈕。
- 現金流水清單新增「在途膠囊標籤 (`⏳ 待交割 (YYYY-MM-DD)`)」與「快速過濾器 (`[全部]` / `[已交割]` / `[僅看在途]`)」。

---

## Testing Decisions

- **測試原則**：遵循測試驅動開發 (TDD) 與純介面縫隙測試（Public Seam Testing），只驗證公開計算邏輯與對外回傳結構，不測試內部私有變數。
- **測試模組與覆蓋範圍**：
  - `src/engine/cashLedgerEngine.ts`：
    - 驗證台股 T+2 / 美股 T+1 自動略過週末之日期推算。
    - 驗證三層可用性數值（Settled Cash, In-Flight Inflows/Outflows, Buying Power, Projected Balance）之精確計算。
    - 驗證股票賣出在途款即時增加購買力、買進在途款即時扣除購買力。
    - 驗證現金股息在途款只計入預估淨額而不提前增加購買力。
    - 驗證手動強制切換 `settlementStatus` 時各數值之即時重算。
- **既有測試參照**：
  - `src/engine/cashLedgerEngine.test.ts`

---

## Out of Scope

- 台灣與美國證券交易所之法定突發國定假日與颱風假之遠端即時 API 抓取（系統提供自動跳過週末之行事曆推算，特殊連假或颱風假由使用者手動覆寫交割日即可，符合 KISS 原則）。
- 複雜的期貨保證金、外匯保證金與日內當沖額度自動融券乘數試算。

---

## Further Notes

- 本規格完全兼容既有 `BrokerAccount`、`TradeRecord` 與 `CashTransaction` 資料結構，不破壞舊有本金與 NAV 會計模型。
