# Ticket 01: 建立台灣證券市場法定演算法交易日曆 (Spec 0170)

## 1. 任務核心 (Core Objective)
建立純演算法、零外部檔案依賴的台灣證券市場法定交易日曆引擎 (`trading-calendar-engine.cjs`)，取代過去讀取硬碟 `TAIEX_history_all.csv` 的作法。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/trading-calendar-engine.cjs` (新建)
- `scripts/market-sync/trading-calendar-engine.test.cjs` (新建)

## 3. 輸入與輸出規範 (I/O Specification)
- `isTwTradingDay(date: Date | string): boolean`:
  - 輸入：JavaScript Date 物件或 `YYYY-MM-DD` 字串。
  - 規則：排除週六、週日；排除中華民國行政院人事行政總處與臺灣證券交易所公佈之法定休假日（元旦、農曆春節封關/開紅盤期間、二二八、清明兒童連假、端午、中秋、國慶、勞動節 5/1、補班不開盤等）。
  - 輸出：當日是否為台股正常交易日。
- `getPreviousTradingDay(date: Date | string, offsetDays?: number): string`:
  - 往前倒推 N 個合法交易日，回傳 `YYYY-MM-DD`。
- `getNextTradingDay(date: Date | string, offsetDays?: number): string`:
  - 往後推算 N 個合法交易日，回傳 `YYYY-MM-DD`。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 2026 年全年各重要國定假日、農曆年假、補班日之判斷正確率 100%。
- [ ] 單元測試 `trading-calendar-engine.test.cjs` 覆蓋週末、連假、平日等所有情境，100% 通過。
- [ ] 零任何第三方外部套件依賴，零檔案讀寫依賴。
