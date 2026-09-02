# 03 — 交易購買力計算與防超買風控 (Trading Buying Power Engine)

**What to build:**
實作交易購買力計算函式 `calculateTradingBuyingPower(accountSummary, inFlightTransactions)`：
- 核心公式：$\text{Buying Power} = \text{Settled Cash} + \text{Pending Stock Sells} - \text{Pending Stock Buys}$。
- 購買力釋放原則：
  - 股票賣出在途款 (`STOCK_SELL`)：立即 100% 釋放購買力，投資人可立刻用於下單買進新標的。
  - 股票買進在途款 (`STOCK_BUY`)：立即 100% 扣除購買力，防範超額下單。
  - 現金股利 (`DIVIDEND_PAYOUT`)、減資退款 (`CAPITAL_RETURN`) 與電匯在途入金：在款項正式入帳前**不計入交易購買力**，但計入預估淨餘額。

**Blocked by:** 02-tri-state-availability-engine

**Status:** completed

- [x] 實作購買力計算函式與規則過濾。
- [x] 驗證賣出股票後購買力即刻增加、買進股票後購買力即刻扣除。
- [x] 驗證未發放現金股利與減資退款不提前增加購買力。
- [x] 撰寫單元測試覆蓋多筆買賣連續下單後的購買力變動。
