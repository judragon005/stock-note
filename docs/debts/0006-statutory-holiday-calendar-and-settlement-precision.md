# 技術債 #0006: 法定國定假日休市日曆與精確交割結算引擎 (Statutory Holiday Calendar & Settlement Precision)

- **狀態**：`RESOLVED` (已於 v5.6.0 ADR #0040 完整解決)
- **優先級**：`P2`
- **發現來源**：/ask-matt 全量架構與計算驗證審查 (Gap Analysis)
- **建立日期**：2026-08-26
- **解決日期**：2026-08-28
- **標籤**：`Accounting` · `Precision` · `Settlement` · `Engine`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統於 `src/engine/cashLedgerEngine.ts` 中的 `calculateSettlementDate` 函式實現了台股 (T+2) 與美股 (T+1，相容 2024 SEC 新法規) 的交割日自動推算。

現行實作如下：
```typescript
let businessDaysToAdd = market === 'TW' ? 2 : 1;
while (businessDaysToAdd > 0) {
  d.setUTCDate(d.getUTCDate() + 1);
  const dayOfWeek = d.getUTCDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    businessDaysToAdd--;
  }
}
```
現行演算法僅跳過了標準週六 (6) 與週日 (0)。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. 金融市場遇到國定休假日（如台股農曆春節連續休市 7~10 天、清明、端午、中秋、國慶、元旦，以及美股馬丁路德金紀念日、華盛頓誕辰、耶穌受難日、陣亡將士紀念日、六月節、獨立日、勞動節、感恩節、聖誕節）時，銀行交割與證券結算均停止作業。
  2. 現行僅過濾週末之演算法，在長假期間會使推算之 `settlementDate` 提早於真實券商扣款日，導致現金帳本中之「待交割在途款 (`pendingSettlementAmount`)」提早轉為「實質已交割可用現金 (`balance`)」，產生 1~7 天的時間差。
* **暫緩理由**：
  1. 平日無連續假期時，週末過濾已能滿足 95% 以上之日常交易交割日對齊。
  2. 國定假日需維護特定年度之休市日曆表，先立案為 P2 技術債，待交割帳本深度優化時統一建置。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **建立市場休市日曆模組 (`src/engine/holidayCalendar.ts`)**：
   - 內建台股 (TWSE) 與美股 (NYSE/NASDAQ/Fed) 之歷史與未來 3 年國定休市清單 (YYYY-MM-DD)。
   - 提供 `isMarketHoliday(dateStr: string, market: MarketType): boolean` 判斷函式。
2. **升級交割日計算邏輯**：
   ```typescript
   export function calculateSettlementDate(tradeDateStr: string, market: 'TW' | 'US' = 'TW'): string {
     // ...
     while (businessDaysToAdd > 0) {
       d.setUTCDate(d.getUTCDate() + 1);
       const dayOfWeek = d.getUTCDay();
       const currentDateStr = d.toISOString().split('T')[0];
       const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
       const isHoliday = isMarketHoliday(currentDateStr, market);
       
       if (!isWeekend && !isHoliday) {
         businessDaysToAdd--;
       }
     }
     return d.toISOString().split('T')[0];
   }
   ```
3. **擴充單元測試**：
   - 針對台股春節封關與開紅盤交割日編寫邊界測試案例。
   - 針對美股感恩節與聖誕節編寫 T+1 跨節日交割測試案例。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者主動指示校準長假交割扣款時點。
2. 使用者反映春節或跨年期間交割帳本出現扣款時態微小落差。
