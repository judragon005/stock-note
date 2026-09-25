# 規格 0140：AI 主力行為判讀與全功能量化決策儀表板 (Spec 0140)

## Problem Statement

目前投資人在進行個股分析與交易決策時，技術面指標（K 線、MA、KD、MACD）、籌碼面數據（三大法人買賣超、大戶與散戶動向）、成本位階（VWAP、箱型支撐壓力）以及短線風險（隔日沖沖銷、波動率）分散在不同工作區與彈窗中。

這導致投資人必須在多個視窗間反覆切換比對，難以在 3 秒內一眼綜觀主力的真實意圖（進貨吸籌、拉抬出貨、區間震盪或調節減碼），且缺乏統計機率導向的未來路徑預測（Forecast Cone）與語意化評判，大幅增加了決策摩擦與資訊延遲。

## Solution

建立一個極致整合的「AI 主力行為判讀與全功能量化決策儀表板」，採用現代高密度 Bento-Grid 深色科技感視覺架構，為單一標的聚合全方位主力情報：
1. **頂部狀態與行情總覽**：即時行情、量價筆數、資料來源（TWSE/FinMind）與多格式報告匯出（PNG、CSV、HTML、PDF）。
2. **18 大量化分析卡片模組**：
   - 主 K 線圖與三大關鍵價位（壓力、主力成本、支撐）
   - AI 決策核心（趨勢、短線狀態、主力行為、支撐壓力區間）
   - 多維度 6 角雷達評讀與綜合評級
   - 成交量價位熱區分佈圖 (Volume Profile)
   - 五維量化風險蛛網圖
   - 60 日統計機率預測路徑圖 (Forecast Cone)
   - 主力 VWAP 成本結構帶堆疊圖
   - 三大法人行為計量雙軸圖與近 3 日明細表
   - 隔日沖 5 大風險進度條
   - AI 多空能量儀與紅黑 K 量能比
   - 5 環健康度綜合評估儀
   - 主力動態信號紅綠燈
   - 台股市場情緒半圓指針儀與三大參與者情緒量表
   - AI 演算法 5 維信心量表
   - 當日籌碼具體摘要與微型走勢 Sparkline
   - 大戶 vs 散戶買賣力甜甜圈分佈
   - 多空強度 3 環分佈與信號等級
   - 主力語意總評判 (MLP-AI) 大字看板與情境分析文案
3. **底部 5 大任務視圖切換**：綜合分析報告、技術警示報告、KD+MA 圖表、MACD 圖表、原始數據明細表。

## User Stories

1. As a retail investor, I want to see the real-time quote bar with high, low, open, close, volume, and tick count, so that I can immediately grasp the current price action without looking at another software.
2. As a trader, I want to see the active system badges like AI SCAN ACTIVE and VOLATILITY ALERT, so that I have immediate situational awareness of current market stress.
3. As a technical analyst, I want the primary candlestick chart to overlay MA5, MA10, MA20, MA60 along with automated high resistance, main force cost, and support lines, so that I can pinpoint key technical levels instantly.
4. As a swing trader, I want an AI Decision Core card summarizing trend, short-term regime, institutional behavior, day-trade risk, and health score, so that I get a structured multi-factor verdict in seconds.
5. As a portfolio manager, I want a 6-axis multi-dimensional radar chart grading institutional flow, trend, chips, liquidity, volatility, and momentum, so that I can spot structural imbalances at a glance.
6. As a chip analyst, I want a Volume Profile heatmap showing horizontal volume distribution across price bins, so that I know exactly where the heavy accumulation zones and resistance cliffs lie.
7. As a risk-conscious investor, I want a 5-dimension risk spider chart detailing liquidity, volatility, trend, institutional, and chip risk, so that I can prevent catching falling knives.
8. As a quantitative trader, I want a 60-day historical drift and volatility statistical forecast cone displaying 3-day, 5-day, and 10-day probabilistic paths (up, range, down), so that I can set mathematically sound profit targets.
9. As a position trader, I want a VWAP cost structure stacked area chart displaying breakout, trapped, core cost, and heavy volume zones, so that I know whether current price is overextended relative to institutional costs.
10. As a smart money tracker, I want a dual-axis institutional histogram and cumulative line chart comparing Foreign, Investment Trust, and Dealer flows alongside a 3-day raw tally table, so that I can verify institutional consensus.
11. As a day trader, I want a dedicated day-trade risk analysis panel displaying abnormal selling, turnover rate, day-trade ratio, pullback risk, and intraday volatility, so that I avoid holding overnight positions with severe margin-wash risk.
12. As a momentum trader, I want a bull-bear energy meter comparing buying versus selling volume and the 20-day red-to-black candle volume ratio, so that I can determine if buying exhaustion has occurred.
13. As an investor, I want a comprehensive health check panel featuring 5 radial progress gauges covering chips, technical structure, capital momentum, liquidity risk, and institutional support, so that I can evaluate stock quality objectively.
14. As an active trader, I want dynamic traffic light indicators for trend, chips, momentum, and risk, so that I am alerted whenever a critical red-flag warning is triggered.
15. As a market participant, I want a market sentiment speedometer gauge alongside retail, institutional, and main force sentiment levels, so that I can trade against extreme retail complacency or panic.
16. As an AI-assisted trader, I want an AI confidence breakdown showing model confidence, accuracy, data completeness, signal stability, and strategy applicability, so that I do not blindly trust low-confidence model outputs.
17. As a data auditor, I want a daily institutional summary showing exact net share counts per entity and a mini sparkline trend, so that I can inspect institutional flow direction without opening raw tables.
18. As a market observer, I want a donut chart illustrating large player buying versus retail buying and selling pressure, so that I can see who is dominating liquidity.
19. As a quant user, I want a bull-bear strength ring breakdown categorized into 5 signal tiers, so that I know whether the current setup ranks in the top tier of setups.
20. As an executive decision maker, I want a prominent Main Force AI Semantic Verdict card highlighting primary actionable verbs (e.g., 'Trim Position', 'Accumulate', 'Range Bound') and contextual analysis prose, so that I receive unambiguous trading guidance.
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
- All charts (Candlesticks, MA lines, Radar polygons, Semi-donut Gauges, Radial progress rings, Volume Profile bars, Forecast Cone curves, and Donut charts) are rendered using native React SVG elements.
- No heavy external charting libraries (e.g., D3 bundle, Highcharts, Chart.js) are introduced, maintaining minimal bundle size and maximum styling flexibility.
- Standardize dark-mode cyber aesthetic using design tokens: deep blue-slate card backgrounds (`rgba(15, 23, 42, 0.75)`), subtle glassmorphism borders (`rgba(59, 130, 246, 0.2)`), neon accent indicators, and Taiwan/US color theme compatibility.

### 4. Workspace & Routing Integration
- Register a dedicated top-level workspace tab `主力戰情室 (AI Force)` in the workspace navigation system, while preserving the ability to open the dashboard ad-hoc from holdings or watchlist items.
- Provide bottom task view tabs that seamlessly switch the central stage between the 18-card Bento grid, alert inspectors, indicator studies, and the raw tabular view.

### 5. Multi-Format Client-Side Exporter
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
