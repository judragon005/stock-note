# 03 — 設定工作區金鑰遮罩防窺與主密碼解鎖 UI (Key Masking & Master Passphrase UI)

**What to build:**
升級 `SettingsWorkspace.tsx` 設定面板中的 API 金鑰管理區塊。所有敏感金鑰欄位（FinMind Token、FMP API Key、AlphaVantage Key）在顯示時預設進行防窺遮罩處理（例如：`sk-fmp****8a2f`），並提供眼睛圖示按鈕支援「暫時明文檢視/隱藏」。新增「主解鎖密碼 (Master Passphrase) 管理卡片」，允許使用者設定或更換主密碼，當主密碼處於鎖定狀態時提示解鎖，解鎖失敗給予震動或錯誤警示，成功後短暫解密進記憶體，保護公用環境與家庭環境下的視覺隱私。

**Blocked by:** 01 — Web Crypto Core Engine, 02 — Secure Storage Persistence & Migration

**Status:** complete

- [x] 設定工作區 API 金鑰輸入框預設以遮罩格式（如 `sk-fmp****8a2f`）呈現，提供一鍵明文/遮罩切換開關
- [x] 提供「安全防護狀態徽章」（已加密 / 明文待升級 / 已使用主密碼鎖定）
- [x] 實作「主解鎖密碼設定與變更」互動面板，支援舊密碼驗證與重加密流程
- [x] 密碼輸入錯誤時呈現明確資安警示，避免無限次盲試
- [x] 確保解密後的明文金鑰僅保留於元件內部記憶體生命週期，不洩漏至全域變數或控制台日誌
