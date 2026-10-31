# 0209 Specification: 宏觀戰情室 3.0 — 台美費半跨市傳導鏈、總經波段雙溫度計、已配置 API 金鑰池全自動接線與跨模組孤島貫通規格 (Macro War Room 3.0: Cross-Market SOX/ADR Transmission, Macro-Swing Dual Thermometer, Encrypted API Key Pool Pipeline, and Cross-Module Integration)

## Problem Statement

使用者以法人與長期/波段實戰投資者視角檢視「宏觀戰情室 (`WarRoomWorkspace.tsx`)」及全專案關聯模組時，面臨以下 4 大結構性失真、數據造假與跨模組孤島問題：

1. **假數據硬編碼與指標定義失真 (Hardcoded Fake Data & Misleading Metric Definitions)**：
   - **黃金現貨 (`goldPrice`) 嚴重失真**：`DEFAULT_MACRO_SNAPSHOT` 與 `macroPulseStorage.ts` 硬編碼 `goldPrice: 2515.2`，且介面標題寫成 `黃金現貨 (GLD)` 卻標註單位 `USD/oz`，混淆了 `GLD` ETF（約 1/10 盎司）與真實國際黃金現貨/期貨（`GC=F` / `XAUUSD=X`，實際位於 3,000～4,000+ USD/oz 區間）。
   - **正弦/餘弦假歷史與亂數刷新**：`macroPulseStorage.ts` 的 `generateSampleHistoricalMacroData` 使用 `Math.sin(i)` 與 `Math.cos(i)` 捏造 30 天歷史數據；`WarRoomWorkspace.tsx` 的「重新整理數據 (`handleRefreshPulse`)」使用 `(Math.random() - 0.5) * 4` 隨機跳動數字，完全未發送網路請求。
   - **後端同步腳本寫死假常數**：`sync-us-market.cjs` 與 `bootstrap-lakehouse-full.cjs` 寫死 `treasuryYield10y: 4.12`、`vixClose: 18.25`、`cnnFearGreedScore: 54.0` 存入 SQLite `macro_sentiment_daily`，污染個股 AI 戰情室。
   - **已申請之 9 大外部金融 API 金鑰池淪為孤島**：使用者已於設定頁 `UnifiedApiKeyManager` 配置 `FRED`、`FinMind`、`Finnhub`、`FMP`、`Tiingo`、`Alpha Vantage` 等金鑰並加密儲存於 `apiKeyStorage`，但 `globalKeyRotator` 啟動時未自動載入，且未傳遞予後端 `/api/market/macro`，導致聯準會利率 (`4.75%`)、美國 CPI (`2.9%`)、大盤融資維持率 (`162%`) 等全數停留在寫死假值。

2. **缺乏台美分流與費城半導體 (`^SOX`) / 台積電 ADR (`TSM`) 跨市場波段傳導鏈**：
   - 台股波段與電子權值股受美股 **費城半導體指數 (`^SOX`)** 與 **台積電 ADR (`TSM`) 溢折價率** 影響極深，但戰情室完全未納入 `^SOX` 與 `TSM` 溢折價率。
   - 戰情室將全球總經、美股與台股指標混雜平鋪，無法依「🌐 全球總經與跨市傳導」、「🇹🇼 台股波段與廣度」、「🇺🇸 美股與費半動能」分流檢視，亦未與頂部導覽列 `Header` 的市場切換器 (`ALL / TW / US`) 雙向同步。
   - 缺乏台股大盤 **「漲跌家數騰落廣度 (Market Breadth / 站上 20MA 比例)」** 與 **「三大法人現貨合計買賣超」**，無法識破台股常見的「拉積盤（賺指數賠價差）」陷阱。

3. **長線總經配置與短中期波段操作訊號打架 (Macro vs. Swing Signal Conflict)**：
   - 單一評分同時混雜長線慢變數（CPI、Fed 利率、M2）與短線快變數（VIX、外資期貨空單），導致長線總經偏空時無法反映短線跌深反彈買點，或長線偏多時無法警告短線 20MA 正乖離過熱。
   - 缺乏台美四大核心指數（加權指數 `^TWII`、費城半導體 `^SOX`、標普 `^GSPC`、納指 `^IXIC`）的 **20MA（月線）/ 60MA（季線）波段位階與乖離率**，以及 **台美跨時區開休市狀態 (`marketStatusEngine`)**。

4. **全專案 12 個既有專業引擎未與戰情室接線（跨模組數據孤島）**：
   - **總資產淨值 (`totalNavTwd`) 與再平衡偏離度 (`maxDriftPercent`) 失真**：`App.tsx` 僅傳入股票市值而非 `exposureMetrics.effectiveNavTWD`；`maxDriftPercent` 硬編碼為 `2.8%` 未接 `rebalancingEngine`；1-Day 95% VaR 波動率硬編碼為 `18%` 未隨 VIX 動態縮放。
   - **可動用現金未扣除在途交割與近期定期定額**：未扣除 T+2 待交割淨流出 (`pendingSettlements`) 與近 7 日 `dcaSchedulerEngine` 預計扣款，高估逢低加碼子彈。
   - **ETF 穿透、質押壓力測試與美股匯差緩衝未接線**：僅寫死檢查 `['0050', '00923', '009816', '2330']` 四檔代號而未接 `lookThroughEngine` 計算真實半導體穿透權重；無借款時硬塞 `250%` 假維持率且未接 `marginStressEngine`；`USD/TWD` 未接 `fxBreakdown` 顯示美股持倉成本匯率緩衝墊。
   - **雙動能 `-999%`、平坦假 K 線與持股訊號斷鏈**：雙動能未從本地 SQLite / IndexedDB 水合非持倉標的 (`SPY`, `QQQ`, `SMH`, `TLT`, `GLD`) 日 K 導致顯示 `-999%`；持股箱子掃描傳入 `open=high=low=close` 平坦假 K 線；未整合個股 `TradePlan` 自訂停損停利 (`riskAlertEngine`)、處置股警示 (`dispositionWindowEngine`)、歷史追高勝率 (`behavioralAuditEngine`)、除息蒸發點數 (`estimateExDividendIndexImpactPoints`)、宏觀 AI 戰略釘選 (`strategyPinEngine`)、全站紅綠主題色 (`colorTheme`) 以及一鍵跳轉個股技術面/AI 戰情室/下單彈窗之動作閉環。

---

## Solution

遵循 KISS 原則、第一性原理與「零新第三方套件、零新申請 API Key、100% 複用既有純函式引擎」方針，實作四大高內聚工程單元：

1. **已配置 API 金鑰池全自動橋接與真實宏觀/跨市數據管線 (`/api/market/macro`)**：
   - 啟動時自動由 `loadEncryptedKeyPool()` 水合 `globalKeyRotator`，並在呼叫 `/api/market/macro` 時透過本地安全 Header 動態傳遞使用者已配置之 `FRED`、`FinMind`、`Finnhub`、`FMP`、`Tiingo`、`Alpha Vantage` 金鑰，結合免金鑰之 **Yahoo Finance v8 API**、**台灣期交所 OpenAPI** 與 **本地 SQLite Lakehouse 聚合**。
   - 真實抓取並持久化：**費城半導體 (`^SOX`)**、**台積電 ADR (`TSM`) 與台積電 (`2330.TW`) 溢折價率 (%)**、**四大指數 (`^TWII`, `^SOX`, `^GSPC`, `^IXIC`) 報價與 20MA/60MA 乖離率**、**國際黃金現貨期貨 (`GC=F`, USD/oz，正確顯示 3,000~4,000+)**、**WTI 原油 (`CL=F`)**、**美元指數 (`DX-Y.NYB`)**、**台幣匯率 (`TWD=X`)**、**VIX (`^VIX`)**、**FRED 官方美債殖利率 (`DGS10`, `DGS2`, `DGS3MO`, `T10Y2Y`) / CPI 年增率 (`CPIAUCSL`) / Fed 利率 (`FEDFUNDS`) / 高收益債利差 (`BAMLH0A0HYM2`)**、**期交所/FinMind 外資台指期未平倉與大盤融資維持率**，以及 **SQLite 全市場台股騰落廣度（漲跌家數比、站上 20MA 比例）與三大法人現貨買賣超**。
   - 100% 拔除 `generateSampleHistoricalMacroData`（`Math.sin`/`Math.cos`）、`handleRefreshPulse`（`Math.random`）與後端同步腳本寫死常數，為每項指標標註真實 `asOfDate` 時間戳與資料源狀態燈號。

2. **「長線總經配置 × 短線波段戰術」雙溫度計與跨市傳導決策引擎 (`macroAdvisorEngine.ts`)**：
   - 將單一混淆分數拆解為 **「🧭 長線總經配置溫度計 (Strategic Macro Regime，決定總股票倉位上限 % 與股債配置)」** 與 **「⚡ 短中期波段戰術溫度計 (Tactical Swing Pulse，綜合費半/台股 20MA 位階、ADR 溢折價、VIX、期現貨籌碼與市場廣度，決定拉回買進或高乖離減碼)」**。
   - 實作 **台積電 ADR 溢折價率計算器**（$\text{ADR 折合台股價} = \frac{\text{TSM USD} \times \text{USD/TWD}}{5}$）與 **費半 (`^SOX`) 跨夜傳導評估**。
   - 將 1-Day 95% VaR 改為隨即時 `VIX / 100` 動態縮放；無借款時維持率誠實回傳 `null`（嚴禁寫死 `250%`）；接通 `estimateExDividendIndexImpactPoints` 輸出除息蒸發點數防假跌破提示；擴充 `periodicCatalystEngine` 與 `Finnhub/FMP` 支援 **台積電季法說會/除息日** 與 **NVDA 財報日**。

3. **全專案 12 大既有引擎無縫接線与真实 K 線水合 (`App.tsx` & Lakehouse OHLCV)**：
   - **真實淨值與自由子彈**：傳入 `exposureMetrics.effectiveNavTWD`；計算 **「真·自由可動用子彈 (Free Deployable Cash)」** ＝ 已交割現金 － T+2 待交割淨流出 (`pendingSettlements`) － 近 7 日定期定額預留款 (`dcaSchedulerEngine`)。
   - **真實穿透、再平衡、質押壓測與美股匯差**：接入 `lookThroughEngine` 計算真實 **台積電 (`2330`+`TSM`) 與半導體穿透總權重 (%)** 及費半波動損益敏感度；接入 `rebalancingEngine` 計算真實 `maxDriftPercent`；接入 `marginStressEngine` 計算大盤 `-10% / -20%` 維持率與追繳緩衝跌幅；接入 `fxBreakdown` 顯示美股部位加權成本匯率與累積匯差緩衝墊。
   - **真實 K 線與個股風控融合**：從本地 SQLite (`/api/market/history/:symbol`) 與 IndexedDB 水合雙動能標的 (`SPY`, `QQQ`, `SMH`, `TLT`, `GLD` 等) 及持倉股真實 OHLCV 日 K，消滅 `-999%` 與平坦假 K 線；融合 `riskAlertEngine`（自訂停損停利觸價）、`dispositionWindowEngine`（處置/注意股徽章）與 `behavioralAuditEngine`（高乖離時提示個人歷史追高勝率）。

4. **「30 秒盤前決策漏斗」高內聚模組化 UI 重構 (`WarRoomWorkspace.tsx`)**：
   - 將近 2,000 行的單體元件拆分為高內聚子元件，採用三層式決策漏斗：
     - **Layer 1（3 秒定調）**：台美開休市雙時鐘 (`marketStatusEngine`) ＋ 總經/波段雙溫度計 ＋ 費半 `^SOX` / 台積電 ADR 溢折價 / 台股騰落廣度傳導橫幅 ＋ 外部 AI 宏觀戰略釘選列 (`strategyPinEngine`)。
     - **Layer 2（10 秒掃描）**：`[🌐 全球總經與跨市] [🇹🇼 台股波段與籌碼] [🇺🇸 美股與費半動能]` 三分頁切換（與頂部 `Header` 雙向連動），僅渲染該視角相關指標卡，搭配右側「部位防禦護欄與自由子彈卡」。
     - **Layer 3（15 秒行動）**：持股多空戰術訊號表（異常突破/破線/觸停損/處置股優先展開，正常震盪股可收合），每列提供一鍵開啟 **「全息技術面 (`OmniTechnicalInspectorModal`)」**、**「個股 AI 戰情室 (`AiForceDashboardView`)」** 與 **「快速下單 (`TradeModal`)」** 按鈕，並全面對齊全站 `colorTheme`（`var(--gain-color)` / `var(--loss-color)`）。

---

## User Stories

1. As a Taiwan and US stock investor, I want to switch between `🌐 全球總經與跨市傳導`, `🇹🇼 台股波段與籌碼`, and `🇺🇸 美股與費半動能` tabs in the Macro War Room (synced bidirectionally with the global Header market filter), so that I can focus on the exact indicators driving each market without visual clutter.
2. As a semiconductor-focused swing trader, I want the Macro War Room to prominently track the Philadelphia Semiconductor Index (`^SOX`), its 20MA/60MA swing posture and bias %, and the TSMC ADR (`TSM`) vs. `2330.TW` premium/discount percentage, so that I can anticipate Taiwan market opening gaps and electronics sector rotation.
3. As a data-driven investor, I want Spot/Futures Gold (`GC=F`, in `USD/oz` around 3,000–4,000+) to be clearly separated from the `GLD` ETF, and all macro metrics to be fetched from real authoritative sources without any `Math.sin`, `Math.cos`, `Math.random`, or hardcoded fake numbers, so that my investment decisions are grounded in 100% factual market data.
4. As a user who has already configured API keys (`FRED`, `FinMind`, `Finnhub`, `FMP`, `Tiingo`, `Alpha Vantage`) in `UnifiedApiKeyManager`, I want the system to automatically load my encrypted key pool into `globalKeyRotator` and use them to fetch official Federal Reserve CPI, Fed Funds Rate, Treasury yields, High-Yield Credit Spreads, Taiwan market margin maintenance, and earnings calendars without requiring me to apply for any new API keys.
5. As a hybrid long-term allocator and swing trader, I want two separate top-level thermometers — a **Strategic Macro Regime Thermometer** (dictating maximum portfolio equity allocation %) and a **Tactical Swing Pulse Thermometer** (dictating pullback entry vs. high-bias profit-taking based on 20MA/60MA, VIX, SOX, and breadth) — so that long-term macro headwinds do not blind me to tactical oversold bounces, and long-term bull markets do not blind me to short-term overbought pullbacks.
6. As a Taiwan swing trader, I want to see Taiwan Market Breadth (advancing vs. declining stock counts and % of stocks above 20MA) and aggregated 3 Major Institutional Spot Net Buy/Sell alongside Foreign Futures Net Open Interest, so that I can immediately distinguish a narrow TSMC-only rally ("拉積盤") from a broad-based bull wave and cross-check futures hedging against spot flows.
7. As a risk-conscious portfolio manager, I want the Macro War Room's total NAV to match `exposureMetrics.effectiveNavTWD` (including cash, receivable dividends, and debt deductions), and my "Free Deployable Cash Ammo" to deduct T+2 pending settlement outflows (`pendingSettlements`) and upcoming 7-day DCA commitments (`dcaSchedulerEngine`), so that I never over-commit cash and risk settlement default during a dip.
8. As an ETF and semiconductor investor, I want the War Room to use `lookThroughEngine` to display my true look-through weight in TSMC (`2330` + `TSM`) and the broader semiconductor sector across all my ETFs (`0050`, `00403A`, `00981A`, `00923`, `00924`, etc.) and individual stocks, along with a SOX stress sensitivity estimate ($\Delta \text{TWD}$ if `^SOX` moves $\pm 3\%$).
9. As a leveraged investor or debt-free investor, I want the War Room to honestly display "無質押負債 (零槓桿)" when I have no loans (eliminating the fake `250%` maintenance ratio in the UI and AI prompt), and when I do have loans, to display the market drop tolerance to the 130% margin call line via `marginStressEngine`.
10. As a US stock investor, I want the `USD/TWD` indicator card to integrate `fxBreakdown` and show my weighted average USD purchase FX rate versus the current spot rate and cumulative FX cushion in TWD, so that I know whether currency moves are helping or hurting my US equity returns.
11. As a systematic rotator using Dual Momentum and Darvas Box signals, I want the War Room to hydrate real historical OHLCV candles from the local SQLite Lakehouse (`/api/market/history/:symbol`) and IndexedDB for both my holdings and benchmark ETFs (`SPY`, `QQQ`, `SMH`, `TLT`, `GLD`, `0050.TW`, `0056.TW`), eliminating `-999%` scores and flat fake candles.
12. As an execution-focused trader, I want each holding signal row in the War Room to integrate my custom `TradePlan` stop-loss/take-profit alerts (`riskAlertEngine`), Taiwan disposition/attention stock badges (`dispositionWindowEngine`), and 1-click deep-link buttons to open `OmniTechnicalInspectorModal`, `AiForceDashboardView`, or `TradeModal`.
13. As a disciplined trader, I want the War Room to display Taiwan and US market open/close session clocks (`marketStatusEngine`), warn me with my personal historical FOMO chasing win rate vs. pullback win rate (`behavioralAuditEngine`) when market bias is overheated, and display ex-dividend index point evaporation estimates (`estimateExDividendIndexImpactPoints`) and upcoming TSMC/NVDA catalysts.
14. As an AI-assisted investor, I want to paste external AI (Claude/ChatGPT/Gemini) macro JSON recommendations back into a **Macro Strategy Pin Bar** at the top of the War Room (`strategyPinEngine`) and have all bullish/bearish colors across the entire War Room respect my global `colorTheme` setting (`taiwan` red-up/green-down vs. `international` green-up/red-down).

---

## Implementation Decisions

### Decision 1: Encrypted API Key Pool Bridge & Real Multi-Source Macro Endpoint (`GET /api/market/macro`)
- Hydrate `globalKeyRotator` from `loadEncryptedKeyPool()` (and legacy `apiKeysConfig` fallback) via a shared helper `ensureKeyPoolHydrated()` so keys configured in `UnifiedApiKeyManager` are immediately usable across the application.
- Enhance `GET /api/market/macro` in `vite-market-middleware.cjs` and `ingest-macro-sentiment.cjs` to accept optional local request headers (`x-fred-key`, `x-finmind-key`, `x-finnhub-key`, `x-fmp-key`, `x-tiingo-key`, `x-alphavantage-key`) or environment variables, and execute a fast multi-source parallel fetch (with 5-second timeout circuit breaker and SQLite cache persistence):
  - **Yahoo Finance v8 Chart API (No key required)**: Fetch latest price, previous close, change %, and 60-day daily closes (to compute 20MA, 60MA, and 20MA bias %) for `^SOX` (Philly Semiconductor), `TSM` (TSMC ADR), `2330.TW` (TSMC TW), `^TWII` (TAIEX), `^GSPC` (S&P 500), `^IXIC` (Nasdaq), `GC=F` (Gold Futures/Spot USD/oz), `CL=F` (WTI Crude Oil), `DX-Y.NYB` (US Dollar Index), `TWD=X` (USD/TWD), `^VIX` (CBOE VIX), `^TNX` (US 10Y Yield), and `^IRX` (US 13W/3M Treasury Yield).
  - **FRED Official API (using user's `fred` key from pool when available)**: Fetch `FEDFUNDS` (Fed Funds Rate), `CPIAUCSL` (12-month YoY CPI inflation %), `T10Y2Y` (10Y-2Y Treasury Spread), and `BAMLH0A0HYM2` (US High-Yield Credit Spread OAS).
  - **Taiwan Futures & Margin (TAIFEX OpenAPI + FinMind key fallback)**: Fetch Foreign Institutional TX Futures Net Open Interest (`taiwanFuturesNetOi`) and Taiwan market-wide margin balance / maintenance ratio (`taiwanMarginMaintenance`).
  - **Local SQLite Lakehouse Breadth & Institutional Spot Aggregation**: Query `daily_candles` and `tw_institutional_chips` in `sqlite-db-core.cjs` for the latest trading date to compute:
    - `twMarketBreadth`: `{ advancingCount, decliningCount, unchangedCount, pctAbove20MA, breadthRegime: 'BROAD_RALLY' | 'NARROW_TSMC_TRAP' | 'BROAD_DECLINE' | 'NEUTRAL' }` (detecting "拉積盤" when `^TWII` is positive but `decliningCount > advancingCount * 1.3`).
    - `twInstitutionalSpot`: `{ foreignNetTwdBillions, trustNetTwdBillions, dealerNetTwdBillions, asOfDate }`.
- Remove all hardcoded fake macro constants from `sync-us-market.cjs` and `bootstrap-lakehouse-full.cjs`, replacing them with calls to the real ingestion module.
- Completely remove `generateSampleHistoricalMacroData` (`Math.sin`/`Math.cos`) from `macroPulseStorage.ts` and `Math.random()` from `handleRefreshPulse` in `WarRoomWorkspace.tsx`.

### Decision 2: Dual-Axis Macro & Swing Decision Engine (`macroAdvisorEngine.ts` & `src/types/macro.ts`)
- Extend `MacroPulseSnapshot` with:
  - Cross-market & index swing fields: `soxIndex`, `soxChangePercent`, `soxBias20Ma`, `soxAbove20Ma`, `soxAbove60Ma`, `tsmAdrPrice`, `tsmTwPrice`, `tsmAdrPremiumPercent`, `taiexIndex`, `taiexChangePercent`, `taiexBias20Ma`, `taiexAbove20Ma`, `taiexAbove60Ma`, `sp500ChangePercent`, `sp500Bias20Ma`, `nasdaqChangePercent`, `nasdaqBias20Ma`.
  - Taiwan breadth & spot chips fields: `twMarketBreadth`, `twInstitutionalSpot`.
  - Freshness metadata: `asOfTimestamp`, `sourceStatus: 'LIVE' | 'CACHED' | 'CALIBRATED'`.
- Implement pure functions in `macroAdvisorEngine.ts`:
  - `calculateTsmcAdrPremium(tsmUsd: number, tw2330Twd: number, usdToTwd: number)`: Computes converted TWD price `(tsmUsd * usdToTwd) / 5` and premium percentage `((converted - tw2330Twd) / tw2330Twd) * 100`.
  - `evaluateMacroDualThermometer(snapshot: MacroPulseSnapshot)`: Returns:
    - `strategicRegime`: `{ score: number (0-100), posture: MacroPostureType, label: string, recommendedEquityCapPercent: number, drivers: string[] }` driven by yield curve, Fed rate, CPI, credit spread, and valuation.
    - `tacticalSwing`: `{ score: number (0-100), signal: 'AGGRESSIVE_SWING' | 'PULLBACK_BUY' | 'OVERHEATED_TRIM' | 'DEFENSIVE_CASH', label: string, twSwingSummary: string, usSwingSummary: string, isNarrowTsmcTrap: boolean }`, driven by `^SOX` & `^TWII` 20MA/60MA posture, `tsmAdrPremiumPercent`, VIX, foreign futures + spot flow, and market breadth.
  - Scale `calculateMacroVaRAndStress` annualized volatility dynamically with `Math.max(0.12, (snapshot.vix || 18) / 100)` instead of hardcoded `0.18`.
  - When `totalLoanPrincipal <= 0`, set `marginMaintenanceRatio` to `null` (not `250%`), and render `"無質押負債 (零槓桿)"` in both the UI and the AI Morning Brief Prompt.

### Decision 3: Cross-Module Engine Wiring (`App.tsx` & `WarRoomWorkspace.tsx`)
- In `App.tsx`:
  - Pass `totalNavTwd={exposureMetrics.effectiveNavTWD}` (instead of equity-only `summary.combinedTWD.marketValue`).
  - Pass `currentMarket` and `onMarketChange` to sync the Header market filter (`ALL` / `TW` / `US`) with the War Room perspective tabs (`GLOBAL` / `TW` / `US`).
  - Pass `pendingSettlements`, `dcaPlans`, `rebalancingConfig`, and deep-link handlers (`onInspectTechnical`, `onOpenAiForce`, `onOpenTradeModal`).
- Inside `WarRoomWorkspace` (and its extracted subcomponents):
  - **Free Deployable Cash Ammo**: Compute `freeDeployableCashTwd = Math.max(0, settledCashTwd - pendingPayableNetTwd - upcoming7dDcaTwd)`.
  - **Look-Through Semiconductor & TSMC Exposure**: Call `calculateLookThroughExposure(holdings, usdToTwdRate)` to compute true look-through weight in `2330`/`TSM` and semiconductor/AI hardware holdings, plus estimated TWD impact for a $\pm 3\%$ `^SOX` move.
  - **Real Rebalancing Drift**: Call `calculateRebalancing` from `rebalancingEngine.ts` to derive true `maxDriftPercent` instead of hardcoded `2.8%`.
  - **Margin Drop Tolerance & FX Cushion**: Call `calculateMarginStress` when loans exist to show drop buffer to 130%; call `calculateHoldingFxBreakdown` across US holdings to show weighted cost FX rate vs. live `usdToTwdRate` and net FX gain/loss cushion in TWD.
  - **Real Lakehouse OHLCV Hydration**: Automatically fetch missing OHLCV series from `/api/market/history/:symbol?limit=260` (and IndexedDB `getSymbolOhlcv`) for Dual Momentum ETFs (`SPY`, `QQQ`, `SMH`, `TLT`, `GLD`, `0050.TW`, `0056.TW`, `00679B.TW`) and active holdings so `evaluateDualMomentumRotation` and `scanMuscleBookerItem` always run on real candles.
  - **Holding Tactical Signals Enrichment**: Combine `scanMuscleBookerItem` with `evaluateRiskStatus` (`TradePlan` stop-loss/take-profit triggers), `resolveDispositionAttentionStatus` (disposition/attention badges), and `calculateBehavioralAuditReport` (FOMO chasing win-rate reminder when overheated).
  - **Catalyst Calendar & Ex-Dividend Evaporation**: Add recurring TSMC Quarterly Investor Conference (Jan/Apr/Jul/Oct), TSMC Ex-Dividend, and NVDA Earnings windows to `periodicCatalystEngine.ts` (supplemented by Finnhub/FMP earnings calendar when key is available), and display `estimateExDividendIndexImpactPoints` on the Taiwan market view.

### Decision 4: 30-Second Decision Funnel Modularization & Theme Compliance
- Decompose `WarRoomWorkspace.tsx` by extracting cohesive subcomponents under `src/components/warRoom/`:
  - `MacroDualThermometerBar.tsx`: Renders Taiwan/US session clocks (`getTwMarketStatus`, `getUsMarketStatus`), the Strategic Macro vs. Tactical Swing dual thermometers, and the Cross-Market Transmission strip (`^SOX`, `TSM` ADR Premium %, `^TWII` Breadth, `USD/TWD`).
  - `MacroStrategyPinBar.tsx`: Lightweight loopback pin bar allowing users to paste external LLM JSON strategy output (`recommendedEquityCapPercent`, `soxSupportLevel`, `taiexSupportLevel`, `tacticalSummary`) and pin it at the top of the War Room.
  - `PortfolioShieldAndAmmoCard.tsx`: Renders Free Deployable Cash breakdown (Settled Cash - T+2 Pending - 7D DCA), Look-Through TSMC/Semiconductor Exposure & SOX Stress Test, Margin Safety Buffer (or Zero-Leverage badge), and Real Rebalancing Drift.
  - `MacroQuickCalibrationModal.tsx`: Existing calibration modal updated to include `soxIndex` and `tsmAdrPrice`.
- Replace all hardcoded `#4ade80` / `#f87171` bullish/bearish colors in `WarRoomWorkspace.tsx` and subcomponents with CSS theme variables (`var(--gain-color)` and `var(--loss-color)`) to honor `ADR-0044` (`colorTheme: 'taiwan' | 'international'`).

---

## Testing Decisions

- **What makes a good test**: Assert observable outputs, calculated risk/swing metrics, API payload transformations, and rendered DOM elements across high-level public seams without testing private implementation details.
- **Test Seams**:
  - **Seam 1 (`src/engine/macroAdvisorEngine.test.ts` & `src/utils/macroPulseStorage.test.ts`)**:
    - Test `calculateTsmcAdrPremium` accuracy (5:1 conversion & premium/discount %).
    - Test `evaluateMacroDualThermometer` separation of strategic equity cap % vs. tactical swing signals (including "拉積盤" `isNarrowTsmcTrap` detection and `^SOX` transmission).
    - Test VIX-scaled dynamic VaR, `null` maintenance ratio when `totalLoanPrincipal === 0` (verifying `250%` never appears in UI or AI brief), and `estimateExDividendIndexImpactPoints`.
    - Test `macroPulseStorage` Zero-Mock policy (no sine/cosine sample generation, accurate `goldPrice` ~3,000–4,000+ USD/oz persistence).
  - **Seam 2 (`src/engine/ingestMacroSentiment.test.ts`)**:
    - Test multi-source macro ingestion (`FRED`, `FinMind`, Yahoo Finance `^SOX`/`TSM`/`GC=F`, TAIFEX) and SQLite Lakehouse Taiwan Market Breadth (`advancingCount`, `decliningCount`, `pctAbove20MA`) + Institutional Spot aggregation.
  - **Seam 3 (`src/components/WarRoomWorkspace.test.tsx`)**:
    - Test rendering of the 3 perspective tabs (`GLOBAL`, `TW`, `US`) and bidirectional `Header` market filter sync.
    - Test Free Deployable Cash deduction of T+2 pending settlements and 7-day DCA commitments.
    - Test Look-Through Semiconductor weight & SOX stress impact rendering, US FX cushion display, and 1-click deep-link buttons (`onInspectTechnical`, `onOpenAiForce`, `onOpenTradeModal`).
    - Test `MacroStrategyPinBar` loopback JSON pinning and `var(--gain-color)` / `var(--loss-color)` theme compliance.
- **Prior Art**: `src/engine/macroAdvisorEngine.test.ts`, `src/engine/warRoomPromptE2E.test.ts`, `src/engine/zeroMockPolicy.test.ts`, `src/engine/ingestMacroSentiment.test.ts`.

---

## Out of Scope

- Requiring the user to register for any new paid or external API keys beyond the existing 9 providers in `UnifiedApiKeyManager`.
- Intraday tick-by-tick WebSocket streaming for futures or options chains.
- Adding third-party charting libraries.

---

## Further Notes

This specification unifies all 3 rounds of institutional and swing-trading audit findings under a strict KISS architecture: zero mock data, 100% reuse of the user's existing encrypted API key pool and 12 internal calculation engines, and a clean 30-second pre-market decision funnel.

