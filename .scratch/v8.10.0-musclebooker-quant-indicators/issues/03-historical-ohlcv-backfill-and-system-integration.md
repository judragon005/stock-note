# Issue #0091-03: 安全背景歷史回補引擎與系統端對端整合 (Backfill Engine & System Integration)

- **標籤**：`ready-for-agent` · `Integration` · `Network` · `BackgroundWorker`
- **對應規格**：[PRD #0091](../../../docs/specs/0091-local-historical-indicators-and-external-backfill-engine-spec.md)
- **優先級**：`P1`

---

## 任務描述
1. 實作 `src/engine/historicalOhlcvBackfill.ts`：
   - 整合 Yahoo Chart API，將上市至今日 K 線 (OHLCV) 安全拉取並轉換為 `DailyCandle`。
   - 透過 `globalRequestScheduler` 實施速率節流與 429 熔斷保護。
   - 支援增量同步（若本地已存有資料，僅撈取新缺漏天數）。
   - 調用 `muscleBookerEngine` 計算最新指標時序，並自動沉澱儲存至 IndexedDB。
2. 整合至現有持股技術訊號系統（如在分析計算時提供肌肉書僮箱頂/箱底/扣抵指標點位）。
3. 執行全量 `npm test` 與 `npm run build` 驗證零錯誤。

## 驗收條件 (Acceptance Criteria)
- [ ] 撰寫單元測試覆蓋回補邏輯、增量日 K 合併與指標計算流程。
- [ ] 全專案單元測試 100% 通過，TypeScript 編譯零錯誤。
