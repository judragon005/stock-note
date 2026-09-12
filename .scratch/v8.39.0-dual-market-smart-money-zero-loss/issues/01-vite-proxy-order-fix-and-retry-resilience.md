# Ticket 01: Vite 代理順序修復、路徑精確隔離與指數退避重試機制

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0120-dual-market-smart-money-zero-loss-and-atomic-resilience-spec.md` (模組一)
- 關聯 Issue: #35
- 標籤: `enhancement,ready-for-agent`

## 任務目標
徹底根除 `vite.config.ts` 中因 `/api/twse` 規則排在 `/api/twse-www` 前面所造成的反向代理前綴遮蔽 (Prefix Shadowing) 缺陷，修復 TWSE 上市數據 100% 回傳 404 的致命錯誤；並在抓取邏輯中加入指數退避重試機制（Retry 3 次），避免偶發網路瞬斷導致整日數據跳過。

## 具體修改清單
1. **`vite.config.ts`**：
   - 將 `'/api/twse-www'` 代理規則移至 `'/api/twse'` 之前。
   - 確保 `/api/twse-www/rwd/zh/fund/T86...` 正確轉發至 `https://www.twse.com.tw` 並回傳 200 與完整上市 JSON。
2. **`src/engine/smartMoneyFetcher.ts`**：
   - 實作具備指數退避的重試抓取函數 `fetchWithRetry(url, customFetch, maxRetries = 3)`。
   - 在抓取 TWSE 與 TPEx 時接入重試邏輯，杜絕網路抖動。
3. **單元測試 (`src/engine/priceFetcher.test.ts` & `src/engine/smartMoneyFetcher.test.ts`)**：
   - 驗證 `/api/twse-www` 優先於 `/api/twse`。
   - 驗證重試機制在遭遇瞬斷時能自動重試並成功。

## 驗收標準
- [ ] 本地 `http://localhost:3000/api/twse-www/rwd/zh/fund/T86?response=json&date=20260911&selectType=ALLBUT0999` 回傳 status 200 與 1,330 檔上市數據。
- [ ] `npm test src/engine/priceFetcher.test.ts` 100% 通過。
