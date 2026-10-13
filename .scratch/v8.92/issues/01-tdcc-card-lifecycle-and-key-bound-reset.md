# Ticket 01: Card 19 TDCC 生命週期修復、鍵值重置與 Honest Empty State (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - `src/components/aiForceDashboard/AiForceDashboardView.tsx`
  - `src/components/aiForceDashboard/cards/TdccDistributionCard.tsx`
* **測試檔案**：
  - `src/components/aiForceDashboard/cards/TdccDistributionCard.test.ts`
  - `src/components/aiForceDashboard/AiForceDashboardView.test.tsx`

## 2. 需求描述 (Description)
1. **React 節點生命週期隔離**：
   - 在 `AiForceDashboardView.tsx` 中為 `<TdccDistributionCard />` 綁定 `key={symbol}`。
   - 保證使用者切換標的代碼（如由 0050/2344 切換至 2330 或美股）時，React 強制銷毀舊內部狀態與重繪，杜絕 DOM 重用引發的畫面凍結。
2. **非同步查詢狀態洗淨 (State Sanitization)**：
   - 在 `loadDataForSymbol` 函式觸發時，即刻將 `report.tdccDistribution` 洗淨為 loading 待命空狀態，阻斷非同步延遲期間殘留舊數據。
3. **美股與無數據 Honest Empty State 防禦**：
   - 優化 `TdccDistributionCard.tsx` 空狀態渲染，當 `history.length === 0` 或 `isEmpty: true` 時，展示高質感毛玻璃提示框。
   - 針對美股市場標的，強制標註「美股無集保機制 (採 13F 機構申報)」，嚴禁繪製空白折線或捏造假座標。

## 3. 測試縫隙 (Test Seams)
* 透過組件 props 傳入切換模擬，驗證在更換 symbol 時，先前的 `over1000Ratio` 與 `totalShareholders` 完全不殘留。
* 驗證空數據時回傳合規 Empty State 節點，無 NaN 或破版錯誤。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0179 之 **AC 1, AC 2**。
* [ ] `TdccDistributionCard.test.ts` 與 `AiForceDashboardView.test.tsx` 100% 綠燈通過。
