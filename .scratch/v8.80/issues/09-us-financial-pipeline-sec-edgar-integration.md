# 09-us-financial-pipeline-sec-edgar-integration

## Description
升級 `src/engine/usFinancialPipeline.ts`，將美股財報管線的核心資料源重構為「SEC EDGAR 官方優先，FMP 降級為次選備援」。徹底解決 FMP 免費額度耗盡導致美股財報無法分析的歷史痛點。

## Target Files
- `src/engine/usFinancialPipeline.ts`
- `src/engine/usFinancialPipeline.test.ts`

## Acceptance Criteria
- [x] 重構 `fetchUSFinancialStatements(symbol)`：
  1. 優先透過 `secEdgarTransport` 請求 SEC 官方資料並經 `secEdgarParser` 轉化。
  2. 若 SEC 失敗（如中概 ADR 或特定未收錄代碼），平滑降級至 FMP API Key。
- [x] 獲取的財務數據持久化寫入本地 IndexedDB 快取。
- [x] 更新 `financialReportService.ts` 與 `equityDeepDiveEngine.ts`，確認美股標的在無 FMP Key 情況下能完整產出法證評分與三張表圖表。
- [x] 撰寫集成測試，驗證雙軌切換與錯誤降級機制的正確性。

## Status
- [x] done
