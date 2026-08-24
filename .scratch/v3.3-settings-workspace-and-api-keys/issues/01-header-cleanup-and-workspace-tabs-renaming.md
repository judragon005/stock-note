# Ticket #1: [UI/UX] Header 頂部按鈕精簡與活頁籤更名為設定

- **狀態**: Completed
- **規格書**: [SPEC-0016](../../../docs/specs/0016-settings-workspace-and-api-key-configuration.md)
- **架構決策**: [ADR-0016](../../../docs/adr/0016-settings-workspace-and-api-key-configuration.md)

---

## 任務目標 (Objective)
移除 Header 頂部的 `[ 💸 摩擦成本 ]` 與 `[ ⚙️ 券商設定 ]` 按鈕，並將第三個活頁標籤更名為 `⚙️ 設定`，支援向後相容。

---

## 實作範圍 (Scope)
1. **Header 元件 (`src/components/Header.tsx` & `src/App.tsx`)**：
   - 移除摩擦成本與券商設定按鈕與相關 props。
2. **活頁標籤元件 (`src/components/WorkspaceTabs.tsx`)**：
   - `WorkspaceTabKey` 支援 `'settings'` (相容 `'friction'`)。
   - 標籤文字顯示為 `⚙️ 設定`。

---

## 驗收條件 (Acceptance Criteria)
- [ ] Header 頂部乾淨無冗餘按鈕。
- [ ] 活頁籤第三項顯示為 `⚙️ 設定` 且可正常點擊切換。
