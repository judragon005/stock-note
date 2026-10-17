# 08 — 24H 當日快取鎖定與舊版 Schema 自動升級清洗

**Parent:** #283

**What to build:**
實作當日 24H 快取鎖定判定（保護免費 API 配額，頻繁切換分頁發出 0 次網路請求），並實作舊版 LocalStorage 儲存資料的升級清洗機制（`sanitizeMacroRecord`），補齊所有新增欄位之預設值，徹底杜絕升級後 `undefined.toFixed()` 造成的白屏崩潰。

**Blocked by:** 01-macro-thermometer-engine, 02-us-credit-canary-indicators, 03-tw-chips-canary-indicators

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/utils/macroPulseStorage.ts` 實作 `isSameDayCacheValid(lastUpdatedTimestamp: number): boolean`。
- [ ] `src/utils/macroPulseStorage.ts` 實作 `sanitizeMacroRecord(record: Partial<MacroIndicatorSnapshot>): MacroIndicatorSnapshot`，安全回填預設值。
- [ ] `loadMacroPulseHistory()` 在讀取資料時自動經過 `sanitizeMacroRecord()` 清洗。
- [ ] 單元測試 `src/utils/macroPulseStorage.test.ts` 驗證舊版缺少 OAS、CDS、期貨空單、水溫分之記錄在載入後能安全補齊，且 `isSameDayCacheValid` 正確判斷跨日。
