# 01 — 頂部導航列漲跌色彩切換按鈕文字對稱化與智慧 Tooltip 升級 (Color Theme Toggle Label & Tooltip UX)

**What to build:** 
在頂部導航列 (`Header`) 中，將漲跌色彩模式切換按鈕的標籤由容易混淆的單色詞綴（如 `🟢 紅跌` / `🔴 綠跌`）升級為完整對稱的雙色標籤（台股模式為 `🔴 紅漲 🟢 綠跌`，國際/美股模式為 `🟢 綠漲 🔴 紅跌`），並為該按鈕配置動態 Tooltip 說明當前模式與點擊後的切換效果。同時編寫 `Header.test.ts` 單元測試確保行為與渲染 100% 符合規格。

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance Criteria (驗收條件)

- [x] **台股模式標籤渲染**：當 `colorTheme === 'taiwan'` 時，按鈕文字精確顯示為 `🔴 紅漲 🟢 綠跌`。
- [x] **國際模式標籤渲染**：當 `colorTheme === 'international'` 時，按鈕文字精確顯示為 `🟢 綠漲 🔴 紅跌`。
- [x] **動態 Tooltip 提示**：
  - 台股模式 Tooltip 提示包含：`目前模式：台股習慣 (紅漲綠跌)\n點擊切換為：國際/美股習慣 (綠漲紅跌)`
  - 國際模式 Tooltip 提示包含：`目前模式：國際/美股習慣 (綠漲紅跌)\n點擊切換為：台股習慣 (紅漲綠跌)`
- [x] **點擊事件正常觸發**：點擊按鈕時確實觸發 `onToggleColorTheme` 回呼函式。
- [x] **單元測試全綠**：新增或更新 `src/components/Header.test.ts`，測試 100% 通過。
