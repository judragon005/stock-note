# 01 — 市場交割日曆與週期推算函式 (Settlement Calendar Engine)

**What to build:**
實作交易與公司行動之預計交割日推算純函式 `getSettlementDate(tradeDate, market, category?, customPaymentDate?)`：
- 台股交易 (TW)：預設推算 `T+2` 交易日，自動略過週六與週日。
- 美股交易 (US)：預設推算 `T+1` 交易日（依 SEC 最新規則），自動略過週末。
- 現金股息 (`DIVIDEND_PAYOUT`)：優先採用公告發放日 `customPaymentDate`；若無則依市場預設週期推算。
- 減資退款 (`CAPITAL_RETURN`)：依減資基準日或退款發放日推算。
- 純純函式設計，無外部依賴，覆蓋率 100%。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] 支援台股 T+2 週一至週五正常日推算 (如週一 ➔ 週三)。
- [x] 支援台股跨週末推算 (如週四 ➔ 週一；週五 ➔ 週二)。
- [x] 支援美股 T+1 跨週末推算 (如週五成交 ➔ 週一交割)。
- [x] 支援現金股息自訂發放日覆寫。
- [x] 撰寫單元測試覆蓋所有跨週末與邊界情況。
