# Ticket #3: [UI/UX] 整合式設定工作台 (SettingsWorkspace) 元件實作

- **狀態**: Completed
- **規格書**: [SPEC-0016](../../../docs/specs/0016-settings-workspace-and-api-key-configuration.md)
- **架構決策**: [ADR-0016](../../../docs/adr/0016-settings-workspace-and-api-key-configuration.md)

---

## 任務目標 (Objective)
建立完整的 `SettingsWorkspace.tsx` 元件，整合券商帳戶、摩擦深度分析與外部 API 金鑰三大設定模組。

---

## 實作範圍 (Scope)
1. **元件實作 (`src/components/SettingsWorkspace.tsx`)**：
   - 模組 1: 券商帳戶管理與範本庫。
   - 模組 2: 摩擦成本 4 大發光看板與優化對策。
   - 模組 3: 外部 API 金鑰管理區塊（密碼遮罩、儲存提示）。
2. **應用層整合 (`src/App.tsx`)**：
   - 掛載 `SettingsWorkspace`，並串接 API 金鑰持久化。

---

## 驗收條件 (Acceptance Criteria)
- [ ] 設定頁面三模組版面清晰、高質感。
- [ ] API Key 輸入可正常切換遮罩與儲存。
- [ ] 全量測試通過，Build 0 錯誤。
