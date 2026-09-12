# Spec 0122: 全能技術指標大腦升級與三層實戰矩陣系統 (Omni Technical Matrix & Regime Brain System)

## Problem Statement

當前技術指標分析系統（Spec 0121）提供了包含 15 大指標與 0~100 分多空共振評分的強大底層，但在實際交易場景中暴露出以下致命痛點：
1. **無趨勢盤整時的均線假多頭高分盲點**：在窄幅橫盤震盪期，短期均線排列可能暫時呈現多頭，但 ADX 趨勢強度指標極低（例如 ADX = 5.94 < 20），且 -DI 壓制 +DI（空方動能實際上大於多方）。系統因缺乏市場狀態機與矛盾懲罰機制，依然給出 95 分的「強烈看多」極端高分，嚴重誤導交易者追高被套。
2. **缺乏布林通道極致壓縮（Squeeze）變盤預警**：當布林通道帶寬收窄（如 Bandwidth < 8%）時，代表波動率極度收斂、即將發生單向大變盤。現有系統未捕捉此相變訊號，錯失爆發行情的預先佈局或防守警示。
3. **多重關鍵位壓力帶缺乏整合（Cluster Blindness）**：樞紐點 (Pivot)、斐波那契 (Fibonacci)、布林上軌與 Darvas 箱頂各自獨立條列，交易者無法一眼看出關鍵阻力已在極小價差內重疊成「多重壓力共振帶 (Resistance Cluster)」。
4. **齊頭式固定百分比停損忽視股性波動**：無論是低波動牛皮股還是高波動飆股，缺乏真實波幅 ATR(14) 的考量，無法給出動態貼合股性的吊燈停損點 (Chandelier Exit)。
5. **資訊過載與認知負擔**：交易者希望「全都要」（涵蓋狀態機、矛盾懲罰、壓縮、壓力聚集、ATR、頂底背離、K 線形態與籌碼共振），但若一股腦全部堆砌在畫面上，會使介面眼花撩亂、焦點模糊，無法迅速下達交易決策。

## Solution

建立**「底層全能大腦 + 表層三層漸進式揭露 (Progressive Disclosure)」**的全新量化決策體系：
1. **底層八大維度全能升級**：
   - **市場狀態機 (Market Regime)**：結合 ADX、帶寬與均線離散度，精確識別 `CHOPPY_RANGE`（無趨勢盤整）、`VOLATILITY_SQUEEZE`（極致壓縮變盤期）、`TREND_BULL`（多頭趨勢）與 `TREND_BEAR`（空頭趨勢）。
   - **趨勢鈍化與矛盾懲罰 (Contradiction Penalty)**：當處於無趨勢（ADX < 20）時，趨勢維度自動施加鈍化折扣；當均線多排但 -DI > +DI 時，扣除矛盾分數 (-20 分) 並強制將評級上限封頂在 `Neutral` (最高 58 分)，徹底杜絕橫盤給 95 分的荒謬現象。
   - **布林極致壓縮預警 (Bollinger Band Squeeze Watch)**：帶寬小於 8% 或創近 20 日新低時，標記變盤在即警報。
   - **關鍵價位聚集演算法 (Key Level Cluster Aggregator)**：將 Pivot、Fibonacci、布林邊界與箱頂/箱底在 1.5% 誤差內的點位自動聚合成「第一壓力帶」、「次級阻力帶」、「短線防守帶」與「結構底線」。
   - **真實波幅 ATR(14) 與動態吊燈防守 (Chandelier Exit)**：以 22 日最高價減去 2.5 倍 ATR(14) 作為動態移動停利/停損線。
   - **背離偵測引擎 (Divergence Engine)**：自動識別股價創新高但 RSI/MACD 走低的頂背離（Bearish Divergence）與底背離。
   - **關鍵價格行為誘多偵測 (Price Action Trap)**：在關鍵壓力區偵測長上影線（墓碑線/射擊之星）防範假突破（Bull Trap）。
   - **籌碼質變交叉校驗 (Smart Money Confluence)**：技術多頭但主力籌碼連續倒貨時，給予籌碼背離警示與降權。
2. **表層三層漸進式決策介面**：
   - **第 1 層 (0 秒決策)**：一眼體質卡（校正後的分數、市場狀態徽章、大白話核心操盤總結一句話）。
   - **第 2 層 (3 秒實戰地圖)**：清晰的【實戰交易階梯矩陣】（第一壓力帶、續強加碼位、短線動態防守線、結構停損底線）。
   - **第 3 層 (深度佐證區)**：透過摺疊與標籤頁提供風險雷達、15 大指標詳細讀數與一鍵導出 Markdown 深度研報。

## User Stories

1. As an active investor, I want the confluence score to penalize trend indicators when ADX is below 20 and -DI exceeds +DI, so that I am never misled by false bullish scores (e.g. 95/100) during a choppy, directionless market.
2. As a breakout trader, I want the system to alert me when Bollinger Bandwidth compresses below 8%, so that I know a massive volatility explosion or breakout is imminent and can prepare in advance.
3. As a swing trader, I want adjacent resistance levels (Pivot R1, Darvas Box Top, Bollinger Upper, Fibonacci) within a 1.5% price distance to be grouped into a single Resistance Cluster, so that I can immediately identify heavy ceiling zones without manual mental calculation.
4. As a disciplined position holder, I want a dynamic Chandelier Exit calculated from 14-day ATR, so that my trailing stop loss automatically adapts to the stock's natural volatility rather than using a rigid, arbitrary percentage.
5. As a risk-averse trader, I want the system to detect bearish divergence where price makes a higher high while RSI or MACD histograms make lower highs, so that I can exit or avoid buying before institutional distribution causes a dump.
6. As a technical analyst, I want to be warned if a long upper shadow (shooting star or tombstone doji) forms right at the box high or resistance cluster, so that I can avoid falling for bull traps and fake breakouts.
7. As a stock tracker user, I want the technical score to factor in institutional chips data so that if technicals appear bullish but smart money has been heavily dumping shares over the past 5 days, a warning badge is raised.
8. As a busy executive, I want an "At-a-Glance Executive Card" showing the calibrated score, market regime, and a 1-sentence bottom-line takeaway at the very top of the modal, so that I can understand the stock's setup in 0 seconds.
9. As a tactical trader, I want an "Actionable Trade Matrix" displaying primary profit-taking zones, continuation targets, short-term trailing stops, and structure breakdown points, so that I can plan entry, profit-taking, and risk management within 3 seconds.
10. As an in-depth researcher, I want all detailed 15-indicator parameters and raw calculation values to be neatly tucked into organized tabs, so that I can drill into specific readings without feeling cognitively overwhelmed.
11. As a community investor, I want to export a comprehensive Markdown report that includes the new market regime, actionable matrix, divergence status, and risk levels, so that I can easily share or archive professional investment notes.
12. As a mobile and desktop user, I want all numbers and badges to render cleanly with zero floating point overflow and full null-safety, so that the UI remains robust across all screen sizes and corner cases.

## Implementation Decisions

1. **Market Regime State Machine**:
   - Define canonical market states: `TRENDING_BULL`, `TRENDING_BEAR`, `CHOPPY_RANGE`, and `VOLATILITY_SQUEEZE`.
   - Incorporate `ADX(14)`, `+DI`, `-DI`, Bollinger Bandwidth, and Moving Average slopes into a deterministic regime evaluator.
2. **Contradiction Penalty & Score Gating**:
   - When `ADX < 20`, apply a 0.4 multiplier to trend component points.
   - When moving averages display bullish alignment but `-DI > +DI`, deduct 20 points and hard-cap the overall score at 58 (`NEUTRAL`).
3. **Cluster Aggregation Algorithm**:
   - Collect candidate price levels from: Pivot (P, R1, R2, S1, S2), Fibonacci (0.236, 0.382, 0.5, 0.618), Bollinger Bands (Upper, Middle, Lower), and Darvas Box (High, Low).
   - Group levels above the current price within a relative price span $\le 1.5\%$ into Resistance Clusters (Primary & Secondary).
   - Group levels below the current price into Support / Defense Clusters (Primary & Structural).
4. **ATR(14) & Chandelier Exit Engine**:
   - Calculate True Range ($TR = \max(H-L, |H-C_{prev}|, |L-C_{prev}|)$) and Wilder-smoothed 14-period ATR.
   - Compute Long Chandelier Exit as: $\max(High_{22}) - 2.5 \times ATR_{14}$.
5. **Divergence & Price Action Heuristics**:
   - Search local price swing peaks/troughs over the latest 20 trading sessions.
   - Flag Bearish Divergence if current price peak $>$ previous peak while RSI/MACD peak $<$ previous RSI/MACD peak.
   - Flag Bull Trap / Upper Shadow if $(High - \max(Open, Close)) \ge 2 \times |Close - Open|$ at a resistance cluster.
6. **Smart Money Confluence Hook**:
   - Optional parameter injection from existing chips aggregator (`foreignBuy`, `trustBuy`, `dealerBuy`, `majorHoldersDiff`).
   - Flag chips contradiction if technical score $\ge 70$ but institutional 5-day net is sharply negative.
7. **Three-Tier Progressive Disclosure UI**:
   - Layer 1: Top Hero section with calibrated score dial, market regime pill, squeeze warning badge, and one-sentence action brief.
   - Layer 2: Four-box Actionable Trade Matrix (Take Profit Zone 1, Expansion Target, Trailing Stop, Hard Invalidation).
   - Layer 3: Tabbed body containing Risk Alerts (Divergence, Traps, Chips), Full Indicator Grid, and Exportable Markdown Report.

## Testing Decisions

1. **Test Seams**:
   - Seam 1: Pure calculation unit tests on `omniIndicatorEngine.ts` verifying regime transitions, contradiction penalties, cluster calculations, ATR, and divergence detection.
   - Seam 2: Pipeline tests on `omniReportPipeline.ts` validating the generated Markdown structure containing the new Actionable Matrix and regime commentary.
   - Seam 3: Component rendering tests on `OmniTechnicalInspectorModal.tsx` ensuring 3-tier progressive disclosure displays correctly without UI clutter or NaN/null errors.
2. **Behavioral Testing Focus**:
   - Specifically test the scenario from the user review: stock in Darvas box with ADX = 5.94, -DI > +DI, Bandwidth < 8%, verifying that score does NOT exceed 58, Squeeze alert is triggered, and Resistance Cluster forms around Box Top & Bollinger Upper.
   - Test zero-division, insufficient history (< 14 bars), flat volume, and single-candle extreme volatility edge cases.

## Out of Scope

1. Direct execution of automated broker buy/sell orders.
2. Intraday tick-by-tick real-time websocket data (analysis operates on daily OHLCV series).
3. Complex multi-year machine learning backtesting engines.

## Further Notes

- Maintains 100% backward compatibility with existing interfaces calling `calculateOmniIndicators`.
- Follows the Single-Context architecture, synchronizing any new ubiquitous terms into `CONTEXT.md`.
