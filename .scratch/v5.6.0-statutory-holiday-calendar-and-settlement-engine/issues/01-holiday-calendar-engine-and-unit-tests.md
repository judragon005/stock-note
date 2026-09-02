# 任務票券 #01: 台美雙市場法定休市日曆常數表與純函式查詢模組開發

- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **負責模組**:
  - `src/engine/holidayCalendar.ts` (新增)
  - `src/engine/holidayCalendar.test.ts` (新增)

---

## 🎯 任務目標
建立具備 100% 離線優先、零延遲 $O(1)$ 查詢效率的休市日曆核心模組，收錄 2023～2030 年台股 (TWSE/TPEx) 與美股 (NYSE/NASDAQ/SIFMA) 完整法定休市日清單，並提供純函式判斷介面與單元測試。

---

## 📋 實作細節與設計規格

1. **休市日資料常數表 (`TW_MARKET_HOLIDAYS`, `US_MARKET_HOLIDAYS`)**：
   - 使用 `ReadonlySet<string>` 封裝 `YYYY-MM-DD` 字串。
   - 台股收錄：元旦、春節農曆封關假期 (2023~2030 每年度之封關交易日至開紅盤日)、和平紀念日、兒童/清明節、勞動節、端午節、中秋節、國慶日。
   - 美股收錄：元旦、馬丁路德金紀念日、華盛頓誕辰 (總統日)、耶穌受難日、陣亡將士紀念日、六月節、美國獨立日、勞動節、感恩節、聖誕節。
2. **核心純函式實作**：
   - `isMarketHoliday(dateStr: string, market: 'TW' | 'US'): boolean`：檢查是否為休市日（不含週末）。
   - `isBusinessDay(dateStr: string, market: 'TW' | 'US'): boolean`：非週末且非休市日。
   - `getNextBusinessDay(dateStr: string, market: 'TW' | 'US'): string`：取得下一有效營業日。
3. **安全降級機制 (Graceful Fallback)**：
   - 若日期年份不在 2023～2030 範圍內，安全降級為僅依據週末 (週六/週日) 判斷，不拋出任何例外。
4. **TDD 單元測試覆蓋 (`holidayCalendar.test.ts`)**：
   - 驗證台股春節連續假期間之 `isMarketHoliday` 與 `isBusinessDay` 判定。
   - 驗證台股週六補上班日仍為證券休市日 (非營業日)。
   - 驗證美股主要節日與感恩節次日等判定。
   - 驗證超出範圍年份之降級回傳。

---

## 驗收標準 (AC)
- [x] `src/engine/holidayCalendar.ts` 完整導出所有介面與常數。
- [x] `src/engine/holidayCalendar.test.ts` 涵蓋所有核心情境且測試 100% 通過。
