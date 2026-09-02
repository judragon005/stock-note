# Issue #1: calculateHistoricalNavSeries 擴充 currentPrices 保底支援與單元測試

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`feature`, `nav`, `pricing`
- **關聯規格**：`docs/specs/0029-historical-nav-realtime-price-fallback-and-auto-sync.md` (AC-1)

## 任務描述 (Description)
在 `src/engine/historicalNav.ts` 中擴充 `CalculateHistoricalNavOptions` 支援 `currentPrices` 參數。在缺少特定標的歷史收盤價時，優先以最新即時市價作為 Fallback 與最新一日基準價，確保最新淨資產與庫存持股市值完全吻合。

## 驗收標準 (Acceptance Criteria)
1. `calculateHistoricalNavSeries` 支援傳入 `currentPrices`。
2. 缺少歷史日 K 時，自動由即時市價補齊最新一日市值。
3. 單元測試驗證空日 K 下 VT 淨資產精確呈現正向獲利，不出現虧損。
