# 任務 03: 歷史交易明細帳本單筆手動編輯與現金帳本動態連動

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: UI / Full-Stack Flow
- **優先級**: P0 (Phase 2)
- **對應 PRD**: SPEC-0025 (AC-4, AC-5)

## 任務描述
在 `TradeHistoryTable.tsx` 每筆紀錄操作欄新增「✏️ 編輯」按鈕，點擊後開啟 `TradeModal` 並完整回填原交易資料（日期、標的、帳戶、單價、股數、手續費、證交稅、退款金額、標籤、備註等）。儲存修改後保留原始 `id` 與 `createdAt` 更新交易清單，並自動觸發 `syncTradesWithCashTransactions` 連動更新現金帳本與資產淨值 (NAV)。

## 驗收標準 (Acceptance Criteria)
- [x] 在 `TradeHistoryTable.tsx` 表頭將欄位名稱設為「操作」，每列操作欄新增「✏️ 編輯」按鈕。
- [x] `TradeModal.tsx` 擴充 `editingTrade` 屬性，在 `isOpen` 觸發時將其所有欄位賦值至內部狀態，並在標題動態顯示「編輯交易紀錄 (代碼)」。
- [x] `App.tsx` 維護 `editingTrade` 狀態，在 `handleSaveTrade` 中判斷 `existingTradeId` 執行既有交易替換或新交易追加。
- [x] 編輯儲存後，自動觸發 `syncTradesWithCashTransactions` 與市價更新，連動刷新現金帳本。
