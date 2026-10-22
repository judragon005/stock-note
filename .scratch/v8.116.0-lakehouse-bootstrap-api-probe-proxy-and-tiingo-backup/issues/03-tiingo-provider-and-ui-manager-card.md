# 03 — Tiingo 供應商金鑰池定義與 UI 設定卡片

**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** None — can start immediately

**What to build:**
使用者在「設定 ➔ API 金鑰設定」頁面中看到全新的「Tiingo」供應商卡片，支援 Token 輸入、安全遮罩、本地 Web Crypto 256-bit 加密儲存，並提供每日 500 次配額說明與官方註冊導流連結。

**Acceptance criteria:**
- [ ] 於 `src/engine/apiKeyPoolTypes.ts` 擴充 `ProviderType` 包含 `'tiingo'`，預設配額 500 次/日
- [ ] 於 `src/components/UnifiedApiKeyManager.tsx` 與卡片組件中渲染 Tiingo 卡片與官方申請連結
- [ ] 支援金鑰輸入、遮罩顯示、本機加密持久化與刪除
- [ ] 編寫組件測試驗證 Tiingo 卡片互動與資料保存正確性
