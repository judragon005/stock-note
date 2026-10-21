# 06-settings-workspace-integration-and-styling

## Description
在 `src/components/SettingsWorkspace.tsx` 中替換並掛載全新的 `UnifiedApiKeyManager`。移除原本上下重複的「第二區塊：外部金融資料 API 金鑰管理」與舊的 `<ApiKeyPoolManager />` 標籤，使設定頁面結構乾淨精煉，並確保資料保存無縫相容現有 LocalStorage 與 IndexedDB。

## Target Files
- `src/components/SettingsWorkspace.tsx`
- `src/components/SettingsWorkspace.test.tsx`

## Acceptance Criteria
- [x] 移除 `SettingsWorkspace.tsx` 中舊的獨立金鑰配置區塊（第 787-930 行）與獨立 `<ApiKeyPoolManager />`。
- [x] 導入並掛載 `<UnifiedApiKeyManager />` 作為唯一金鑰管理面板。
- [x] 保持現有資料保存邏輯的向下相容，既有已儲存的 FinMind、FMP、Proxy URL 等設定不遺失。
- [x] 既有單元測試 `SettingsWorkspaceIntegration.test.tsx`、`UnifiedApiKeyManager.test.tsx` 100% PASS，無型別報錯。

## Status
- [x] done
