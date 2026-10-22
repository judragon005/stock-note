# 02 — 既有金鑰探針修復與真實錯誤穿透 (FRED / FMP / FinMind)

**Category:** bug
**Status:** closed
**Blocked by:** 01 — 本地測活代理中繼路由端點 (Vite Middleware)

**What to build:**
使用者在設定頁面測試 FRED、FMP、FinMind 等金鑰時，不再看見「連線失敗 (HTTP 0)」的假死情況。探針引擎優先走本地 `/api/market/probe-key` 中繼代理；FMP 改用免費相容端點 `/api/v3/profile/AAPL`；FinMind 正確處理 400 錯誤；當金鑰失效或配額用盡時，介面能精確顯示第三方 JSON 報錯訊息（如「今日已滿 25 次」、「Token is invalid」）。

**Acceptance criteria:**
- [x] 修正 `src/engine/apiKeyHealthProbe.ts` 之 FMP 測試端點為 `/api/v3/profile/AAPL`
- [x] 探針請求優先委派本地代理，徹底免除瀏覽器 CORS 扼殺
- [x] 精確解析第三方錯誤 JSON 並傳遞給 UI，消除錯誤吞噬
- [x] 靜態或離線環境下具備友善降級提示，不誤判為金鑰失效
- [x] 單元測試驗證各 API 在正常、金鑰錯誤與配額耗盡時之探針診斷結果

