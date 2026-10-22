# 04 — Tiingo API 專屬測活探針與端點整合

**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** 01 — 本地測活代理中繼路由端點 (Vite Middleware), 03 — Tiingo 供應商金鑰池定義與 UI 設定卡片

**What to build:**
使用者在設定頁面 Tiingo 卡片點擊「測試連線」時，系統能透過本地代理端點發送請求至 Tiingo 官方驗證端點，驗證 Token 有效性並在介面展示連線狀態、響應延遲與配額，若失敗則穿透顯示 Tiingo 回傳之具體原因。

**Acceptance criteria:**
- [ ] 於 `src/engine/apiKeyHealthProbe.ts` 註冊 Tiingo 測活端點：`https://api.tiingo.com/tiingo/daily/aapl/prices?token=${key}`
- [ ] 支援經由本地中繼代理轉發，解析 Tiingo 之 200/401/403/429 回應
- [ ] 設定頁面單鍵測活 Tiingo 能夠正確呈現綠燈或穿透之錯誤訊息
- [ ] 撰寫單元測試驗證 Tiingo 測活探針邏輯
