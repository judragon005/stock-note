# 08-sec-edgar-us-gaap-tri-statement-parser

## Description
實作 SEC EDGAR 官方 `companyfacts` JSON 數據清洗與科目解析引擎。將 US-GAAP / IFRS 標籤轉換對齊至專案標準的 16 大季度財報指標（QuarterlyFinancialRecord），涵蓋營業收入、淨利、毛利、總資產、總負債、自由現金流與稀釋每股盈餘。

## Target Files
- `src/engine/secEdgarParser.ts`
- `src/engine/secEdgarParser.test.ts`

## Acceptance Criteria
- [x] 實作解析邏輯，自 `facts['us-gaap']` 結構中提取核心科目（如 `Revenues`, `GrossProfit`, `NetIncomeLoss`, `Assets`, `Liabilities`, `EarningsPerShareDiluted`）。
- [x] 依照申報季度（10-Q）與年度（10-K）精確計算單季數值（注意 10-K 累計至 Q4 的差額扣減）。
- [x] 輸出標準格式 `QuarterlyFinancialRecord[]`，並遵循專案零偽造數據政策（未申報項目保留 `undefined`）。
- [x] 使用真實抓取的 AAPL 與 NVDA 官方 JSON 快照編寫單元測試，確保解析結果與實際年報 100% 一致。

## Status
- [x] done
