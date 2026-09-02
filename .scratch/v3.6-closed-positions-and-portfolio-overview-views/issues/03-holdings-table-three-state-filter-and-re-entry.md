# Ticket #3: [UI/Table] HoldingsTable 三態切換、已平倉特化欄位與再次買入 (Re-entry) 快捷操作

- **狀態**: Completed
- **規格書**: [SPEC-0019](../../../docs/specs/0019-closed-positions-and-portfolio-overview-views.md)
- **架構決策**: [ADR-0019](../../../docs/adr/0019-closed-positions-and-portfolio-overview-views.md)

## 任務清單
- [x] 在 `HoldingsTable.tsx` 工具列左側加入三態切換按鈕 (`持倉中` / `已平倉` / `全部總覽`)，並標示動態標的數量。
- [x] 依據選取的檢視模式過濾 `holdings` 陣列（`shares > 0`、`shares === 0` 或全部）。
- [x] 總覽模式 (`ALL`) 下在標的名稱旁增加狀態徽章（`🟢 持倉中` / `⚪ 已清倉`）。
- [x] 已平倉模式 (`CLOSED`) 與已清倉標的之欄位調適：
  - 現價欄位改為顯示出場均價與出場日期標籤。
  - 市值欄位顯示 `NT$ 0`，損益欄位突顯已實現損益與已實現報酬率。
  - 操作欄新增 **「⚡ 再次買入 (Re-entry)」** 按鈕，點擊呼叫下單對話框並預填標的代碼與市場。
- [x] 展開歷史明細：支援檢視該標的完整歷史交易履歷（含清倉紀錄）。
- [x] 支援按已實現損益、報酬率及市場自然排序。
