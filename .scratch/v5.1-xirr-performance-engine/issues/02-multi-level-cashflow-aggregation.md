# Ticket 02: 三層級現金流聚合與計算 (Multi-Level Cashflow Aggregation)

## 需求說明
- 於 `src/engine/xirrCalculator.ts` 與 `src/engine/historicalNav.ts` 擴充三大層級金流聚合器：
  1. **整戶總體 XIRR (`calculatePortfolioXirr`)**：聚合 `cashTransactions` 的外部入金 (`DEPOSIT`)、出金 (`WITHDRAWAL`)、借款利息與當前總淨資產 NAV（若無現金帳本則 fallback 至股票買賣金流）。
  2. **個股標的含息 XIRR (`calculateSecurityXirr`)**：聚合該個股歷次 `BUY`（含手續費）、`SELL`（扣稅費）、`DIVIDEND`（實收淨股息）與期末在倉市值，預設以原生幣別 (TWD / USD) 計算，並支援台幣折算。
  3. **週期時間區間 XIRR (`calculateTimeRangeXirr`)**：在 `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL` 維度下，以區間起始日 NAV 為起始投入，結算期末 NAV 與期間出入金。
- 擴充 `PortfolioPerformanceMetrics` 與 `HoldingPosition` 介面，納入 `xirr`、`securityXirr` 等欄位。
- 擴充對應單元測試驗證多維度聚合計算正確性。

**Status:** todo

- [ ] 實作整戶現金流聚合與 XIRR 計算函式。
- [ ] 實作個股維度現金流聚合與含息 XIRR 計算函式。
- [ ] 實作週期時間區間 XIRR 計算函式。
- [ ] 擴充型別定義與單元測試。
