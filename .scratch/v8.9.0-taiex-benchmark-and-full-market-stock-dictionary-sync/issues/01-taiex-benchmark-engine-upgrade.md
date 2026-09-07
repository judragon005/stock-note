# 任務 01: 台股加權指數 (TAIEX) Benchmark 引擎升級

- **任務編號**: `01-taiex-benchmark-engine-upgrade`
- **所屬版本**: `v8.9.0`
- **狀態**: `RESOLVED`
- **負責人**: Agent

## 1. 任務說明
擴充 `BenchmarkType` 加入 `'TAIEX'`，並從外部 `D:\APP\諮詢\私人\股市\台股加權指數_歷史數據\TAIEX_history_all.csv` 提取自 2020 年至今的每日收盤價，生成 `TW_TAIEX_BENCHMARK_HISTORY`，更新 `benchmarkConstants.ts` 與 `benchmarkData.ts`。

## 2. 驗收標準 (AC)
- `BenchmarkType` 包含 `'TAIEX'`。
- `getBenchmarkDailyPrices('TAIEX')` 回傳完整的加權指數收盤價。
- `alignBenchmarkTimeSeries` 與 `calculateNormalizedGrowth` 單元測試通過。
