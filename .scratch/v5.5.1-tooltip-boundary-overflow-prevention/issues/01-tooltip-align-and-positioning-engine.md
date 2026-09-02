# Ticket #01: Tooltip 元件多維對齊擴充與箭頭動態定位演算法

- **關聯 PRD**: [docs/specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md](../../docs/specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md)
- **狀態**: `RESOLVED`
- **負責目標**: `src/components/common/Tooltip.tsx`

---

## 🎯 任務目標
升級 `src/components/common/Tooltip.tsx`，支援 `align?: 'center' | 'left' | 'right'`，並實現精確的氣泡座標與旋轉指示箭頭位置計算。

---

## 🛠️ 實作要點
1. 擴充 `TooltipProps` 定義 `align?: 'center' | 'left' | 'right'`。
2. 抽離可測試純函數 `getTooltipPositionStyles(position, align)` 與 `getTooltipArrowStyles(position, align)`。
3. 當 `position="bottom" && align="right"` 時：
   - 氣泡設定 `top: calc(100% + 8px)`, `right: 0`, `left: 'auto'`, `transform: 'none'`。
   - 箭頭設定 `top: -3px`, `right: 8px`, `left: 'auto'`, `transform: 'rotate(45deg)'`。
4. 維持預設 `align="center"` 之置中位移邏輯，確保 100% 向後相容。

---

## 驗收條件 (AC)
- [x] `Tooltip.tsx` 導出型別與純函數輔助器。
- [x] 四方位搭配三種對齊模式均能正確計算 CSS 樣式物件。
