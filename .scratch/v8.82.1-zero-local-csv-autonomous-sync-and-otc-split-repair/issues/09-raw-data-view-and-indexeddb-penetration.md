# Ticket 09: 任務五原始資料表活頁 (RawDataView) 置頂與前端 IndexedDB 穿透 (Spec 0170)

## 1. 任務核心 (Core Objective)
在 `src/components/aiForceDashboard/TaskPanels.tsx` 的 `RawDataView` 中，降序分頁首行展示今日即時成交價（標註「盤中即時」）；在 `src/engine/marketCacheLoader.ts` 中實裝快取過期穿透，強制以 SQLite 最新數據覆蓋 IndexedDB 舊快取，消除幽靈快取。

## 2. 目標檔案 (Target Files)
- `src/components/aiForceDashboard/TaskPanels.tsx`
- `src/engine/marketCacheLoader.ts`
- `src/hooks/useMarketCatchupSync.ts`

## 3. 具體修復內容 (Implementation Details)
1. `TaskPanels.tsx` (`RawDataView` / `paginateCandles`)：
   - 確保分頁函式取得之 `candles` 包含當日縫合之即時 K 棒。
   - 降序排序後，第 1 頁第 1 行即為當日（2026-10-08）最新行情。
   - 若該 K 棒帶有 `isIntraday`，在表格日期旁渲染小徽章「⚡ 即時」。
2. `marketCacheLoader.ts` 快取穿透：
   - 載入湖倉數據時，檢查 IndexedDB 內標的的 `candles[last].date`。
   - 若後端湖倉回傳之最新日期 > IndexedDB 之最新日期，強制執行 `saveSymbolOhlcv` 覆蓋舊快取。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 在戰情室切換至任務五「原始資料表」活頁時，首行明確呈現今日（10/8）即時價與成交量。
- [ ] 模擬 IndexedDB 含有 10/02 舊資料，載入湖倉 10/07 數據後，IndexedDB 成功被更新為 10/07。
