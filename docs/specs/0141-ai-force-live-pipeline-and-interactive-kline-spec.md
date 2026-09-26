# 規格 0141：AI 主力戰情室真實資料管線、01主K線專業互動化與全卡片量化動態連動規格 (Spec 0141)

## Problem Statement

目前「AI 主力行為判讀與全功能量化決策儀表板」在實務使用上面臨顯著的「功能不彰」與真實度不足問題，具體痛點如下：
1. **假資料固化與缺乏真實資料管線**：戰情室原先僅綁定特定靜態 Mock 資料（如致茂 2360），當使用者輸入其他台股或美股標的代號時，無法自動經由市場 API 撈取真實日 K 與最新行情，導致分析結果缺乏實戰參考價值。
2. **01 主 K 線圖缺乏專業金融軟體級互動**：
   - 缺乏十字游標 (Crosshair) 懸停吸附與動態查價狀態列，使用者無法精確查看特定交易日的開高低收、漲跌幅與副圖指標數值。
   - 缺乏多週期視窗切換（如 30D / 60D / 120D / 250D），無法因應短線波段或長線趨勢的不同視角需求。
   - 缺乏副圖技術指標切換（如 VOL 成交量、KD、MACD、RSI），無法進行多指標共振確認。
   - 關鍵主力水線（20日 VWAP 主力成本、高檔壓力、波段支撐）為靜態數值，無法隨真實日 K 價格波動與時間動態更新。
3. **其餘卡片模組與底部任務視圖未完全連動**：
   - 04 籌碼熱區圖、05 風險雷達、06 預測錐形、07 成本結構波形以及 08-18 號卡片，需要真實日 K 數列與三大法人歷史進出數列作為計算底層，避免出現「K 線走真實行情，其餘卡片仍停留在靜態展示」之數據脫鉤現象。
   - 底部 5 大任務視圖（綜合分析、技術警示、KD+MA、MACD、原始資料）需動態綁定真實歷史數列，支援即時分析結論生成與數據導出。

## Solution

建立完整的真實日 K 資料驅動架構，升級 01 主 K 線圖為高互動專業圖表，並以純函式量化引擎驅動全戰情室 18 張卡片與底部 5 大任務視圖：

1. **雙軌真實日 K 資料管線整合**：
   - 接入既有 `backfillSymbolOhlcvAndIndicators` 與 `fetchStockQuote` 服務，支援台股（TWSE/TPEx）與美股（US）任意標的查詢。
   - 輸入股票代號後，自動於背後抓取 250+ 交易日之真實 OHLCV 歷史數據與即時報價，並具備本地快取與離線優雅降級機制。

2. **01 主 K 線圖專業級功能全量升級**：
   - **實體燭線繪製**：真實台美股紅黑/紅綠實體 K 棒與上下影線投影，精確映射每日 High/Low/Open/Close。
   - **十字游標 (Crosshair) 與即時查價狀態列**：滑鼠懸停於畫布時，依 X 軸座標二分法吸附最近交易日，垂直與水平虛線對齊，頂部查價列即時輸出該日 `日期 / 開盤 / 最高 / 最低 / 收盤 / 漲跌 / 成交量 / KD / MACD / RSI`。
   - **四大多週期切換器**：卡片頂部提供 `30D`、`60D`、`120D`、`250D` 切換按鈕，切換時即時重算價格與成交量上下邊界，並流暢重繪 SVG。
   - **四大副圖指標切換器**：支援 `VOL (成交量)`、`KD (9,3,3)`、`MACD (12,26,9)`、`RSI (14)` 即時切換繪製。
   - **三大主力關鍵水線動態投影**：依真實數列動態計算 `20日 VWAP 主力成本線`、`動態高檔壓力線` 與 `波段支撐線`，並以半透明發光標籤疊加於圖表。

3. **統一量化分析引擎動態化 (Pure Statistical Engine)**：
   - 建立純函式計算入口 `generateAiForceReportFromCandles`，將真實日 K 數列轉化為包含 18 張卡片所需數值的 `AiForceDashboardReport`。
   - 動態驅動：
     - **04 AI 籌碼熱區**：依真實價格與成交量分佈動態計算 Volume Profile 與 5 大量能價格階梯。
     - **05 風險雷達**：計算 20 日/60 日日報酬波動率與流動性，推導真實風險蛛網。
     - **06 預測路徑錐**：基於 60 日真實報酬之漂移率 (Drift) 與年化波動率，推導未來 3/5/10 日之標準差發散路徑。
     - **07 主力成本結構**：計算 20 日 VWAP 成本與價格乖離度。
     - **08-18 號卡片**：多空能量比、健康度雷達、市場情緒與 MLP-AI 語意結論同步根據真實指標動態生成。

4. **底部 5 大任務視圖動態連動**：
   - 任務一（綜合分析報告）：根據當前真實 MA、KD、RSI 與多空能量自動生成結構化研判文字。
   - 任務二（技術警示報告）：動態掃描破線、超買超賣與支撐壓力警示。
   - 任務三（KD + MA 表）：展示真實均線與 KD 歷史數值明細。
   - 任務四（MACD 表）：展示真實 DIF、DEM 與 OSC 歷史柱狀明細。
   - 任務五（原始資料表）：展示真實歷史日 K 原始表格，支援搜尋與分頁。

## User Stories

1. As a technical trader, I want the dashboard to fetch real historical OHLCV data when I type any stock symbol (e.g. 2330, NVDA), so that I can analyze real market action instead of mock data.
2. As a chart analyst, I want to hover my mouse over the primary K-line chart to see a crosshair snap to the nearest trading day, so that I can accurately inspect precise prices.
3. As a price-action trader, I want a dynamic price header bar displaying open, high, low, close, change, volume, KD, MACD, and RSI for the hovered candle, so that I have all key metrics in one focal point.
4. As a swing trader, I want to toggle between 30D, 60D, 120D, and 250D timeframes on the K-line chart, so that I can inspect both micro pullbacks and macro yearly trends.
5. As a momentum analyst, I want to switch the subchart indicator between Volume, KD, MACD, and RSI, so that I can cross-validate momentum divergence without opening separate indicator panels.
6. As a chip analyst, I want 20-day VWAP, dynamic resistance, and support lines overlaid directly on the candlestick chart, so that I can immediately tell whether the stock is trading above or below institutional cost.
7. As an investor, I want the Volume Profile heatmap (Card 04) to calculate real volume accumulation tiers from actual candles, so that I can identify high-volume support shelves and low-volume liquidity voids.
8. As a risk manager, I want the Risk Spider (Card 05) to compute volatility and liquidity scores from real return standard deviations, so that risk ratings reflect actual market volatility.
9. As a quant trader, I want the Forecast Cone (Card 06) to use 60-day historical drift and annual volatility to project 3-day, 5-day, and 10-day probabilistic cones, so that I can evaluate risk-reward ratios with statistical confidence.
10. As a position trader, I want the VWAP Cost Structure card (Card 07) to show the true gap between current close and 20-day VWAP, so that I avoid chasing overextended rallies.
11. As a retail investor, I want an offline/rate-limit fallback mechanism, so that if network connectivity drops or the market API throttles, the dashboard remains stable and shows clear provenance.
12. As a fundamental analyst, I want the bottom Comprehensive Report task view to synthesize real technical conditions into structured prose, so that I can read an objective AI summary.
13. As an active trader, I want the Technical Alerts task view to highlight active warnings (such as falling below MA20 or RSI > 80), so that I can act before severe drawdowns.
14. As an algorithmic researcher, I want the KD+MA and MACD task views to display the exact historical series matching the chart, so that I can verify indicator values mathematically.
15. As a compliance officer, I want the Raw Data Table task view to present the raw OHLCV rows with timestamp and volume, so that data provenance can be audited.

## Implementation Decisions

### 1. Data Pipeline & State Management Architecture
- **Decoupled Asynchronous Fetching**: The dashboard view coordinates symbol input changes through an asynchronous data fetching effect.
- **Graceful Fallback Pipeline**: If external API calls return insufficient records (< 10 candles), the system falls back safely to last-known-good cache or clean synthetic baseline, preventing null pointer crashes.
- **Immutable State Transformation**: All calculated outputs are bundled into an immutable `AiForceDashboardReport` object, ensuring pure one-way data flow.

### 2. Primary K-Line Chart Native SVG Architecture
- **Binary Search Crosshair Snapping (`findClosestCandleIndex`)**: Computes mouse X-coordinate relative to SVG viewBox width, locates the nearest candle index via normalized scaling, and projects the crosshair.
- **Period Slicing Pure Function (`sliceCandlesByPeriod`)**: Accepts an array of candles and a period mode (`'30D' | '60D' | '120D' | '250D'`), returning a bounded slice.
- **Multi-Mode Subchart Coordinate Mapper**:
  - `VOL`: Standard zero-based linear bar scaling.
  - `KD`: Fixed [0, 100] range with 20/80 overbought/oversold guide lines.
  - `MACD`: Symmetric zero-centered baseline scaling for DIF, DEM, and OSC histogram bars.
  - `RSI`: Fixed [0, 100] range with 30/70 reference lines.

### 3. Pure Calculation Seams in Quant Engine
- The transformation from raw `StockDailyCandle[]` to `AiForceDashboardReport` is strictly isolated in `generateAiForceReportFromCandles(symbol, market, candles, quote)`.
- Indicators (MA5/10/20/60, KD(9,3,3), MACD(12,26,9), RSI(14)) are computed deterministically using standard financial formulas without DOM or React dependencies.

### 4. Bottom Task Views Synchronization
- Bottom task switcher tabs dynamically render structured sub-components fed by the identical `AiForceDashboardReport` instance.

## Testing Decisions

### Good Test Principles
- Test only external behavior and observable contracts, not private React component states or CSS classes.
- Ensure all pure calculation functions are covered with edge cases:
  - Empty or single-day candle arrays (no division by zero).
  - Candles with identical High, Low, Open, Close (zero range).
  - Volatility calculations with zero standard deviation.
  - Mouse hover out-of-bounds coordinate clamping.

### Target Test Seams
1. **Engine Seam**: `src/engine/aiForceDashboardEngine.test.ts`
   - Test `generateAiForceReportFromCandles` with realistic and edge-case candle arrays.
   - Verify VWAP, MA, KD, MACD, and Volume Profile bucket calculations.
2. **Chart Seam**: `src/components/aiForceDashboard/cards/KLineChartCard.test.ts`
   - Test `sliceCandlesByPeriod` for 30D, 60D, 120D, 250D edge cases (e.g. requesting 250D when only 40D exist).
   - Test `findClosestCandleIndex` with left, right, and middle relative mouse positions.
3. **Task View Seam**: `src/components/aiForceDashboard/TaskViewsSwitcher.test.ts`
   - Test that task tabs switch active views cleanly without throwing exceptions.

### Prior Art
- `historicalPriceFetcher.test.ts`: standard mock patterns for OHLCV series.
- `omniTechnicalIndicator.test.ts`: test patterns for KD, MACD, and RSI accuracy.

## Out of Scope

- Real-time Sub-second WebSocket orderbook streaming (L2 Depth).
- Direct Broker API execution or automated trading order submission.
- Minute-level (1m/5m) intraday candlestick rendering (this spec targets Daily K-line).

## Further Notes

- All implementations must strictly conform to Taiwan/US stock color semantics (Taiwan: Red up / Green down; US: Green up / Red down).
- The specification directly addresses the user's feedback regarding "functionality deficiency" in the AI Force Dashboard.
