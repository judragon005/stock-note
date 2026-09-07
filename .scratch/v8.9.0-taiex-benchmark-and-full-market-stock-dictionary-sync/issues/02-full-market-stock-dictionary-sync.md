# 任務 02: 全市場 2,340+ 檔上市櫃合法股票字典同步升級

- **任務編號**: `02-full-market-stock-dictionary-sync`
- **所屬版本**: `v8.9.0`
- **狀態**: `RESOLVED`
- **負責人**: Agent

## 1. 任務說明
從外部 `D:\APP\諮詢\私人\股市\台股加權指數_歷史數據\上市櫃股票與債券_歷史數據\TWSE_TPEx_stocks_summary.csv` 提取全市場標的清單，透過 `isValidTaiwanSecurity` 嚴格清洗（排除短期權證、牛熊證與CB），擴充合併至 `src/data/stockDictionary.ts`。

## 2. 驗收標準 (AC)
- 靜態字典涵蓋 2,340+ 檔標的。
- 支援新興主動型 ETF（如 00400A、00403A）、債券 ETF 與一般個股。
- `stockNameResolver.test.ts` 新增測試驗證 100% 離線解析。
