# ADR #0039: Tooltip 邊界防溢出與對齊引擎架構決策 (Tooltip Boundary Overflow Prevention & Alignment Engine)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **決策者**：前端架構師、UI/UX 設計師
- **關聯 PRD**：[docs/specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md](../specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md)
- **關聯前置 ADR**：[docs/adr/0038-lots-breakdown-modal-glassmorphism-and-ux-architecture.md](0038-lots-breakdown-modal-glassmorphism-and-ux-architecture.md)

---

## 1. 背景與脈絡 (Context)

在 `LotsBreakdownModal` 頂部 Header 右側新增會計方法選擇器與說明圖示時，因彈窗外層卡片容器設定了 `overflow: 'hidden'` 以維持圓角裁切，造成預設向上 (`position="top"`) 或居中展開的說明氣泡先後觸發上緣截斷與右緣溢出裁切缺陷，導致氣泡文字僅部分可讀。

---

## 2. 架構決策 (Decisions)

### 2.1 Tooltip 元件擴充多維對齊支援 (`align` 屬性)
- 為 `TooltipProps` 新增可選屬性 `align?: 'center' | 'left' | 'right'`（預設為 `'center'`）。
- 抽離純函數 `getTooltipPositionStyles` 與 `getTooltipArrowStyles` 負責座標與角度計算。
- 當處於右上角等邊界情境時，透過 `position="bottom" align="right"` 讓氣泡向左下方空間延展，並將指示箭頭精確偏移 `8px` 內縮指向圖示，徹底杜絕邊界裁切。

### 2.2 100% 向後相容與 TDD 單元測試覆蓋
- 所有既有未傳遞 `align` 屬性的呼叫點維持既有水平置中與上方彈出邏輯，無任何 Breaking Changes。
- 建立專屬單元測試 `src/components/common/Tooltip.test.ts` 驗證各方位與對齊組合之樣式與角度計算。

---

## 3. 影響與驗收成果 (Consequences & Validation)

- **UI/UX 穩定性**：徹底根除彈窗邊界 Tooltip 被裁切的問題，說明文字完整呈現。
- **測試覆蓋**：全案 **20 個測試套件、237 個測試案例 100% 綠燈通過**，TypeScript 生產建置 0 錯誤。
