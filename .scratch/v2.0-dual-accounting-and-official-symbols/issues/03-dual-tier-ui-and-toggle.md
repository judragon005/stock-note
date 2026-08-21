# Ticket #3: [UI/UX] 頂部導覽列雙軌切換開關與雙層資訊看板升級

- **狀態**: Completed
- **GitHub Issue**: [#90](https://github.com/judragon003/-/issues/90)
- **規格書**: [SPEC-0011](../../../docs/specs/0011-dual-accounting-mode-and-official-symbols-alignment.md)
- **架構決策**: [ADR-0011](../../../docs/adr/0011-dual-accounting-mode-and-official-symbols-alignment.md)

## 任務清單
- [x] 在 `src/utils/storage.ts` 中實作 `loadAccountingViewFromStorage` 與 `saveAccountingViewToStorage`。
- [x] 在 `src/components/Header.tsx` 實作膠囊型視角切換開關 (`🏢 券商核帳模式` ⇋ `📈 總報酬模式`)，支援平滑動畫與本地儲存。
- [x] 在 `src/components/SummaryCards.tsx` 實作雙層指標看板：大字顯示當前口徑，小字副標題同時標註另一維度數值與預估稅費差額。
- [x] 在 `src/components/HoldingsTable.tsx` 支援依目前視角動態切換欄位標題與數值顯示。
- [x] 執行端到端瀏覽器驗證與 `npm test`，確保 100% 通過與零 Console 錯誤。
