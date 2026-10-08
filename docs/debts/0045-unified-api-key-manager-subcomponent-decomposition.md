# 技術債 0045: UnifiedApiKeyManager 視圖子元件模組化解耦重構

- **建立日期**: 2026-10-07
- **來源**: /code-review 雙軸審查 (Spec 0168 / Issue #182 / PR #183)
- **狀態**: `RESOLVED`
- **解決版本**: v8.83.0 (Spec 0171 / Issue #193)
- **優先級**: `P3 (Low)`
- **標籤**: `Refactor` · `UI` · `CleanCode` · `SettingsWorkspace` · `UnifiedApiKeyManager`

---

## 1. 現況與背景 (Context)

在 v8.81.0 (Spec 0168) 中，我們為解決舊版系統設定頁面金鑰輸入框割裂、重複白底原生 `<input>` 等問題，打造了全新的 `src/components/UnifiedApiKeyManager.tsx`。
該元件成功將多個外部金融資料供應商（FinMind、Finnhub、FMP、FRED、CoinGecko）整合成統一現代暗黑毛玻璃（Dark Glassmorphism）控制台，並支援 Web Crypto 256-bit 本地加密儲存與單鍵防連點測活。

在本次 `/code-review` 雙軸審查中，識別出以下設計權衡（Trade-off）：
- 目前 `UnifiedApiKeyManager.tsx` 檔案大小約 1,000 行。
- 為了確保狀態流、本地加密解密與測活生命週期高度內聚，目前全域 Proxy 設定卡片與所有 Provider 設定卡片均收斂在同一檔案內。
- 雖然目前 100% 綠燈且執行穩定，但若未來持續擴充第 7、第 8 組以上金融 API 時，單一視圖檔案將進一步膨脹。

---

## 2. 建議重構方向 (Proposed Refactoring)

在未來需要引入新金融資料供應商或改進金鑰池架構時，依據職責分離 (SRP) 原則進行子元件解耦：

1. **提取全域通道設定卡片 (`GlobalProxyConfigCard.tsx`)**：
   - 負責自訂反向代理伺服器端點 (Proxy URL) 輸入與 Web Crypto 256-bit 加密狀態指示器。
2. **提取通用供應商配置卡片 (`ApiKeyProviderCard.tsx`)**：
   - 將單一供應商的卡片渲染邏輯（包含主要金鑰快捷輸入、多金鑰池輪替展開面板、單鍵測活按鈕與冷卻計時器）收斂為高複用之呈現元件 (Presentational Component)。
3. **保持狀態容器輕量化 (`UnifiedApiKeyManager.tsx`)**：
   - 僅負責管理金鑰池整體狀態、呼叫 `apiKeyStorage` 與 `apiKeyHealthProbe`，不再直接堆疊龐大的 JSX 標籤層次。

---

## 3. 觸發時機 (Trigger Condition)

- 當專案規劃引入第 7 組以上全新金融資料源（如 Polygon、Tiingo、MacroMicro 等）時。
- 或當金鑰池需要支援多環境配置、匯出匯入等新功能時順手實施，避免無業務價值之過度工程化純重構。

---

## 4. 解決紀錄 (Resolution)

- **實作日期**: 2026-10-08
- **實作 PR**: Issue #193 (Spec 0171)
- **變更詳情**: 將 `UnifiedApiKeyManager.tsx` 依職責拆解為 `GlobalProxyConfigCard.tsx` 與 `ApiKeyProviderCard.tsx` 兩個獨立子元件，檔案大小由 1,014 行縮減至 390 行，公開 Props 與常數匯出保持 100% 向後相容，測試 100% 通過。
