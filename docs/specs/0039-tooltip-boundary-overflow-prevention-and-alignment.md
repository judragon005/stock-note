# PRD #0039: Tooltip 邊界防溢出與對齊引擎規格書 (Tooltip Boundary Overflow Prevention & Alignment Engine)

- **版本**：v5.5.1
- **日期**：2026-08-28
- **狀態**：`IMPLEMENTED`
- **關聯 PRD**：[0038-lot-modal-glassmorphism-redesign-and-ux-enhancements.md](./0038-lot-modal-glassmorphism-redesign-and-ux-enhancements.md)
- **目標組件**：
  - `src/components/common/Tooltip.tsx`
  - `src/components/LotsBreakdownModal.tsx`

---

## 1. 問題陳述與根本原因 (Problem Statement & Root Cause)

### 1.1 根本原因分析 (Root Cause)
在 `LotsBreakdownModal.tsx` 彈窗 Header 右側配置「會計方法」下拉選單與 `ℹ️` 說明圖示時，產生了兩階段的文字截斷問題：
1. **頂部邊界截斷 (Top Clipping)**：
   - 彈窗外層卡片容器 (`.glass-card`) 設置了 `overflow: 'hidden'` 用於維持圓角裁切。
   - `Tooltip` 預設方向為向上彈出 (`position="top"`)，致使氣泡超出 Modal 頂部邊界，被父容器裁切只露出底部破碎文字（如「式・」）。
2. **右側邊界截斷 (Right Overflow & Clipping)**：
   - 當將 Tooltip 調整為向下彈出 (`position="bottom"`) 後，原先 Tooltip 採用水平置中對齊 (`left: 50%, transform: translateX(-50%)`)。
   - 因 `ℹ️` 圖示緊鄰 Header 右緣（關閉按鈕旁），`maxWidth: 280px` 的氣泡右半部超出 Modal 右邊界，再次觸發父容器 `overflow: 'hidden'` 裁切，導致每行末端文字遺失。

---

## 2. 解決架構與設計規格 (Architecture & Design Specification)

### 2.1 Tooltip 核心元件多維對齊擴充 (`Tooltip.tsx`)
在 `TooltipProps` 介面中新增可選的 `align` 屬性，提供精確的水平/垂直對齊控制：

```typescript
export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}
```

### 2.2 幾何定位與動態箭頭座標演算法
根據 `position` 與 `align` 組合，計算 Tooltip 氣泡本體與箭頭指示器 (`Arrow`) 之定位：

1. **`position="bottom" && align="right"` (右上角邊界最佳實踐)**：
   - 氣泡本體：`top: calc(100% + 8px)`, `right: 0`, `left: 'auto'`, `transform: 'none'`
   - 箭頭本體：`top: -3px`, `right: 8px`, `left: 'auto'`, `transform: 'rotate(45deg)'`
   - *效果*：氣泡右側與觸發圖示對齊，本體朝向左下方寬闊空間延展，箭頭精準指向圖示。
2. **`position="bottom" && align="left"`**：
   - 氣泡本體：`top: calc(100% + 8px)`, `left: 0`, `right: 'auto'`, `transform: 'none'`
   - 箭頭本體：`top: -3px`, `left: 8px`, `right: 'auto'`, `transform: 'rotate(45deg)'`
3. **`position="top" && align="right"`**：
   - 氣泡本體：`bottom: calc(100% + 8px)`, `right: 0`, `left: 'auto'`, `transform: 'none'`
   - 箭頭本體：`bottom: -3px`, `right: 8px`, `left: 'auto'`, `transform: 'rotate(45deg)'`
4. **`position="top" && align="left"`**：
   - 氣泡本體：`bottom: calc(100% + 8px)`, `left: 0`, `right: 'auto'`, `transform: 'none'`
   - 箭頭本體：`bottom: -3px`, `left: 8px`, `right: 'auto'`, `transform: 'rotate(45deg)'`
5. **預設置中相容性 (`align="center"`)**：
   - 維持既有 `left: 50%, transform: translateX(-50%)` 與箭頭置中旋轉邏輯，保持 100% 向後相容。

### 2.3 彈窗元件實作套用 (`LotsBreakdownModal.tsx`)
Header 右側會計方法切換器中的說明 Tooltip 明確配置為：
```tsx
<Tooltip content={ACCOUNTING_METHOD_LABELS[currentMethod].tooltip} position="bottom" align="right">
  <span style={{ fontSize: '0.75rem', cursor: 'help', opacity: 0.8 }}>ℹ️</span>
</Tooltip>
```

---

## 3. 驗收標準 (Acceptance Criteria, AC)

- [x] **AC-1 (Tooltip 對齊屬性支援)**：`Tooltip` 元件完整支援 `align="center" | "left" | "right"`，且預設值維持 `"center"`，不影響既有元件。
- [x] **AC-2 (指示箭頭動態對齊)**：當 `align="right"` 或 `align="left"` 時，指示箭頭依據 `8px` 內縮精確指向觸發元素，無位移偏差。
- [x] **AC-3 (彈窗 Header 說明完整呈現)**：`LotsBreakdownModal` Header 的會計方法說明氣泡在展開時，上緣與右緣均不被 Modal 容器的 `overflow: hidden` 裁切，內容 100% 完整可讀。
- [x] **AC-4 (品質門禁 - 單元測試)**：`npm test` 19 個測試套件、229 個測試全數通過。
- [x] **AC-5 (品質門禁 - 生產建置)**：`npm run build` TypeScript 0 錯誤且生產 bundle 建置成功。
