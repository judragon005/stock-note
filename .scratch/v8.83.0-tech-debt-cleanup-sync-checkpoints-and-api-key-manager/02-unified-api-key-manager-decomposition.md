# 02 — UnifiedApiKeyManager 視圖子元件模組化解耦重構 (Debt 0045)

**Parent:** Issue #193 / Spec 0171

**What to build:**
依據單一職責原則 (SRP) 將超過 1,000 行之 `UnifiedApiKeyManager.tsx` 解耦：
1. 提取 `GlobalProxyConfigCard.tsx`：負責自訂 Proxy URL 與 256-bit Web Crypto 狀態呈現。
2. 提取 `ApiKeyProviderCard.tsx`：負責單一供應商的標題資訊、說明連結、配額徽章、單金鑰輸入、多金鑰池展開清單、測活按鈕與冷卻計時器。
3. 收斂 `UnifiedApiKeyManager.tsx`：作為輕量化狀態調度容器，保持公開 Props 與匯出物件相容。

**Blocked by:** None — can start immediately

**Status:** closed

## Acceptance Criteria
- [x] 提取 `GlobalProxyConfigCard.tsx` 與 `ApiKeyProviderCard.tsx`。
- [x] `UnifiedApiKeyManager.tsx` 檔案大小顯著縮減，代碼職責分離清晰。
- [x] `src/components/UnifiedApiKeyManager.test.tsx` 所有測試全數通過（100% 綠燈）。
- [x] `src/components/SettingsWorkspaceIntegration.test.tsx` 整合測試通過。
- [x] Dark Glassmorphism 樣式與使用者操作體驗零退化。
