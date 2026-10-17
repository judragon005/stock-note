# 06 — 實作外部免費資料管道與背景靜默更新服務 (src/engine/catalystSyncService.ts)

**Parent:** #281

**What to build:**
實作零依賴、純前端防禦的外部免費財經事件同步管道，自動補強台美股即將登場之官方重大日程：
1. **TWSE 官方開放端點 (100% 免費、免 Key)**：
   - 抓取除權除息預告表 (`/v1/exchangeReport/TWT48U`) 與法說會時程 (`/v1/opendata/t187ap04_L`)。
   - 解析出日期在未來 30 天內的重磅事件。
2. **Finnhub 免費經濟日曆端點 (選用)**：
   - 若使用者有在設定中填寫 Finnhub API Key，則在背景拉取未來 14 天的全球重磅經濟數據（CPI、非農、FOMC）。
3. **優雅降級與 24H 本地快取 (Graceful Fallback & TTL Cache)**：
   - 網路錯誤、CORS 阻斷或超時時，自動安全略過，絕不影響第一軌（本地常態種子）之正常顯示。
   - 抓取成功後沉澱於 `STORAGE_KEY_REMOTE_CATALYSTS_CACHE`，快取效期 24 小時。

**Blocked by:** Ticket 05

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 模擬 TWSE OpenAPI 回傳之法說會與除息預告資料，能正確解析為標準 `UpcomingCatalyst` 格式。
- [ ] 遭遇網路異常或 HTTP 429 時，函式靜默降級回傳空陣列或快取，不拋出未捕獲例外。
- [ ] 撰寫單元測試驗證解析邏輯與錯誤降級保護。
