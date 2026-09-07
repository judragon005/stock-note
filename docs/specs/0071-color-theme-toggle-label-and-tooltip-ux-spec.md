# PRD #0071: 頂部工具列漲跌配色模式切換按鈕文案與 Tooltip 語意優化規格書 (Color Theme Toggle Label & Tooltip UX Spec)

- **版本**：v1.0.0
- **狀態**：`READY_FOR_IMPLEMENTATION`
- **日期**：2026-09-02
- **關聯 PRD**：
  - [PRD #0044: 全專案「慣用紅綠漲跌」色彩模式統一與 CSS 變數體系全面連動規格書](0044-color-theme-mode-unification-and-full-project-css-sync.md)
  - [PRD #0069: 全專案 UI/UX 設計系統升級與現代化玻璃擬態規範](0069-full-project-ui-ux-design-system-and-modern-glassmorphism-spec.md)
- **目標檔案**：
  - `src/components/Header.tsx` (修復配色按鈕文案與動態 Tooltip)
  - `src/components/Header.test.ts` (新增/更新按鈕文案與切換測試)

---

## Problem Statement (問題描述)

在系統頂部導航列 (`src/components/Header.tsx`) 中，提供讓使用者切換台股與美股/國際市場慣用漲跌顏色的切換按鈕。
然而目前按鈕的文字模板為：
```tsx
{colorTheme === 'taiwan' ? '🔴 綠跌' : '🟢 紅跌'}
```
這導致使用者在介面上看到：
1. 當處於國際/美股模式時，按鈕顯示為 `[調色盤] 🟢 紅跌`，使用者誤以為「綠色圓球代表紅跌」，產生嚴重的認知錯亂。
2. 當處於台股模式時，按鈕顯示為 `[調色盤] 🔴 綠跌`，缺少「漲」的標籤，語意殘缺。
3. Tooltip 僅為靜態字串，無法告知使用者當前模式及點擊後的目標切換效果。

---

## Solution (解決方案)

1. **修正雙色模式文字標籤**：
   - 當 `colorTheme === 'taiwan'` 時，按鈕文字顯示為：`🔴 紅漲 🟢 綠跌`
   - 當 `colorTheme === 'international'` 時，按鈕文字顯示為：`🟢 綠漲 🔴 紅跌`
2. **升級智慧 Tooltip 提示**：
   - 當處於台股模式：`目前模式：台股習慣 (紅漲綠跌)\n點擊切換為：國際/美股習慣 (綠漲紅跌)`
   - 當處於國際模式：`目前模式：國際/美股習慣 (綠漲紅跌)\n點擊切換為：台股習慣 (紅漲綠跌)`
3. **單元測試保護 (TDD)**：
   - 於 `Header.test.tsx` 中驗證在不同 `colorTheme` prop 傳入時，按鈕渲染的精確文字與點擊 `onToggleColorTheme` 事件觸發。

---

## User Stories (使用者故事)

1. As an active investor accustomed to Taiwan market conventions (台股習慣), I want the color toggle button to clearly display `🔴 紅漲 🟢 綠跌`, so that I immediately understand red indicates profit/gain and green indicates loss.
2. As a global US market investor (美股習慣), I want the color toggle button to clearly display `🟢 綠漲 🔴 紅跌`, so that I am never confused by mismatched green circles paired with red-loss labels.
3. As a user exploring the interface, I want hovering over the palette button to display a clear tooltip explaining the current active mode and the next mode it will switch to upon clicking, so that I have complete confidence in the action.
4. As a developer maintaining the codebase, I want unit tests in `Header.test.tsx` verifying both themes' text and toggle handlers, so that future refactoring will not introduce regression in label semantics.

---

## Implementation Decisions (實作決策)

### 1. Header.tsx 按鈕標籤與 Tooltip 規格

修改 `src/components/Header.tsx` 第 354-365 行附近：

```tsx
{/* Color Theme Toggle */}
<button
  className="btn btn-secondary btn-sm"
  onClick={onToggleColorTheme}
  title={
    colorTheme === 'taiwan'
      ? '目前模式：台股習慣 (紅漲綠跌)\n點擊切換為：國際/美股習慣 (綠漲紅跌)'
      : '目前模式：國際/美股習慣 (綠漲紅跌)\n點擊切換為：台股習慣 (紅漲綠跌)'
  }
  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px' }}
>
  <Palette size={13} color="var(--primary-color)" />
  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
    {colorTheme === 'taiwan' ? '🔴 紅漲 🟢 綠跌' : '🟢 綠漲 🔴 紅跌'}
  </span>
</button>
```

### 2. 資料流與持久化相容性
- `App.tsx` 既有的 `localStorage.getItem('stock_tracker_color_theme')`、`document.documentElement.setAttribute('data-color-theme', colorTheme)` 與狀態切換邏輯維持不變。
- `src/index.css` 與其他圖表元件已有完整支援，無需額外修改。

---

## Testing Decisions (測試決策)

### 1. 測試縫隙 (Test Seam)
- 在公開元件介面 `Header` 上進行渲染與行為測試（`src/components/Header.test.ts`）。

### 2. 測試案例清單
1. **台股模式渲染驗證**：傳入 `colorTheme="taiwan"`，斷言按鈕包含文字 `🔴 紅漲 🟢 綠跌`，且 `title` 包含相應提示。
2. **國際模式渲染驗證**：傳入 `colorTheme="international"`，斷言按鈕包含文字 `🟢 綠漲 🔴 紅跌`，且 `title` 包含相應提示。
3. **點擊事件觸發驗證**：點擊配色按鈕，斷言 `onToggleColorTheme` 被呼叫 1 次。

---

## Out of Scope (範疇外事項)

- 不更動 CSS 變數數值或色彩配方（`--gain-color`, `--loss-color` 維持現有規範）。
- 不新增第三種色彩模式（如色盲友善藍橘模式等，後續若有需求再行評估）。

---

## Further Notes (後續備註)

- 此修復遵循 KISS 原則，以最小改動精準解決視覺與認知語意衝突問題。
