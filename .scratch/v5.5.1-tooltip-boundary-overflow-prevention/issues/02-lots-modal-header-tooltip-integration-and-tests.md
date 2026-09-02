# Ticket #02: 彈窗 Header Tooltip 整合套用與 TDD 單元測試

- **關聯 PRD**: [docs/specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md](../../docs/specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md)
- **狀態**: `RESOLVED`
- **負責目標**: 
  - `src/components/LotsBreakdownModal.tsx`
  - `src/components/common/Tooltip.test.ts`

---

## 🎯 任務目標
在 `LotsBreakdownModal.tsx` Header 區域正確套用 `position="bottom" align="right"`，並為 `Tooltip` 元件建立專屬單元測試套件以達到 100% 通過與型別安全。

---

## 🛠️ 實作要點
1. 修改 `LotsBreakdownModal.tsx` 中的會計方法說明 Tooltip 為 `<Tooltip content={...} position="bottom" align="right">`。
2. 建立 `src/components/common/Tooltip.test.ts` 測試檔案，涵蓋：
   - 預設 top center 上方置中測試
   - bottom right 下方靠右防溢出測試
   - bottom left 下方靠左測試
   - top right 上方靠右測試
   - left / right 水平側邊垂直置中測試
   - 各方位搭配 align 之箭頭指示器旋轉角度與內縮座標測試
3. 確保 `npm test` 與 `npm run build` 通過驗證。

---

## 驗收條件 (AC)
- [x] Header Tooltip 內容完整可見，不再受彈窗頂部與右側邊界 `overflow: hidden` 裁切。
- [x] 單元測試 20 個檔案全數綠燈通過（237 個測試通過）。
- [x] `npm run build` 0 錯誤。
