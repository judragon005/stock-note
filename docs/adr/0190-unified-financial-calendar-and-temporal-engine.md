# ADR 0190: 統一金融時序日曆與全市場營業日引擎 (Unified Financial Calendar and Temporal Engine)

## 狀態
已接受 (Accepted) - 2026-10-16

## 背景與問題陳述
在台股歷史日 K 與籌碼回補流水線執行 250 天回溯時，日誌頻繁出現：
`⚠️ [官方無資料（異常）] 略過`（如 `2026-09-28`、`2026-07-10`、`2025-12-25`、`2025-10-24`）。
經深度跨國查證與法規比對：
1. `2026-09-28`: 孔子誕辰紀念日 (教師節)，修法恢復為國定休假日，全市場休市。
2. `2026-07-10`: 巴威颱風侵襲，台北市宣佈停班停課，證交所天然災害停市。
3. `2025-12-25`: 行憲紀念日，國定休假日休市。
4. `2025-10-24`: 台灣光復節 (10/25逢六) 依政府人事行政總處規定提前於週五補假，全市場休市。

此外，專案過去存在以下問題：
- 前端與後端各自為政，前後端日曆資料庫不同步。
- 遇休市日仍盲目向證交所與 Yahoo Finance 發動 1,500+ 次 HTTP 請求，浪費頻寬並可能觸發 IP 限流。
- 缺乏法人券商級別的交割日（T+2 / T+1）、融資計息天數（跨長假）、集保 TDCC 連假提前至週四、營收 10 號遇假順延等時序推演演算法。

## 決策內容

1. **單一真理來源 (SSOT 字典)**：
   建立 `src/data/market-holidays.json` 作為全專案跨前後端唯一的日曆字典。
   - 包含法定休假日（含最新修法節日）與不可抗力天災停市日（巴威颱風）。
   - 結構化分離美股全日休市與美股感恩節翌日「黑色星期五 (EARLY_CLOSE)」半日市，杜絕營業日跳轉誤判。

2. **後端時序運算引擎 (`trading-calendar-engine.cjs`)**：
   - 接入 SSOT，提供 `isTradingDay` 與 `getHolidayReason`。
   - 純演算法支援：
     * `getSettlementDate`：台股 T+2 / 美股 T+1，自動跳過中間之週末與法定休市日。
     * `getHoldingInterestDays`：融資跨春節與連假精確自然日計息天數。
     * `isDerivativesExpiryDay`：台指期每月第 3 週三、美股月選第 3 週五及四巫日。
     * `getLatestTdccPublishDate`：集保股權週五遇國定連假自動前推至週四。
     * `getRevenueDeadlineDate`：每月 10 號營收發布若遇休市順延至次一營業日。

3. **零 I/O 守衛 (Zero I/O Guards)**：
   - `sync-tw-market.cjs` 與 `sync-us-market.cjs` 每日定時排程開頭掛載守衛。若當日/昨夜為休市日，輸出中文略過日誌並秒級退出，徹底杜絕外部請求與磁碟 I/O。
   - `backfill-tw-history-web.cjs` 產生 250 天候選日事前排除休市日；手動傳入休市日時優雅標記為休市略過，絕不推入 `failedDates`。

4. **前端橋接與即時狀態卡片**：
   - `src/engine/holidayCalendar.ts` 保持 100% 向後相容，介面平滑遷移至 SSOT。
   - 建立 `src/engine/marketStatusEngine.ts`，利用原生 `Intl.DateTimeFormat` 自動感知夏令/冬令時區。
   - 在 `MarketScheduleHubSection.tsx` 排程卡片中加入即時營業狀態徽章與中文休市標籤。

## 後果與效益
- **正確性**：250 天台股回補 0 異常略過，`failedDates` 零污染。
- **效率**：排程於休市日直接攔截，節省 1,500+ 次 HTTP 請求與伺服器資源。
- **可維護性**：前後端統一以 `market-holidays.json` 宣告式維護，消除魔術字串與分散 Set。
