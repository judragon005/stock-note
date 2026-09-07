# ADR 0089: 台股加權指數 (TAIEX) Benchmark 全歷史日線與全市場股票字典補全

## 1. 背景與狀態 (Status)
- **狀態**: 已採納 (Accepted) / 已實作 (Implemented)
- **日期**: 2026-09-07
- **版本**: `v8.9.0`
- **關聯 PRD**: [docs/specs/0089-taiex-benchmark-and-full-market-stock-dictionary-sync-spec.md](file:///d:/APP/股票紀錄/docs/specs/0089-taiex-benchmark-and-full-market-stock-dictionary-sync-spec.md)

## 2. 決策背景 (Context)
- 專案先前的大盤基準 (Benchmark) 僅支援 `0050` 與 `SPY`，且 `0050` 在常數字典中僅收錄 48 個月半抽樣點，缺乏真實每日日線，且缺乏台灣最核心的「加權指數 (^TWII)」。
- 股票名稱字典僅有 700 餘行，遇到新發行的主動型 ETF（如 00400A、00401A、00403A 等）或上櫃中小型股時，離線環境無法正確解析中文名稱。
- 使用者本機 `D:\APP\諮詢\私人\股市\台股加權指數_歷史數據` 已具備高品質歷史日線與全市場股票清單。

## 3. 架構決策 (Decision)
1. **Benchmark 引擎升級與 TAIEX 基準引入**：
   - 擴充 `BenchmarkType = 'NONE' | '0050' | 'SPY' | 'BALANCED_50_50' | 'TAIEX'`。
   - 將外部 7,153 筆加權指數與 0050 日線自 2020 年至今精煉壓縮為 `taiexBenchmarkHistory.json` (35KB) 與 `tw0050BenchmarkHistory.json` (30KB)，納入 `benchmarkConstants.ts`。
   - `PortfolioGrowthChart.tsx` 擴充加權指數對齊計算與 UI 基準切換按鈕。
2. **全市場股票字典全面擴充**：
   - 透過 `merge_full_tw_stocks.cjs` 讀取外部清單，經 `isValidTaiwanSecurity` 嚴格過濾權證與可轉債後，將台股合法標的擴充至 2,285 檔，搭配 500+ 美股標的，達成 100% 離線繁中解析。
3. **極簡維護腳本保留**：
   - 將 `scripts/extract_taiex_and_0050.cjs` 與 `scripts/merge_full_tw_stocks.cjs` 留存於專案內，供日後定期從外部數據庫一鍵同步。

## 4. 影響評估與後續 (Consequences)
- **正面影響**：
  - 投組績效對照加權指數具備真實每日點位，大幅提升 Alpha、Beta 與 Sharpe Ratio 計算精度。
  - 新興主動型 ETF 與上市櫃標的離線解析零缺漏。
  - 前端 bundle 體積僅微幅增加約 60KB，零網路依賴。
- **負面影響 / 限制**：
  - 目前全市場個股歷史日 K 線（數百 MB）尚未注入 IndexedDB，將留待第二階段離線批次工具處理。
