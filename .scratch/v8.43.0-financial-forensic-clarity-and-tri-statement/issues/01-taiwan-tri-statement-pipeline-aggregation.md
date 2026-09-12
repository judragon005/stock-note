# 01 — Taiwan Tri-Statement Pipeline Aggregation

**What to build:**
升級 `src/engine/taiwanFinancialPipeline.ts`。
解決台股財務數據目前僅撈取損益表，缺少資產負債表與現金流量表導致 CFO 為 0 的假陽性重大問題。

1. 同步並行抓取三大資料集：
   - `TaiwanStockFinancialStatements` (綜合損益表)
   - `TaiwanStockBalanceSheet` (資產負債表)
   - `TaiwanStockCashFlowsStatement` (現金流量表)
2. 跨表依據日期 `date` 進行原子合併，正確映射 `operatingCashFlow` (來自 `CashFlowsFromOperatingActivities` 或 `NetCashInflowFromOperatingActivities`)、`capitalExpenditure` (來自 `PropertyAndPlantAndEquipment` 或 `CapitalExpenditures`)、資產與負債。
3. 支援快取優先與 IndexedDB 寫入。
4. 單元測試覆蓋三表聚合正確性。

**Blocked by:** None

**Status:** done

- [x] 並行抓取並清洗 FinMind 三大財報資料集
- [x] 營運現金流 CFO 與資產負債數據完整解析不為 0
- [x] 單元測試 `taiwanFinancialPipeline.test.ts` 綠燈
