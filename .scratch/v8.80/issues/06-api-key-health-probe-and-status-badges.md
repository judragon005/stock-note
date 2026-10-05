# 06-api-key-health-probe-and-status-badges

## Description
在 API 金鑰池介面中實作即時健康度探針（Health Probe）與狀態徽章。使用者可點擊「測試連線」驗證 Key 的有效性，UI 即時顯示健康燈號（綠燈正常、黃燈冷卻中、紅燈失效、橘燈額度耗盡），並展示今日調用量與配額比例進度條。

## Target Files
- `src/components/ApiKeyPoolManager.tsx`
- `src/engine/apiKeyHealthProbe.ts`

## Acceptance Criteria
- [x] 實作 `probeApiKey(provider, key)` 探針函式，向各供應商的輕量端點（如 FinMind ping/user_info 或 FRED category）發出驗證請求。
- [x] UI 上為每組 Key 渲染即時狀態徽章：
  - 綠燈 `正常 (Healthy)`
  - 黃燈 `冷卻中 (Cooling)`：附帶剩餘冷卻秒數倒數
  - 橘燈 `額度耗盡 (Quota Exceeded)`
  - 紅燈 `無效/已拉黑 (Invalid)`
- [x] 提供「一鍵全池健康檢測」按鈕，依序進行非同步探針測試並更新狀態。
- [x] 編寫測試驗證探針回傳 200, 429, 401 時 UI 徽章與狀態之精準對齊。

## Status
- [x] done
