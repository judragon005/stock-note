# Ticket #64: [Hook] 匯率整合至 usePriceAutoRefresh 智慧輪詢與 LocalStorage 備援快取

- **狀態**: Ready for Agent
- **父 Issue**: #62
- **PRD**: [PRD 0006](../../docs/specs/0006-auto-usd-twd-exchange-rate.md)
- **ADR**: [ADR 0006](../../docs/adr/0006-auto-usd-twd-exchange-rate-and-fallback.md)

## 任務清單
- [ ] 於 `src/utils/storage.ts` 擴充匯率中繼資料儲存與讀取 (`saveExchangeRateQuote`, `loadExchangeRateQuote`)。
- [ ] 於 `src/hooks/usePriceAutoRefresh.ts` 整合匯率狀態管理 (`exchangeRateQuote`) 與自動抓取邏輯。
- [ ] 支援進站初始載入、開盤時段 60 秒輪詢、手動 refreshAll 同步更新。
- [ ] 若抓取異常，平滑退回本地快取與預設值。
