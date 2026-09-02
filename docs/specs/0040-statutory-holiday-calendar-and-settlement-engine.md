# PRD #0040: 法定國定假日休市日曆與精確交割結算引擎規格書 (Statutory Holiday Calendar & Settlement Precision Engine)

- **版本**：v5.6.0
- **日期**：2026-08-28
- **狀態**：`IMPLEMENTED`
- **關聯技術債**：[docs/debts/0006-statutory-holiday-calendar-and-settlement-precision.md](../debts/0006-statutory-holiday-calendar-and-settlement-precision.md)
- **目標模組**：
  - `src/engine/holidayCalendar.ts` (新增)
  - `src/engine/cashLedgerEngine.ts` (升級)
  - `src/engine/holidayCalendar.test.ts` (新增)
  - `src/engine/cashLedgerEngine.test.ts` (擴充)

---

## 1. 問題陳述與業務背景 (Problem Statement & Business Context)

### 1.1 現行痛點分析
目前系統在 `src/engine/cashLedgerEngine.ts` 中之 `calculateSettlementDate(tradeDateStr, market)` 僅跳過「週六 (6) 與週日 (0)」推算交割日：
1. **台股 (TWSE / TPEx, T+2)**：遇到長達 7~11 天的農曆春節連續休市、二二八、清明、端午、中秋、國慶、元旦等國定假日，推算之交割日會提早 1~7 天發生。
2. **美股 (NYSE / NASDAQ, T+1)**：2024 年 5 月 28 日起全面實施 T+1 結算，但遇到馬丁路德金紀念日、華盛頓誕辰、耶穌受難日、陣亡將士紀念日、六月節、獨立日、勞動節、感恩節、聖誕節時，推算之交割日亦會提早到達。
3. **財務數據失真衝擊**：
   - 待交割在途款 (`pendingReceivables` / `pendingPayables`) 會在假期中提前清零並計入實質可用現金 (`settledCash`)。
   - 導致現金帳本中的可用餘額與交易購買力 (Trading Buying Power) 在長假期間出現虛假的時態偏差。

---

## 2. 核心架構與設計規格 (Architecture & Design Specification)

### 2.1 本地休市日曆模組 (`src/engine/holidayCalendar.ts`)
遵循 100% 離線優先 (Offline-first) 與 $O(1)$ 查詢效率，內建 2023～2030 年台美雙市場法定休市日清單。

#### 2.1.1 資料結構與常數定義
```typescript
export type MarketType = 'TW' | 'US';

/**
 * 台股 (TWSE/TPEx) 證券市場休市日曆表 (2023 ~ 2030)
 * 包含：元旦、春節農曆封關期間、和平紀念日、清明/兒童節、勞動節、端午節、中秋節、國慶日等
 * 附註：依金管會規範，週六公務補班日證券市場一律休市不交易不交割。
 */
export const TW_MARKET_HOLIDAYS: ReadonlySet<string>;

/**
 * 美股 (NYSE/NASDAQ/SIFMA) 證券市場休市日曆表 (2023 ~ 2030)
 * 包含：元旦、馬丁路德金紀念日、總統日、耶穌受難日、陣亡將士紀念日、六月節、獨立日、勞動節、感恩節、聖誕節等
 */
export const US_MARKET_HOLIDAYS: ReadonlySet<string>;
```

#### 2.1.2 核心純函式 API
```typescript
/**
 * 檢查給定日期是否為特定市場之法定休市假日 (不含一般週末)
 */
export function isMarketHoliday(dateStr: string, market: MarketType): boolean;

/**
 * 檢查給定日期是否為特定市場之有效營業日 (非週末 且 非法定休市日)
 */
export function isBusinessDay(dateStr: string, market: MarketType): boolean;

/**
 * 取得給定日期之後的下一個營業日 (若當天為非營業日，則尋找 >= 當天之最近營業日或嚴格次營業日)
 */
export function getNextBusinessDay(dateStr: string, market: MarketType): string;
```

---

### 2.2 交割日計算升級 (`src/engine/cashLedgerEngine.ts`)

升級 `calculateSettlementDate`，將原先單純的週末過濾替換為 `isBusinessDay` 判斷：

```typescript
export function calculateSettlementDate(tradeDateStr: string, market: 'TW' | 'US' = 'TW'): string {
  const parts = tradeDateStr.split('-');
  if (parts.length !== 3) return tradeDateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));

  if (isNaN(d.getTime())) return tradeDateStr;

  // 台股 T+2 營業日，美股 (2024 SEC 新制) T+1 營業日
  let businessDaysToAdd = market === 'TW' ? 2 : 1;

  while (businessDaysToAdd > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const currentDateStr = d.toISOString().split('T')[0];

    // 結合週末與休市日曆之營業日檢驗
    if (isBusinessDay(currentDateStr, market)) {
      businessDaysToAdd--;
    }
  }

  return d.toISOString().split('T')[0];
}
```

---

### 2.3 防禦性與超出範圍降級機制 (Graceful Fallback)
- 當交易日或計算日期超出 2023～2030 內建日曆範圍時，`isMarketHoliday` 回傳 `false`，系統自動無縫降級回標準的週末過濾機制（`dayOfWeek !== 0 && dayOfWeek !== 6`），絕不拋出異常。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

- [x] **AC-1 (休市日曆模組完整性)**：`src/engine/holidayCalendar.ts` 完整導出 `isMarketHoliday`、`isBusinessDay`、`getNextBusinessDay`，並收錄 2023～2030 年台美兩地完整休市日。
- [x] **AC-2 (台股春節封關與長假交割精確性)**：
  - 2026 年春節前最後交易日買進之台股，T+2 交割日精確推算至春節開紅盤後之營業日（而非假期中）。
  - 清明、端午、中秋、國慶連假期間之 T+2 推算均正確跳過假期。
- [x] **AC-3 (美股 T+1 國定假日交割精確性)**：
  - 美股在感恩節 (週四) 或聖誕節前一日交易，T+1 交割日精確跳過國定休市日與週末順延至下一個營業日。
- [x] **AC-4 (超出日曆邊界安全降級)**：對於 2031 年或更遠之日期，系統自動維持標準週末過濾，不崩潰且回傳合法日期格式。
- [x] **AC-5 (單元測試 100% 覆蓋)**：
  - 新增 `src/engine/holidayCalendar.test.ts` 測試所有休市日與營業日判斷。
  - 更新 `src/engine/cashLedgerEngine.test.ts` 包含長假邊界案例。
- [x] **AC-6 (品質門禁與文檔同步)**：
  - `npm test` 100% 通過。
  - `npm run build` TypeScript 0 錯誤。
  - 同步更新 `CONTEXT.md`、`docs/adr/0040-statutory-holiday-calendar-and-settlement-engine.md` 與 `docs/debts/README.md`。
