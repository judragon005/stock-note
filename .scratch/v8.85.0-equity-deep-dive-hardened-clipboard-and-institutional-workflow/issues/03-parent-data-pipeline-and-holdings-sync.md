# Ticket 03: 父層呼叫端數據管線端到端串接與持倉連動修復

## 關聯規格
- Spec: `docs/specs/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow-spec.md` (Story B / AC US-04, US-05, US-06)

## 問題背景
`App.tsx` 與 `AiForceDashboardView.tsx` 呼叫 `EquityDeepDiveModal` 時僅傳遞了 `symbol`, `market`, `name`，未傳入 `quote`、`candles`、`holdings`、`onUpdateHoldings` 與 `reportContext`。導致市價為 0、目標價停損價為空、在庫持倉永遠判斷為不在庫、無法回寫持倉風控線，導出快照為 0 元假數據。

## 任務細節
1. 修改 `src/App.tsx`：
   - 擴充 `deepDiveState`，加入可選的 `quote`, `candles`, `institutionalRecords`, `boxFloorPrice`, `boxCeilingPrice`, `statusTag`。
   - 在 `handleOpenDeepDive` 中，若有當前股票的快照市價或持倉資訊，自動裝配進 state。
   - 在 `<EquityDeepDiveModal />` 調用處傳入：
     - `holdings={holdings}`
     - `onUpdateHoldings={handleUpdateHoldings}`
     - 組裝好之 `input`（包含現價 quote 與 candles）。
2. 修改 `src/components/aiForceDashboard/AiForceDashboardView.tsx`：
   - 在 `<EquityDeepDiveModal />` 調用處傳入：
     - `reportContext={report}`
     - `input` 映射 `report.marketBar`、K 線與箱體等實時數據。
     - 若有 `holdings` 則傳入。
3. 修改 `src/components/HoldingsTable.tsx`：
   - 開啟投研彈窗時將該筆持倉的現價、停損價、目標價等資訊一併帶入。

## 驗收標準
- [x] 開啟中砂 (1560) 或台積電 (2330) 投研彈窗時，頂部狀態若在庫正確顯示「📦 已在庫持倉」。
- [x] 第 7 步表單自動根據現價帶出預設目標價 (+20%) 與停損價 (-8%)，不為空白。
- [x] 勾選「同步至在庫持倉」並儲存筆記後，持倉列表中該標的之目標價/停損價成功更新。
