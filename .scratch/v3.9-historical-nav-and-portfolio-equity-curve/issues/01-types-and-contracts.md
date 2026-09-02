# 01 — 歷史日 K 與資產模型型別定義 (Types & Data Contracts)

**What to build:** 定義全歷史資產折線圖所需的完整 TypeScript 型別體系，提供包括歷史價格字典、每日淨值快照、現金交易、借貸紀錄與週期篩選列舉的強型別契約。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `src/types/stock.ts` 中新增 `HistoricalDailyPriceMap` (Record<string, Record<string, number>>)
- [ ] 定義 `PortfolioDailySnapshot` 介面（含 date, totalNAV, stockMarketValue, cashBalance, loanBalance, netCostBasis, cumulativeReturnPnL, cumulativeReturnPercent, events）
- [ ] 定義 `CashTransaction`（含 DEPOSIT, WITHDRAWAL, DIVIDEND 等類型）與 `LoanRecord`（借貸本金與利息）型別
- [ ] 定義 `TimeRangeFilter` ('1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL')
- [ ] 通過 TypeScript 編譯 (`npm run build`)
