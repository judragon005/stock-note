# 05 — 主 K 線圖右上角選單修復與全流程 E2E 驗收 (K-Line Header Options Menu & E2E Audit)

**What to build:**
1. 修改 `src/components/aiForceDashboard/cards/KLineChartCard.tsx`：
   - 修復右上角選項按鈕 (`<button aria-label="選項"><MoreVertical /></button>`)：
   - 點擊時彈出簡潔的浮動選單（Popover），提供快捷切換功能（如「顯示/隱藏關鍵價位引線」、「重設週期為 60D」等），淘汰無響應之死按鈕。
2. 撰寫 E2E / 整合測試：
   - 模擬輸入 `2886` 兆豐金：驗證日 K 線成功渲染、均線數列存在、不再出現「日 K 線短缺」提示。
   - 模擬輸入完全不存在的代碼：驗證頂部與底部呈現 100% 協同一致的誠實 Empty State。
   - 執行 `npm test` 與 `npm run build`，確保 0 錯誤。

**Blocked by:** Ticket 01, 02, 03, 04

**Status:** completed

- [x] 修復 `KLineChartCard.tsx` 右上角按鈕之互動 Popover 選單。
- [x] 撰寫整合測試驗證 2886 真實資料載入與虛擬標的誠實 Empty State。
- [x] 執行全量 `npm test` 與 `npm run build` 確保測試 100% 通過與 TypeScript 0 錯誤。
