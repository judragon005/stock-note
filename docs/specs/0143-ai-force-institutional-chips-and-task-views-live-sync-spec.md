# 規格 0143：AI 主力戰情室三大法人真實籌碼管線、全卡片動態連動與底部 5 大任務視圖閉環規格 (Spec 0143)

## Problem Statement

在完成了階段一（真實日 K 資料管線、01 主 K 線互動化與查價列抗抖動）之後，「AI 主力戰情室」的價格與技術指標層面已具備實戰看盤水準。然而，戰情室在「籌碼面」與「深層研判視圖」上仍存在嚴重的資訊脫鉤與功能不彰問題：
1. **三大法人進出數據仍屬靜態範例 (Card 08 & 15)**：
   - 08 法人行為計量卡片之雙軸長條圖（外資、投信、自營商買賣超）與近 3 日明細表格仍使用模擬資料，未連動 TWSE / TPEx 官方每日盤後法人買賣超數列。
   - 15 籌碼異動摘要之微型 Sparkline 走勢圖與法人累積進出張數未與當前標的真實籌碼同步。
2. **中間量化卡片未完全受真實指標驅動 (Card 10~17)**：
   - 10 AI 多空能量棒（紅黑 K 量能比）、11 健康度綜合評估（5 環指示器）、12 主力動態信號（紅綠燈）、13 市場情緒儀表板、16 買賣力分佈（大戶 vs 散戶買賣比例）、17 多空強度分佈等卡片，部分仍依賴預設權重，未依據拉取到的真實 250+ 交易日 OHLCV 與法人進出動態加權。
3. **底部 5 大任務視圖完全脫鉤**：
   - 點擊底部「任務一：綜合分析報告」顯示的是固定文案，無法根據當前標的真實破線、KD 黃金交叉或主力買賣超即時產出客觀診斷。
   - 「任務二：技術警示報告」未即時掃描當前真實日 K 是否跌破 MA20、破支撐或 RSI 超買。
   - 「任務三：KD+MA 表」與「任務四：MACD 表」未列出與主圖完全一致的真實數值明細。
   - 「任務五：原始資料表」無法瀏覽並搜尋當前標的的真實 OHLCV 歷史數列。

## Solution

構建完整的「三大法人籌碼歷史管線」與「AI 戰情室全卡片/任務視圖全景動態驅動架構」：

1. **三大法人真實進出資料管線 (Institutional Pipeline SSOT)**：
   - 串接既有 `chipsFetcher` 與 TWSE / TPEx 每日三大法人買賣超歷史服務，依標的代碼自動獲取歷史外資、投信、自營商淨買賣張數，並持久化至 IndexedDB 本地快取。
   - **優雅降級機制**：針對美股或查無法人進出之特殊標的，安全降級為機構持股比率估計與成交量多空拆解，確保圖表永不崩潰。

2. **籌碼面核心卡片全面動態化 (Card 08 & 15)**：
   - **08 法人行為計量卡**：左側真實繪製外資、投信、自營商歷史柱狀圖（紅買綠賣），疊加三大法人累積淨買賣超折線；右側即時展示近 3 日法人進出明確張數表；底部即時彙總 20 日與近 5 日法人累計買賣超。
   - **15 籌碼異動摘要卡**：即時呈現最新交易日三大法人進出張數，右側微型 Sparkline 折線圖繪製真實 20 日法人持股波形，底部產出短線籌碼研判結論。

3. **量化卡片群真實指標加權動態化 (Card 10~17)**：
   - **10 多空能量比**：以真實 20 日紅 K 實體成交量除以黑 K 實體成交量，計算精確多空量能比。
   - **11 健康度 5 環評估**：動態依真實均線多頭排列度、資金動能、法人近 5 日買賣超與 ATR 波動率計算 5 維分數。
   - **12 主力動態信號**：即時依價格與 20 日 VWAP 乖離率、法人買賣方向計算趨勢、籌碼、動能燈號。
   - **13 台股市場情緒儀表**：結合大盤指數漲跌家數與個股融資券變動，驅動指針角度。
   - **16 大戶 vs 散戶買賣力**：依單筆大額成交量估計大戶買盤、散戶買盤與散戶賣盤三環比例。
   - **17 多空強度 3 環分佈**：動態計算多方強度、空方強度與量能強度數值及 1~5 級信號。

4. **底部 5 大任務視圖深度連動與匯出 (Task Views Drill-Down)**：
   - **任務一（綜合分析報告）**：量化引擎根據當前真實 MA、KD、RSI、法人籌碼即時生成三段式專業分析（現況診斷 ➔ 主力意圖 ➔ 策略建議）。
   - **任務二（技術警示報告）**：即時掃描當前日 K 是否觸發破月線、跌破波段支撐、RSI > 80 高檔過熱或爆量長黑等警示項目，標記危險等級。
   - **任務三（KD + MA 表）**：表格分頁展示歷史各交易日之 Date、Close、MA5、MA10、MA20、MA60、K(9,3)、D(9,3)。
   - **任務四（MACD 表）**：表格分頁展示歷史 Date、Close、EMA12、EMA26、DIF、DEM、OSC 柱狀。
   - **任務五（原始資料表）**：分頁展示 250+ 交易日 OHLCV 歷史原始數據，支援關鍵字即時過濾搜尋。

## User Stories

1. As a swing trader, I want card 08 to show real foreign, investment trust, and dealer daily net buying/selling bars, so that I can track institutional accumulation with precision.
2. As a chip analyst, I want card 08's right-hand table to display the exact share counts for the last 3 trading days, so that I can see the immediate shift in institutional behavior.
3. As a momentum trader, I want card 15 to feature a real 20-day institutional sparkline trajectory, so that I can spot rapid shifts in institutional consensus.
4. As an institutional tracker, I want card 10's bull-bear energy ratio to be mathematically derived from the true 20-day volume on up-days versus down-days, so that volume bias is mathematically grounded.
5. As a risk-focused investor, I want card 11's 5 radial gauges to score health objectively from moving average alignment, volatility, and institutional buying, so that no subjective bias enters the evaluation.
6. As a technical analyst, I want card 12's dynamic signal indicators (trend, chips, momentum, risk, traffic light) to update based on real technical thresholds, so that I am instantly alerted when red flags appear.
7. As a retail investor, I want the system to fall back gracefully to volume-based estimates when viewing US stocks or when Taiwan institutional data is temporarily delayed, so that the dashboard never crashes.
8. As a deep-dive analyst, I want the bottom Comprehensive Report view to synthesize real current indicators into structured prose, so that I get an instant executive summary.
9. As a risk controller, I want the Technical Alerts task view to scan and flag active violations (such as crossing below 20-day VWAP or RSI overbought), so that I can manage stop-losses proactively.
10. As a quantitative researcher, I want the KD+MA and MACD task views to expose tabular time-series matching the chart, so that I can audit indicator calculations row by row.
11. As a compliance officer, I want the Raw Data Table task view to provide searchable, paginated access to the underlying 250-day OHLCV rows, so that data integrity can be inspected directly in the UI.

## Implementation Decisions

### 1. Data Pipeline Architecture (Institutional Flow)
- Extend `generateAiForceReportFromCandles` to accept optional `institutionalHistory` records (`date`, `foreignShares`, `trustShares`, `dealerShares`).
- When institutional records exist, calculate 20-day and 5-day net cumulative flow, daily net matrix, and sparkline points.
- When institutional records are unavailable (US market or offline), derive proxy volume flow from daily price-volume momentum (`close >= open ? volume * 0.6 : -volume * 0.6`), marking provenance as `proxy-derived`.

### 2. Pure Calculation Seams in Quant Engine
- Implement `deriveBullBearEnergy(candles: KlineCandleItem[])`: sums volume on positive return days vs negative return days to produce the bull/bear energy ratio.
- Implement `synthesizeTechnicalAlerts(candles: KlineCandleItem[], keyLevels)`: inspects recent 3 candles against MA20, support levels, and RSI thresholds to generate alert badge objects.
- Implement `synthesizeComprehensiveReport(symbol, report)`: constructs structured diagnostic prose from technical regime and institutional posture.

### 3. Bottom Task Views Dynamic Binding
- Refactor `TaskViewsSwitcher.tsx` and sub-view components (`ComprehensiveReportView`, `TechnicalAlertsView`, `KdMaTableView`, `MacdTableView`, `RawDataTable`):
  - Pass the active `report` and `candles` directly as props.
  - Implement client-side pagination (10 rows per page) and search filtering for raw data and indicator tables.

## Testing Decisions

### Good Test Principles
- Tests must verify observable outputs at public seams (computed report attributes, alert counts, tabular rows).
- Guard mathematical boundaries: all-zero institutional buying, strictly flat prices, missing volume, single-day history.

### Target Test Seams
1. **Institutional Calculation Seam**: `src/engine/aiForceDashboardEngine.test.ts`
   - Test institutional flow calculations with positive, negative, and empty institutional histories.
   - Test `deriveBullBearEnergy` with extreme all-red and all-black candle series.
   - Test `synthesizeTechnicalAlerts` triggers correct alert flags on breakdown below MA20.
2. **Bottom Task Views Integration Seam**: `src/components/aiForceDashboard/TaskViewsSwitcher.test.ts`
   - Test that each of the 5 task tabs receives real candle data and renders without runtime exceptions.
   - Test table pagination and search filtering logic.

### Prior Art
- `smartMoneyEngine.test.ts`: institutional flow accumulation patterns.
- `analysisMetricsAudit.test.ts`: financial statement and indicator tabular testing.

## Out of Scope

- Sub-second tick-level intraday orderbook replay.
- Live automated broker trade submission.
- Real-time push notifications or SMS alerts.

## Further Notes

- All institutional shares must be rendered with standard comma formatting and sign symbols (`+` for buying, `-` for selling).
- Respect Taiwan/US color themes consistently across all 18 cards and 5 task views.
