# 規格 0140：AI 主力行為判讀與全功能量化決策儀表板 (Spec 0140)

## Problem Statement

目前投資人在進行個股分析與交易決策時，技術面指標（K 線、MA、KD、MACD）、籌碼面數據（三大法人買賣超、大戶與散戶動向）、成本位階（VWAP、箱型支撐壓力）以及短線風險（隔日沖沖銷、波動率）分散在不同工作區與彈窗中。

這導致投資人必須在多個視窗間反覆切換比對，難以在 3 秒內一眼綜觀主力的真實意圖（進貨吸籌、拉抬出貨、區間震盪或調節減碼），且缺乏統計機率導向的未來路徑預測（Forecast Cone）與語意化評判，大幅增加了決策摩擦與資訊延遲。

## Solution

建立一個極致整合的「AI 主力行為判讀與全功能量化決策儀表板」，採用現代高密度 Bento-Grid 深色科技感視覺架構，為單一標的聚合全方位主力情報：

1. **頂部雙列整合 Bar 架構**：
   - **第一列：即時行情與標的查詢列**：左側包含 4 大系統狀態膠囊燈號（`AI SCAN ACTIVE`、`MAIN FORCE TRACKING`、`MARKET STATUS`、`VOLATILITY ALERT`）；中間整合深色發光代號輸入框（支援即時切換標的）、股票名稱與 `[分析]` 按鈕；右側橫排 10 大行情指標（收盤價、漲跌額、漲幅、成交量、成交筆數、開盤、最高、最低、最新交易日、資料筆數）。
   - **第二列：資料來源與匯出工具列**：左側展示資料來源說明標籤（`日 K TWSE | 法人 TWSE | 融資券 FinMind` 與統計區間天數）；右側雙端對齊排列 5 大匯出工具按鈕（`⬇ 下載儀表板 PNG`、`⬇ 下載全部圖表 PNG`、`⬇ 下載資料 CSV`、`⬇ 下載總結報告 HTML`、`🖨️ 列印 / PDF`）。

2. **18 大量化分析卡片模組（4 排 Bento-Grid 佈局）**：
   - **Row 1 (5 卡)**：
     - `01 主 K 線圖`：含 MA5/10/20/60 均線、自動壓力/主力成本/支撐關鍵水線、成交量柱狀圖與右上 `⋮`。
     - `02 AI 決策核心`：滿版紅色 `⚠️ AI WARNING` 警告橫幅、8 大核心決策項目（以 `/` 分隔範圍）與 `1 ~ 4 級交易日` 風險標籤。
     - `03 多維度判讀`：6 軸正多邊形雷達圖，右上角顯示綜合評分（如 `56 / 100`），中心浮動等級圓環與底部評級。
     - `04 AI 籌碼熱區圖`：**垂直價格階梯熱力圖 (Vertical Heatmap)**，Y 軸為價格區間（如 1600~2400），右側呈現 5 大成交量分佈帶（壓力區、大量成交區、密集成交區、價平區、去撐區）百分比。
     - `05 風險雷達圖`：5 軸風險蛛網圖（流動性、主動、隔日沖、法人、籌碼），底部標註主力風險等級與指數百分比。
   - **Row 2 (4 卡)**：
     - `06 累積型 AI 預測路徑圖`：依 60 日報酬統計推估，展示三色機率圖例、未來 3/5/10 日扇形錐體發散投影路徑與年化漂移指標。
     - `07 主力成本結構分布圖`：**多層次色彩波形堆疊圖 (Wave Area Stack)**，含 0k~60k 刻度與時間軸、主力平均成本（20日VWAP）與乖離強弱指標。
     - `08 法人行為計量`：左側三大法人買賣超雙軸柱狀圖，右側近 3 日法人進出明細表，底部統整 20 日與近 5 日累計買賣超。
     - `09 隔日沖風險分析`：5 項風險進度條（主力賣出異常、**籌碼過手率**、沖銷比例、隔日回檔風險、日內波動率），底部總結隔日沖風險等級與風險指數。
   - **Row 3 (6 卡等寬排列)**：
     - `10 AI 多空能量棒`：多方能量與空方能量水平雙條比對棒，底部計算 20 日紅黑 K 多空量能比（如 1.13 倍多）。
     - `11 健康度綜合評估表`：5 環並排進度指示器（籌碼健康度、技術結構度、資金動能度、波動風險度、法人支撐度），底部顯示綜合平均評分。
     - `12 AI 主力動態信號判斷`：5 行狀態指示器（趨勢、籌碼、動能、風險、燈號），底部提示目前紅綠燈號。
     - `13 台股市場情緒儀表板`：彩虹半圓指針儀表，中間標註市場情緒，右側條列散戶、法人與主力情緒數值。
     - `14 AI 信心維度`：頂部總信心百分比，下方條列模型準確度、資料完整度、訊號穩定度與策略適用度進度條。
     - `15 籌碼異動摘要`：左側外資、投信、自營商與三大法人進出張數，右側微型 Sparkline 走勢圖（含 2300/1300 刻度），底部短線結論。
   - **Row 4 (3 卡)**：
     - `16 買賣力分布圖`：**並排 3 個獨立進度環**（大戶買盤、散戶買盤、散戶賣盤）與近 20 日成交量比例標籤。
     - `17 多空強度分布`：並排 3 個圓環進度（多方強度、空方強度、量能強度）與 1~5 級信號等級標籤。
     - `18 主力追蹤總評判 (MLP-AI)`：頂部標題與右上 `⋮`，中間醒目大字主力語意（如「調節減碼」）與右側「法人動作」功能按鈕，底部完整 AI 結論研判文案。

3. **底部 5 大任務視圖切換**：綜合分析報告、技術警示報告、KD+MA 圖表、MACD 圖表、原始數據明細表。

4. **全卡片設計一致性**：所有卡片右上角統一配備 `⋮` (MoreVertical) 選單圖示，深色半透明玻璃擬態與抗高對比色彩。

## User Stories

1. As a retail investor, I want to see the real-time quote bar with high, low, open, close, volume, and tick count, so that I can immediately grasp the current price action without looking at another software.
2. As a trader, I want to see the active system badges like AI SCAN ACTIVE and VOLATILITY ALERT, so that I have immediate situational awareness of current market stress.
3. As a technical analyst, I want the primary candlestick chart to overlay MA5, MA10, MA20, MA60 along with automated high resistance, main force cost, and support lines, so that I can pinpoint key technical levels instantly.
4. As a swing trader, I want an AI Decision Core card summarizing trend, short-term regime, institutional behavior, day-trade risk, and health score, so that I get a structured multi-factor verdict in seconds.
5. As a portfolio manager, I want a 6-axis multi-dimensional radar chart grading institutional flow, trend, chips, liquidity, volatility, and momentum, so that I can spot structural imbalances at a glance.
6. As a chip analyst, I want a vertical Volume Profile heatmap showing price ladder (1600~2400) accumulation zones and percentage breakdown, so that I know exactly where the heavy volume nodes and support cliffs lie.
7. As a risk-conscious investor, I want a 5-dimension risk spider chart detailing liquidity, volatility, trend, institutional, and chip risk, so that I can prevent catching falling knives.
8. As a quantitative trader, I want a 60-day historical drift and volatility statistical forecast cone displaying 3-day, 5-day, and 10-day probabilistic paths (up, range, down), so that I can set mathematically sound profit targets.
9. As a position trader, I want a VWAP cost structure wave stacked area chart displaying warehouse cost, breakeven, core cost, and heavy volume zones, so that I know whether current price is overextended relative to institutional costs.
10. As a smart money tracker, I want a dual-axis institutional histogram and cumulative line chart comparing Foreign, Investment Trust, and Dealer flows alongside a 3-day raw tally table, so that I can verify institutional consensus.
11. As a day trader, I want a dedicated day-trade risk analysis panel displaying abnormal selling, turnover rate, day-trade ratio, pullback risk, and intraday volatility, so that I avoid holding overnight positions with severe margin-wash risk.
12. As a momentum trader, I want a bull-bear energy horizontal bar meter comparing buying versus selling volume and the 20-day red-to-black candle volume ratio, so that I can determine if buying exhaustion has occurred.
13. As an investor, I want a comprehensive health check panel featuring 5 radial progress gauges covering chips, technical structure, capital momentum, liquidity risk, and institutional support, so that I can evaluate stock quality objectively.
14. As an active trader, I want dynamic traffic light indicators for trend, chips, momentum, and risk, so that I am alerted whenever a critical red-flag warning is triggered.
15. As a market participant, I want a market sentiment speedometer gauge alongside retail, institutional, and main force sentiment levels, so that I can trade against extreme retail complacency or panic.
16. As an AI-assisted trader, I want an AI confidence breakdown showing model confidence, accuracy, data completeness, signal stability, and strategy applicability, so that I do not blindly trust low-confidence model outputs.
17. As a data auditor, I want a daily institutional summary showing exact net share counts per entity and a mini sparkline trend with 2300/1300 scales, so that I can inspect institutional flow direction without opening raw tables.
18. As a market observer, I want 3 parallel circular progress rings illustrating large player buying, retail buying, and retail selling pressure, so that I can see who is dominating liquidity.
19. As a quant user, I want a bull-bear strength ring breakdown categorized into 5 signal tiers, so that I know whether the current setup ranks in the top tier of setups.
20. As an executive decision maker, I want a prominent Main Force AI Semantic Verdict card highlighting primary actionable verbs (e.g., 'Trim Position', 'Accumulate', 'Range Bound'), an action trigger button, and contextual analysis prose, so that I receive unambiguous trading guidance.
21. As a research analyst, I want one-click exports for Dashboard PNG, Full Charts PNG, Data CSV, HTML Report, and Print/PDF, so that I can archive, share, or publish trading briefs effortlessly.
22. As a deep-dive analyst, I want bottom navigation tabs switching between Comprehensive Report, Technical Alerts, KD+MA Workspace, MACD Workspace, and Raw Data Table, so that I have seamless drill-down capability without leaving the dashboard.

## Implementation Decisions

### 1. Unified Domain Contract & Data Model
- Define an immutable `AiForceDashboardReport` data structure consolidating all 18 card payloads, market quotes, provenance metadata, and task views into a single source of truth.
- Decouple calculation from rendering: pure statistical calculations and data transformers reside in dedicated engine modules, ensuring 100% testability independent of browser DOM.

### 2. High-Seam Engine Architecture
- Build a unified engine entry point that accepts stock symbol, market type, daily candles, and institutional history, then returns the computed `AiForceDashboardReport`.
- Integrate sub-calculators:
  - **Volume Profile Sub-Engine**: partitions historical high-low ranges into price buckets and aggregates volume weights to identify support, heavy, and resistance tiers.
  - **Probabilistic Forecast Cone Sub-Engine**: computes 60-day historical log return drift and annual volatility to generate 3-day, 5-day, and 10-day standard deviation boundary paths (bullish, range-bound, bearish).
  - **Day-Trade Risk Model**: calculates intraday high-to-close fade ratios, turnover velocity, and volume anomalies.
  - **Semantic Verdict Synthesizer**: a deterministic rule-based expert synthesis engine generating structured action directives based on institutional net volume, VWAP deviation percentage, and RSI thresholds.

### 3. Native SVG & Zero-Heavy-Dependency Visual Layer
- All charts (Candlesticks, MA lines, Radar polygons, Semi-donut Gauges, Radial progress rings, Vertical Heatmap grids, Wave Area curves, and Donut progress rings) are rendered using native React SVG elements.
- **Vertical Heatmap Matrix (Card 04)**: Price ladder along the Y-axis (e.g. 1600~2400) rendered with dense multi-column horizontal bars, mapped into 5 accumulation zones (Resistance, Heavy Volume, Dense Trading, Breakeven, Low Volume) with percentage breakdown.
- **Wave Area Stacked Plot (Card 07)**: Uses cubic Bezier curves (`C x1 y1, x2 y2, x y`) to render continuous layered wave area fills across 4 cost segments (Warehouse, Breakeven, Core Cost, Heavy Volume) over historical time dates.
- No heavy external charting libraries (e.g., D3 bundle, Highcharts, Chart.js) are introduced, maintaining minimal bundle size and maximum styling flexibility.
- Standardize dark-mode cyber aesthetic using design tokens: deep blue-slate card backgrounds (`rgba(15, 23, 42, 0.75)`), subtle glassmorphism borders (`rgba(59, 130, 246, 0.2)`), neon accent indicators, and Taiwan/US color theme compatibility.

### 4. 4-Row Bento-Grid Layout System
- **Row 1 (5 Cards)**: `minmax(360px, 2.3fr) minmax(210px, 1.25fr) minmax(180px, 1.1fr) minmax(160px, 1fr) minmax(180px, 1.1fr)` — Allocates widest width to the primary candlestick, followed by decision core, multi-dimensional radar, vertical volume heatmap, and risk spider.
- **Row 2 (4 Cards)**: `minmax(220px, 1.15fr) minmax(200px, 1.05fr) minmax(350px, 1.8fr) minmax(200px, 1fr)` — Forecast cone, cost wave stack, institutional dual-axis chart with 3-day table, and day-trade risk panel.
- **Row 3 (6 Equal Cards)**: `repeat(6, minmax(150px, 1fr))` — Bull-bear horizontal bar, 5-ring health check, dynamic signals, market sentiment gauge, AI confidence breakdown, and institutional sparkline summary.
- **Row 4 (3 Cards)**: `minmax(220px, 1fr) minmax(220px, 1fr) minmax(380px, 1.8fr)` — Large vs retail 3-ring force distribution, bull-bear 3-ring strength tiers, and wide MLP-AI semantic verdict billboard.

### 5. Workspace & Routing Integration
- Register a dedicated top-level workspace tab `主力戰情室 (AI Force)` in the workspace navigation system, while preserving the ability to open the dashboard ad-hoc from holdings or watchlist items.
- Provide bottom task view tabs that seamlessly switch the central stage between the 18-card Bento grid, alert inspectors, indicator studies, and the raw tabular view.

### 6. Multi-Format Client-Side Exporter
- Provide SVG-to-Canvas rasterization for PNG downloads without external server calls.
- Sanitize CSV outputs against DDE injection attacks.
- Generate standalone HTML summary reports and standard browser print styling for PDF generation.

## Testing Decisions

### Good Test Principles
- Tests must verify observable inputs and outputs of the unified report engine and component interaction seams rather than internal variable states.
- Tests must validate mathematical boundaries: zero volume candles, identical high/low prices, negative institutional flows, single-day history fallback, and division-by-zero guards.

### Target Test Seams
1. **Primary Calculation Seam**: `aiForceDashboardEngine.test.ts`
   - Validates that given a mock sequence of OHLCV candles and TWSE institutional records, all 18 payload sections produce valid numbers, percentages within 0-100, valid date ranges, and non-empty semantic strings.
2. **Sub-Engine Boundary Seams**:
   - `volumeProfileEngine.test.ts`: verifies bucket distributions sum up to 100% and correctly identifies high-volume nodes.
   - `monteCarloPathEngine.test.ts`: verifies probabilistic paths diverge monotonically over time horizons (10-day spread > 3-day spread).
   - `dayTradeRiskEngine.test.ts`: verifies risk score sensitivity to intraday reversals and turnover spikes.
3. **UI Integration Seam**: `AiForceDashboardView.test.tsx`
   - Validates component mounts cleanly, renders all 18 cards without crash, handles symbol change events, and correctly switches bottom task tabs.

### Prior Art
- `omniIndicatorEngine.test.ts`: demonstrates technical indicator confluence testing.
- `smartMoneyEngine.test.ts`: demonstrates multi-day institutional flow testing.
- `forensicRadarEngine.test.ts`: demonstrates radar chart data aggregation testing.

## Out of Scope

- Real-time tick-by-tick WebSocket streaming (dashboard operates on daily OHLCV and end-of-day institutional settlement data).
- Placing actual stock trading orders through broker APIs.
- Backtesting multi-year algorithmic strategies over this specific visual UI.

## Further Notes

- FinMind API token is optional: when unavailable, the engine gracefully falls back to TWSE official public margin and credit balances or algorithmic proxies, ensuring zero-configuration operation for standard users.
