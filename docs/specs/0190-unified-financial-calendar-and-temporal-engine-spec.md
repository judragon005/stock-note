# Spec 0190: 全市場時序中樞與金融行事曆大一統架構 (Unified Financial Calendar & Temporal Engine)

## Problem Statement

在台股歷史數據回補與每日例行排程中，系統頻繁在特定日期（如 2026-09-28、2026-07-10、2025-12-25、2025-10-24）報出 `⚠️ [官方無資料（異常）]` 並將其錯誤標記為失敗日期。經向證券交易所 (TWSE) 伺服器與法規實務查證，這些日期皆為法定國定假日（教師節、行憲紀念日、光復節補假）或天然災害停市（巴威颱風假），市場原本即全日未開盤交易。

從使用者、券商與法人的視角，系統目前面臨以下核心問題：
1. **行事曆代碼撕裂與缺漏**：前端與後端各自獨立手寫複製了一套休市日常數庫，兩端代碼脫鉤，且皆未收錄近期修法恢復之國定假日與歷史颱風停市日，導致回補引擎盲目發起無效網路請求。
2. **排程無日曆守衛造成資源浪費**：每日盤後同步腳本在遇到國定假日或美股休市時，仍盲目對官方發起數千次無效 HTTP 請求，浪費網路頻寬並增加遭 API 封鎖之風險。
3. **金融實務時序斷層**：美股已實施 T+1 交割而台股為 T+2，現有帳簿推導混淆；集保股權分散表 (TDCC) 逢週五連假未按法規提前發布，導致大戶籌碼在連假週 100% 抓空；月營收 10 號遇假日亦未依規順延，造成資料缺漏誤報。
4. **異常隊列污染與重試死循環**：因行事曆判定為交易日但官方查無資料，系統將休市日列入待補漏隊列，造成後續自適應補漏引擎陷入永久無效重試。

## Solution

建立全市場單一真理來源 (SSOT) 的金融時序與行事曆中樞架構：
1. **單一靜態字典 (SSOT)**：將 2023～2030 年台美雙市場完整法定節日、補假、美股半日市以及已確認之歷史颱風停市日，集中收錄於單一 JSON 字典檔中，前端與後端共用，消除雙頭馬車。
2. **純演算法時序中樞 (Zero-IO)**：以零外部套件、純原生運算提供營業日過濾、中文休市原因標籤、台美交割日分流（台股 T+2 / 美股 T+1）、集保遇假前推、營收遇假順延與衍生品結算日（台指期週三 / 美股四巫日）判定。
3. **全排程零 I/O 守衛 (Zero-IO Guard)**：在台美每日同步排程與歷史回補引擎開頭掛載行事曆門衛，遇休市秒級靜默略過，事前排除無效交易日，徹底消除錯誤日誌與死循環重試。
4. **使用者營業感知與透明時鐘**：提供即時市場狀態卡片與清楚的休市原因說明，消除美股夏令/冬令時差與跨日認知混亂。

## User Stories

1. As a retail investor, I want to see whether Taiwan and US markets are currently open or closed, so that I don't wonder why quotes are not updating.
2. As a retail investor, I want to see the specific reason why the market is closed (e.g. Confucius Birthday, Typhoon Day), so that I know it is a statutory holiday rather than a software defect.
3. As a retail investor, I want to see an accurate countdown to the next market open session, so that I can prepare my trading orders before the bell.
4. As a retail investor, I want the system to handle US Daylight Saving Time (EDT) and Standard Time (EST) shifts automatically, so that I always know the exact opening time (21:30 vs 22:30).
5. As an active trader holding margin loans, I want the system to track the actual calendar days across long holidays (e.g. 10 days of Lunar New Year), so that I can anticipate margin interest costs and holiday liquidity risks.
6. As an investor tracking corporate actions, I want to clearly distinguish ex-dividend dates from dividend payment dates, so that I understand why the opening stock price dropped without misinterpreting it as an abrupt loss.
7. As a broker settlement analyst, I want Taiwan stock purchases to settle strictly on T+2 trading business days and US stock purchases on T+1 trading business days, so that ledger cash flows and settlement obligations are accurate.
8. As a broker risk officer, I want typhoon closures announced by the Taipei City Government to automatically postpone settlement obligations to the next business day, so that accounts are not falsely flagged for default.
9. As an institutional quantitative trader, I want derivative expiration days (Taiwan index futures on the 3rd Wednesday, US monthly options on the 3rd Friday) to be flagged automatically, so that I can monitor abnormal settlement volatility.
10. As an institutional quantitative trader, I want US Quadruple Witching days (March, June, September, December) and MSCI quarterly rebalancing effective days to be marked on the calendar, so that I can account for end-of-day volume surges.
11. As a data pipeline engineer, I want the historical backfill script to skip known statutory holidays and historical typhoon days without making external network calls, so that the backfill completes faster without false error logs.
12. As a data pipeline engineer, I want dates with zero trading activity due to legitimate market closure to NOT be pushed into the failed dates queue, so that adaptive gap backfill mechanisms do not enter an infinite retry loop.
13. As a data pipeline engineer, I want the daily US market sync job (running at 08:00 Taiwan time) to check whether yesterday was a US trading holiday before execution, so that 1,500 redundant HTTP requests are avoided when US markets were closed.
14. As a data pipeline engineer, I want the daily Taiwan market sync job (running at 16:00 Taiwan time) to check whether today is a Taiwan trading holiday before execution, so that unnecessary requests to TWSE/TPEx are avoided on public holidays.
15. As a fundamental analyst, I want the TDCC weekly shareholder distribution fetcher to pull data from the preceding business day (Thursday) when Friday is a holiday, so that big-holder chip data is never missed during long weekends.
16. As a fundamental analyst, I want the monthly revenue filing deadline to roll forward to the next business day when the 10th falls on a weekend or public holiday, so that company revenue data is not prematurely marked as missing.
17. As a frontend developer, I want both frontend TypeScript components and backend CommonJS scripts to share a single JSON file for holiday definitions, so that there is zero code duplication and zero divergence between environments.

## Implementation Decisions

- **Single Source of Truth (SSOT)**: All statutory holidays, observed makeup days, known historical force-majeure days (such as typhoons), and early close half-days are stored in a single JSON dictionary (`market-holidays.json`). Both frontend and backend modules read from this data source directly.
- **Pure Functional Temporal Engine**: Core business functions (`isTradingDay`, `getHolidayReason`, `getSettlementDate`, `getLatestTdccPublishDate`, `getRevenueDeadlineDate`, `isDerivativesExpiryDay`, `getHoldingInterestDays`) are written as zero-dependency pure mathematical/date algorithms using standard `Date.UTC`. No external date libraries are introduced.
- **Zero-IO Guard Placement**: Market sync scripts inspect the calendar before instantiating HTTP requests or database connections. When a target date is determined to be non-trading, the process logs an informational message and exits gracefully in 0 ms.
- **Settlement Rule Separation**: Settlement calculations require an explicit market parameter (`'TW'` vs `'US'`), enforcing 2-business-day jumping for Taiwan equities and 1-business-day jumping for US equities, correctly leaping over observed holidays.
- **Historical Force-Majeure Persistence**: Natural disasters (such as the 2026-07-10 Bavi Typhoon closure) are retroactively added to the static JSON calendar as confirmed non-trading days once confirmed, ensuring historical backfill operations do not repeatedly fail or retry.
- **Backward Compatibility**: Existing exports in frontend modules are preserved as thin re-exports around the new engine, ensuring existing consumers (such as cash ledgers, DCA schedulers, and adaptive universe probes) continue operating without breaking changes.

## Testing Decisions

- **Black-Box Behavioral Testing**: Tests only verify public return values given specific calendar dates; internal parsing mechanisms and data structures are not tested.
- **High-Seam Verification**:
  - Unit tests will verify that `2026-09-28` (Teachers' Day), `2026-07-10` (Typhoon Day), `2025-12-25` (Constitution Day), and `2025-10-24` (Retrocession Makeup Day) return `isTradingDay === false` with their respective descriptive Chinese reasons.
  - Unit tests will verify TDCC publication date calculation when Friday is a holiday (e.g. 2026-04-03 moves back to 2026-04-02).
  - Unit tests will verify revenue filing deadline extension when the 10th falls on a Sunday (e.g. 2026-05-10 extends to 2026-05-11).
  - Unit tests will verify Taiwan T+2 vs US T+1 settlement date skipping weekends and holidays.
  - Integration tests will verify that `generateTradeDateCandidates` in the backfill script does not include the 4 anomalous dates, resulting in zero `⚠️ [官方無資料（異常）]` warnings during 250-day runs.
- **Prior Art**: Testing patterns follow the existing `src/engine/holidayCalendar.test.ts` and `scripts/market-sync/trading-calendar-engine.test.cjs`.

## Out of Scope

- Real-time scrapers for Taipei City Government disaster announcement web pages or live meteorological typhoon tracking APIs.
- Global international exchange calendars outside of Taiwan (TWSE/TPEx) and the United States (NYSE/NASDAQ).
- Automatic real-time trading order routing or automated broker margin call liquidation triggers.
- Dynamic automated discovery of unscheduled ad-hoc company shareholder meetings.

## Further Notes

- The addition of historical typhoon days into the JSON dictionary reflects the fact that while future natural disasters cannot be forecasted statically, past recorded closures are unalterable historical facts that must be codified to protect ingestion pipelines from recurring split states.
- The single JSON approach conforms strictly to the KISS principle, eliminating more than 150 lines of duplicate code between CommonJS and ESM/TypeScript layers.
