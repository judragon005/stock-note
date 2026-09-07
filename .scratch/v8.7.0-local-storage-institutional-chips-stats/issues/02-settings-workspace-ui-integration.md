# Issue #87-2: 設定面板 UI 籌碼筆數展示與清空按鈕整合 (Settings Workspace UI Integration)

- **標籤**: `ready-for-agent`
- **所屬版本**: v8.7.0
- **依賴任務**: Issue #87-1

## 任務描述
1. 在 `SettingsWorkspace.tsx` 中的「2. 行情與市場快取」列表中，加入「三大法人籌碼日報 (institutionalChips)」統計項目。
2. 在重置按鈕區塊，加入「🗑️ 清空籌碼快取」按鈕，綁定 `clearInstitutionalChipsCache()`。
3. 編寫單元測試驗證 `SettingsWorkspace` 的按鈕觸發與統計顯示。

## 驗收標準
- [ ] 介面正確渲染三大法人籌碼日報天數與筆數。
- [ ] 具備清空籌碼快取按鈕與彈窗確認。
- [ ] 單元測試通過。
