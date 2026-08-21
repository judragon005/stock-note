# Ticket #63: [Engine] 匯率抓取引擎與解析邏輯 (fetchExchangeRate)

- **狀態**: Ready for Agent
- **父 Issue**: #62
- **PRD**: [PRD 0006](../../docs/specs/0006-auto-usd-twd-exchange-rate.md)
- **ADR**: [ADR 0006](../../docs/adr/0006-auto-usd-twd-exchange-rate-and-fallback.md)

## 任務清單
- [ ] 於 `src/types/stock.ts` 定義 `ExchangeRateQuote` 型別。
- [ ] 於 `src/engine/priceFetcher.ts` 實作 `parseYahooExchangeRateResponse(data: any): ExchangeRateQuote | null`。
- [ ] 實作 `fetchExchangeRate(timeoutMs?: number): Promise<ExchangeRateQuote | null>`，透過 CORS 代理請求 Yahoo Finance `USDTWD=X`。
- [ ] 支援即時價、前日收盤價 (previousClose) 與降級平滑處理。
