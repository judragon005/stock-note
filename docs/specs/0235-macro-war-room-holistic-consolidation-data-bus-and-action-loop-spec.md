# Spec 0235: 宏觀戰情室 3.5 全量修枝補缺、統一數據總線與一鍵決策閉環重構規格 (Macro War Room 3.5: Holistic Pruning, Unified Data Bus, Math Precision & Direct Action Loop Spec)

## Problem Statement

當投資人以首席風險官 (CRO) 與波段/慢富雙軌實戰視角檢視「宏觀戰情室 (`WarRoomWorkspace`)」與關聯之「慢富週期工作區 (`ZavySlowWealthWorkspace`)」時，面臨以下 **4 大結構性失真、同頁三重重複渲染、跨頁資料腦裂與死胡同 UI 問題**：

1. **後端即時數據與前端清洗器欄位脫鉤，導致「假即時 (Silent Constant Fallback)」**：
   - 後端 `/api/market/macro` 端點已從 FRED、Yahoo Finance、CNN 與本機 SQLite 抓取並回傳 `treasuryYield10y`、`treasuryYield2y`、`riskFreeRate3m`、`yieldSpread10y2y`、`cnnFearGreedScore`、`creditSpreadOas`、`cccSpreadOas`、`igSpreadOas`、`breakeven10y`、`initialClaims`、`usOrdersMinusInvSpread`、`soxClose`、`taiexClose`、`sp500Close`、`nasdaqClose` 及 `twRevenue`。
   - 然而前端清洗器 `sanitizeMacroRecord` 僅讀取 `us10y`、`us2y`、`fearAndGreedIndex`、`creditSpreadOAS`、`soxIndex`、`taiexIndex` 等舊鍵名，導致使用者點擊「即時同步」後，10Y/2Y 美債、恐懼貪婪與高收益債利差靜默退回寫死常數 (`3.85%`, `3.98%`, `50`, `3.5%`)，而 `soxIndex`、`taiexIndex`、`sp500Index`、`nasdaqIndex` 更因映射為 `undefined` 而抹除既有數值；同時 `vixLevel` 與 `fearAndGreedLevel` 未隨最新數值動態重算。
   - 後端並未抓取 `CDS 違約保險指數` 與 `美/台 M2 年增率`，導致戰情室該欄位永遠顯示寫死常數 (`65`、`+2.8%`、`+5.6%`)，反而將後端已真實入庫的 FRED **CCC 級垃圾債利差 (`cccSpreadOas`)**、**投等債利差 (`igSpreadOas`)**、**美國製造業新訂單減存貨差額 (`usOrdersMinusInvSpread`)** 與 **台股月營收擴散指數 (`twRevenue`)** 丟棄不用。

2. **個人風控指標算術失真与雙套建議持股上限矛盾 (Math Distortion & Split-Brain Equity Cap)**：
   - **距 130% 追繳安全耐受跌幅 (`maxDropToleranceTo130Percent`) 縮小 100 倍**：質押壓力引擎回傳 `0~1` 小數比例（如 `0.35` 代表可耐受 `-35.0%` 跌幅），但聚合 Hook 誤將其再除以 `100` 變為 `0.0035`，導致 UI 顯示為 `-0.4%`。
   - **費半波動 $\pm 3\%$ 敏感度 (`soxStressImpact3PctTWD`) 與組合 Beta 斷鏈**：聚合 Hook 未計算並傳入 `soxStressImpact3PctTWD` 與 `portfolioBeta`，導致 UI「費半波動 $\pm 3\%$ 敏感度」永遠顯示 `±NT$ 0`。
   - **單日 95% 在險價值 (`1-Day 95% VaR`) 高估現金部位風險**：VaR 直接以包含現金之整戶總淨值 (`totalNavTWD`) 乘以大盤波動率，未扣除零波動率的實質可用現金，導致 90% 現金帳戶與 100% 滿倉股票帳戶算出相同的 VaR。
   - **建議股票總倉位上限雙重標準**：頂部雙軌溫度計顯示 `strategicRegime.recommendedEquityCapPercent`（範圍 `30%~85%`），但下方 AI 晨報調倉減碼試算與複製簡報卻讀取舊版單軌 `macroThermometer.suggestedEquityAllocationPercent`（範圍 `20%~90%`），同頁出現兩套矛盾的減碼標準。

3. **歷史疊床架屋造成同頁三重重複渲染、2,266 行巨石元件與隱私洩漏漏洞**：
   - **個人防護盾同頁重複渲染 3 次**：頂部已渲染新版 `PortfolioShieldAndAmmoCard` (L3)，但下方仍殘留重複的「個人在險價值與急速壓力測試三欄卡 (L6)」與「舊版個人投資組合宏觀防護盾 (L8)」；且 L6 與 L8 未套用 `privacyMode`，在隱私遮蔽模式下直接洩漏 `cashBalanceTwd` 與 `valueAtRisk95TWD` 明文金額。
   - **操作按鈕雙重重複**：頂部標題列與下方 80px 處的雙溫度計同時渲染兩組 `GLOBAL / TW / US` 視角切換器；頂部標題列與 AI 晨報卡片同時渲染兩組完全相同的「複製簡報 / 脫敏複製 / LLM Payload」按鈕。
   - **AI 晨報文字牆冗餘**：晨報卡片內的「宏觀環境診斷」與「個人防護盾體質診斷」僅將上下方卡片的數字以長篇文字重抄一遍，佔據大量首屏空間。

4. **死胡同 UI (Dead-End UI)、視角切換半殘與跨工作區數據孤島**：
   - **ETF 穿透明細被丟棄**：聚合 Hook 已算出完整的 `lookThroughReport`（各 ETF 與個股穿透貢獻明細），但容器解構時直接丟棄，使用者無法展開檢視穿透權重來源。
   - **AI 戰略釘選未與實際持股水位比對**：`MacroStrategyPinBar` 釘選了外部 AI 建議持股上限（如 $\le 60\%$），卻未與帳戶當前實際股票佔比對照警示。
   - **雙動能排行榜與晨報執行清單無行動閉環**：雙動能排行榜列出榜首與換倉提醒，卻無在庫權重標記與一鍵跳轉「技術面 / 下單換倉」按鈕；晨報紀律執行清單點名破線或突破個股，卻僅為純文字無法點擊。
   - **視角切換 (`GLOBAL / TW / US`) 90% 無反應**：切換至 `TW` 或 `US` 時，跨市四聯卡（未顯示美股 `S&P 500` 與 `Nasdaq`）、在倉持股戰術雷達與雙動能資產池均未聯動聚焦；且台股除息蒸發點數僅在用戶自身持有 `2330` 時才計算。
   - **手動校準欄位缺口與跨頁孤島**：`MacroQuickCalibrationModal` 缺少 `taiexIndex`、`soxBias20Ma`、`taiexBias20Ma`、`dxy`、`oilPrice`、`usIsmPmi`、`twPmi` 輸入框；且在戰情室校準後的本地快照未被 `ZavySlowWealthWorkspace` 讀取（Zavy 的「10 秒快速校準」按鈕更只是唯讀文字視窗，無法校準任何數據），而後端 `/api/market/breadth` 的台美 **20/60/200MA 多週期市場寬度** 與 **融資去槓桿比率** 亦未接入主戰情室。

---

## Solution

建構 **「宏觀戰情室 3.5 — 零幻覺統一數據總線、精實暗艙佈局與一鍵執行閉環 (Macro War Room 3.5: Unified Data Bus, Dark-Cockpit Pruning & Direct Action Loop)」**：

1. **統一宏觀數據總線與雙向 Schema 正規化器 (Unified Macro Data Bus & Normalizer)**：
   - 擴充 `sanitizeMacroRecord` 支援後端 `/api/market/macro` 與 SQLite `macro_sentiment_daily` 的全量欄位別名無損映射（將 `treasuryYield10y`/`treasury_yield_10y` 映射至 `us10y`、`soxClose` 映射至 `soxIndex`、`taiexClose` 映射至 `taiexIndex`、`sp500Close` 映射至 `sp500Index`、`nasdaqClose` 映射至 `nasdaqIndex`、`cnnFearGreedScore` 映射至 `fearAndGreedIndex`、`creditSpreadOas` 映射至 `creditSpreadOAS`），並動態重算 `vixLevel` 與 `fearAndGreedLevel`。
   - 汰除無真實資料源的寫死常數（`CDS 指數 65` 與 `M2 年增 2.8%`），替換為後端已真實抓取並入庫的 FRED **「CCC 級垃圾債利差 (`cccSpreadOas`) / 投等債利差 (`igSpreadOas`)」**、**「美國製造業新訂單減存貨差額 (`usOrdersMinusInvSpread`) / CPI 通膨年增 (`usCpiYoY`)」** 與 **「台股月營收擴散指數 (`twRevenue`)」**。
   - 連通 `/api/market/breadth` 將 **台美 20/60/200MA 多週期市場寬度** 與 **大盤融資去槓桿比率 (`marginDeleveragingRatio`)** 接入戰情室與 Zavy 雙工作區，並讓 `ZavySlowWealthWorkspace` 共享 `macroPulseStorage` 本地校準快照與開啟真實校準彈窗的能力。

2. **個人風控數學精度修復與單一權益上限基準 (Math Precision & Single Equity Cap SSOT)**：
   - 修正 `maxDropToleranceTo130Percent` 比例尺（移除多餘的 `/ 100`），確保維持率 200% 時正確顯示 `-35.0%` 耐受跌幅。
   - 補齊 `soxStressImpact3PctTWD`（依穿透半導體總權重 × 總淨值 × 3% 計算）與加權 `portfolioBeta`。
   - 修正 `1-Day 95% VaR` 計算基底為「實質風險資產市值 ($\max(0, \text{totalNavTWD} - \text{cashBalanceTWD})$)」，消除高現金帳戶被虛增在險價值的失真。
   - 廢除晨報與簡報中舊版單軌 `suggestedEquityAllocationPercent` 的混用，全戰情室統一採用雙軌溫度計之 `strategicRegime.recommendedEquityCapPercent` 作為唯一建議總股票上限基準。

3. **大刀闊斧修枝與子元件模組化拆解 (Radical Pruning & Component Decomposition)**：
   - **物理砍除 L6 與 L8 重複防護盾卡片**：將 `-10% / -20% / -30%` 急速壓力測試橫幅、`質押黑天鵝壓力測試 Modal` 觸發鈕、以及 `lookThroughReport` **ETF 穿透前五大成分股展開抽屜** 完整整併入 L3 `PortfolioShieldAndAmmoCard`，徹底修復隱私模式 (`privacyMode=true`) 下的明文金額外洩漏洞。
   - **砍除重複按鈕與收斂晨報文字牆**：移除 L0 與 L5 重複的視角切換器與複製按鈕；將 AI 晨報抽離為 `WarRoomMorningBriefCard`，預設展示緊湊型「作戰定調 + 核心方針 + 可點擊紀律執行膠囊」，長篇診斷文字改為可收合詳情。
   - **抽離下層三大專業模組並支援分頁/展開檢視**：將 `MarketPulseAndCanariesCard`（市場四柱與金絲雀）、`DualMomentumRotationCard`（雙動能輪動）與 `CatalystCalendarCard`（催化劑日曆）自 `WarRoomWorkspace.tsx` 拆出為高內聚子元件，將主容器行數由 2,266 行壓降至 $\le 600$ 行。

4. **全視角聯動與一鍵行動閉環 (Full Perspective Sync & Direct Action Loop)**：
   - **視角切換 (`GLOBAL / TW / US`) 全頁貫通**：切換至 `US` 視角時，頂部四聯卡動態呈現 `S&P 500`、`Nasdaq`、`^SOX`、`TSM ADR` 及美股 20/60/200MA 寬度；在倉持股戰術雷達 (`HoldingTacticalSignalsCard`) 與雙動能資產池自動聯動過濾對應市場。
   - **消滅死胡同 UI**：① 在 `MacroStrategyPinBar` 與 `PortfolioShieldAndAmmoCard` 直接顯示「實際股票倉位 % vs 建議上限 / AI 釘選上限」之超配減碼金額警示；② 在雙動能排行榜每一列顯示在庫持倉權重徽章，並提供一鍵 `📈 技術面` 與 `⚡ 下單換倉` 按鈕；③ 在 AI 晨報紀律執行清單中，為點名之個股掛載一鍵跳轉技術面或下單按鈕；④ 擴充 `MacroQuickCalibrationModal` 支援校準 `taiexIndex`、`soxBias20Ma`、`taiexBias20Ma`、`dxy`、`oilPrice`、`cccSpreadOas`、`usIsmPmi`、`twPmi`。

---

## User Stories

1. As a macro-aware investor clicking "即時同步", I want all live metrics returned by `/api/market/macro` (`treasuryYield10y`, `treasuryYield2y`, `cnnFearGreedScore`, `creditSpreadOas`, `cccSpreadOas`, `soxClose`, `taiexClose`, `sp500Close`, `nasdaqClose`, `twRevenue`) to be accurately mapped into the War Room state without falling back to hardcoded constants (`3.85%`, `50`, `3.5%`) or overwriting index prices with `undefined`, so that my dashboard reflects 100% real market conditions.
2. As a risk-focused investor following the Zero-Mock policy, I want hardcoded placeholder metrics (`CDS 65` and `M2 2.8%`) to be replaced with real FRED credit crack indicators (`CCC 級垃圾債利差 BAMLH0A3HYC`, `IG 投等債利差`) and real manufacturing/inflation cycle indicators (`美國製造業新訂單減存貨差額`, `CPI 年增率`, `台股月營收擴散指數`), so that every number in Market Pulse is backed by an authoritative data feed.
3. As a Taiwan and US market participant, I want the War Room to integrate `/api/market/breadth` and display multi-horizon market breadth (`20MA / 60MA / 200MA` stock percentages) and the Taiwan Margin Deleveraging Ratio (`融資減幅 ÷ 大盤跌幅`), so that I can verify whether a market correction has sufficiently washed out retail leverage before buying the dip.
4. As a securities-backed loan (股票質押) borrower, I want the "距 130% 追繳安全耐受跌幅" in `PortfolioShieldAndAmmoCard` to display the true percentage drop tolerance (e.g., `-35.0%` at 200% maintenance ratio instead of the buggy `-0.4%`), so that I can accurately judge my liquidation buffer.
5. As an ETF investor holding broad market or tech ETFs (`0050`, `006208`, `QQQ`, `SMH`), I want to see the non-zero TWD impact of a $\pm 3\%$ Philadelphia Semiconductor (`^SOX`) move (`soxStressImpact3PctTWD`) and click to expand the top look-through underlying holdings (`lookThroughReport`), so that I know exactly which ETFs and stocks contribute to my semiconductor concentration.
6. As a defensive investor holding significant cash, I want my `1-Day 95% VaR` to be calculated on my at-risk invested assets (`totalNavTWD - cashBalanceTWD`) rather than my cash balance, so that holding more cash properly reduces my reported Value at Risk.
7. As a disciplined portfolio allocator, I want the War Room UI, the AI Morning Brief rebalance calculator, and the copied Markdown report to all use a single unified recommended equity cap (`dualThermometer.strategicRegime.recommendedEquityCapPercent`), eliminating the contradiction between legacy single-track and dual-track thermometers.
8. As a user scanning the War Room before market open, I want the redundant legacy "Macro Shield (L8)" and duplicate "VaR 3-Column Card (L6)" removed and consolidated into `PortfolioShieldAndAmmoCard` (including the `-10% / -20% / -30%` stress test switcher and the button to open the full Margin Stress Modal), so that I don't have to scroll past three identical shield sections.
9. As a privacy-conscious user enabling `privacyMode`, I want 100% of TWD/USD dollar amounts across all War Room cards and stress test banners to be masked (`NT$******`), eliminating the current privacy leak in the legacy VaR and Shield sections.
10. As an AI-assisted strategist who pins external LLM JSON strategies in `MacroStrategyPinBar`, I want the pin bar and shield card to compare my actual current equity allocation % against the AI's `recommendedEquityCapPercent` and highlight any overweight TWD amount, so that pinned strategies actively guard my portfolio sizing.
11. As a swing trader switching between `🌐 全球總經`, `🇹🇼 台股視角`, and `🇺🇸 美股視角`, I want the top cross-market strip (showing `S&P 500` and `Nasdaq` in US view), `HoldingTacticalSignalsCard`, and `DualMomentumRotationCard` to dynamically filter or focus on the selected market, so that the perspective switcher controls the entire workspace coherently.
12. As a systematic rotator viewing the Dual Momentum Leaderboard, I want each asset row to badge whether I currently hold it (with my portfolio weight %) and provide 1-click buttons to inspect its technical chart (`onInspectTechnical`) or open the trade modal (`onOpenTradeModal`), so that I can act on monthly rotation signals immediately.
13. As a busy trader reading the AI Morning Brief's "今日客觀紀律執行清單", I want action items that reference specific holdings (such as stop-loss breaches or box breakouts) to include 1-click buttons to inspect technicals or record a trade, and bulky diagnostic paragraphs to be collapsible, so that the morning brief functions as an interactive execution checklist.
14. As a user calibrating macro data offline or across tabs, I want `MacroQuickCalibrationModal` to include inputs for `taiexIndex`, `soxBias20Ma`, `taiexBias20Ma`, `dxy`, `oilPrice`, `cccSpreadOas`, `usIsmPmi`, and `twPmi`, and I want `ZavySlowWealthWorkspace` to read from the same calibrated snapshot and allow opening the calibration modal directly, eliminating the cross-tab data island.

---

## Implementation Decisions

### 1. 統一宏觀數據正規化與雙工作區共享快取 (Unified Macro Snapshot & Cross-Workspace Storage)
- 在 `macro.ts` 與 `macroPulseStorage.ts` 擴充 `MacroIndicatorSnapshot` 結構，納入後端已提供但前端曾遺漏之真實總經與跨市欄位：
  ```typescript
  export interface MacroIndicatorSnapshot {
    // 既有核心欄位維持向下相容
    date: string;
    us10y: number;
    us2y: number;
    us3m?: number;
    yieldSpread: number;
    isYieldInverted: boolean;
    vix: number;
    vixLevel: VixLevel;
    fearAndGreedIndex: number;
    fearAndGreedLevel: FearAndGreedLevel;
    goldPrice: number;
    oilPrice: number;
    dxy: number;
    usdToTwd: number;
    usM2GrowthYoY?: number;
    twM2GrowthYoY?: number;
    usFedRate?: number;
    usCpiYoY?: number;
    creditSpreadOAS?: number;
    // 新增連通真實 FRED / SQLite 之信貸與製造業週期欄位
    igSpreadOAS?: number;
    cccSpreadOAS?: number;
    breakeven10y?: number;
    initialClaims?: number;
    usMfgNewOrdersYoY?: number;
    usMfgInventoriesYoY?: number;
    usOrdersMinusInvSpread?: number;
    usIndustrialProdYoY?: number;
    usIsmPmi?: number;
    twPmi?: number;
    twRevenueDiffusionIndex?: number;
    twExportOrdersYoY?: number;
    // 多週期市場寬度與融資去槓桿快照
    multiHorizonBreadth?: {
      tw?: { breadth20: number; breadth60: number; breadth200: number; totalStocks?: number };
      us?: { breadth20: number; breadth60: number; breadth200: number; totalStocks?: number };
      twMarginDeleveraging?: {
        taiexMaxDrawdown: number;
        marginReductionPercent: number;
        marginDeleveragingRatio: number;
        isCleaned: boolean;
      };
    };
    // 其餘既有跨市指數 (soxIndex, taiexIndex, sp500Index, nasdaqIndex, tsmAdr*, twMarketBreadth, twInstitutionalSpot 等)
  }
  ```
- **雙向別名清洗 (`sanitizeMacroRecord`)**：
  - `us10y`: 優先序 `raw.us10y ?? raw.treasuryYield10y ?? raw.treasury_yield_10y`
  - `us2y`: 優先序 `raw.us2y ?? raw.treasuryYield2y ?? raw.treasury_yield_2y`
  - `us3m`: 優先序 `raw.us3m ?? raw.riskFreeRate3m ?? raw.risk_free_rate_3m`
  - `yieldSpread`: 優先序 `raw.yieldSpread ?? raw.yieldSpread10y2y ?? raw.yield_spread_10y_2y ?? round(us10y - us2y)`
  - `vix`: 優先序 `raw.vix ?? raw.vixClose ?? raw.vix_close`，並自動以 `evaluateVixLevel(vix)` 計算 `vixLevel`。
  - `fearAndGreedIndex`: 優先序 `raw.fearAndGreedIndex ?? raw.cnnFearGreedScore ?? raw.cnn_fear_greed_score`，並自動以 `evaluateFearAndGreedLevel(fg)` 計算 `fearAndGreedLevel`。
  - `creditSpreadOAS`: 優先序 `raw.creditSpreadOAS ?? raw.creditSpreadOas ?? raw.credit_spread_oas ?? raw.highYieldSpreadOas`
  - `cccSpreadOAS`: 優先序 `raw.cccSpreadOAS ?? raw.cccSpreadOas ?? raw.ccc_spread_oas ?? raw.cccHighYieldSpread`
  - `igSpreadOAS`: 優先序 `raw.igSpreadOAS ?? raw.igSpreadOas ?? raw.ig_spread_oas`
  - `soxIndex`: 優先序 `raw.soxIndex ?? raw.soxClose ?? raw.soxQuote?.price`
  - `taiexIndex`: 優先序 `raw.taiexIndex ?? raw.taiexClose ?? raw.taiexQuote?.price`
  - `sp500Index`: 優先序 `raw.sp500Index ?? raw.sp500Close ?? raw.sp500Quote?.price`
  - `nasdaqIndex`: 優先序 `raw.nasdaqIndex ?? raw.nasdaqClose ?? raw.nasdaqQuote?.price`
  - `twFuturesNetOi`: 優先序 `raw.twFuturesNetOi ?? raw.twForeignFuturesOi ?? raw.tw_foreign_futures_oi`
  - `twMarginMaintenance`: 優先序 `raw.twMarginMaintenance ?? raw.twMarginMaintenanceRatio ?? raw.tw_margin_maintenance_ratio`
  - 當遠端欄位為 `null` 或 `undefined` 時，合併邏輯必須保留本地既有有效值（`prev`），嚴禁以 `undefined` 抹除既有指數報價；並將黃金價格防呆門檻由硬編碼 `>= 2800` 放寬為合理正數 `> 500`。

### 2. 風控計量與單一建議持股上限收斂 (`macroAdvisorEngine.ts` & `useWarRoomPortfolioMetrics.ts`)
- **修正 `maxDropToleranceTo130Percent`**：`calculateMarginStress` 回傳之 `maxDropTolerancePercent` 定義為 `0~1` 小數（如 `0.35` 代表 35%），在 `useWarRoomPortfolioMetrics` 中直接傳遞 `Number(marginStress.maxDropTolerancePercent.toFixed(4))`，不再重複除以 `100`。
- **補算 `soxStressImpact3PctTWD`**：於 `calculatePortfolioMacroShield` 或 `useWarRoomPortfolioMetrics` 中計算 `Math.round(navTWD * (effectiveSemiWeight / 100) * 0.03)`，使穿透半導體部位對費半 $\pm 3\%$ 波動的台幣損益敏感度真實呈現。
- **修正 `1-Day 95% VaR` 計算母體**：在 `calculateMacroVaRAndStress` 中，將單日風險暴露母體由整戶 `navTWD` 改為 `investedAtRiskTWD = Math.max(0, navTWD - cashTWD)`（若無傳入 `cashTWD` 則向下相容使用 `navTWD`），確保高現金部位真實降低帳戶 VaR。
- **單一建議持股上限 (Single Equity Cap SSOT)**：`generateAiMorningBrief` 內部調倉減碼試算與 `WarRoomWorkspace` 複製簡報統一採用 `evaluateMacroDualThermometer(macro).strategicRegime.recommendedEquityCapPercent`（若外部有傳入最高優先級 AI 釘選策略，亦可於 UI 並陳對照）。
- **台積電除息蒸發點數無條件預警**：當催化劑日曆或應收股利中存在 `2330` 除息事件時，即使使用者未直接持有 `2330` 個股，仍以預設或已知配息金額估算對加權指數之蒸發點數。

### 3. UI 修枝與高內聚子元件重構 (`src/components/warRoom/`)
- **強化 `PortfolioShieldAndAmmoCard` (整合 L3 + L6 + L8)**：
  - 接收 `lookThroughReport`（可點擊展開「ETF 穿透前 5 大成分股與產業拆解明細」抽屜）、`onOpenMarginStressModal`（右上角「質押黑天鵝壓力測試 ➔」按鈕）、`recommendedEquityCapPercent` 與 `pinnedEquityCapPercent`（顯示實際股票倉位 vs 建議上限之超配/低配狀態）。
  - 底部內嵌緊湊型 `-10% 震盪 / -20% 回檔 / -30% 崩盤` 急速壓力測試切換列，所有金額全面受 `privacyMode` (`maskMoney`) 保護。
  - 物理移除 `WarRoomWorkspace.tsx` 中原有的 L6 獨立 VaR 三欄卡與 L8 舊版個人防護盾卡片。
- **抽離 `WarRoomMorningBriefCard.tsx` (精簡 L5)**：
  - 移除與頂部重複的 3 顆複製按鈕（統一保留於頂部操作列或簡報標題列單一位置）。
  - 將「今日客觀紀律執行清單 (`actionPoints`)」升級為可互動項目：當條目包含在倉股代號時，顯示一鍵 `📈 技術面` 與 `⚡ 下單` 快捷鈕；將長篇「宏觀環境診斷 / 個人防護盾體質診斷」預設收合於「展開詳細診斷文字」切換鈕後。
- **抽離 `MarketPulseAndCanariesCard.tsx` (升級 L7)**：
  - 汰除寫死的 `CDS 指數` 與 `M2 年增`：
    - 柱四（全球流動性與通膨週期）：展示 `DXY 美元指數`、`USD/TWD`，下方呈現真實 FRED `美 CPI 年增 (usCpiYoY)` 與 `製造業新訂單減存貨 (usOrdersMinusInvSpread)`。
    - 美股金絲雀雙卡：卡 1 展示 `🇺🇸 美高收益債利差 (HY OAS)` 與 `投等債利差 (IG OAS)`；卡 2 展示 `🇺🇸 CCC 級垃圾債利差 (CCC OAS)` 與 `10Y 平衡通膨率 (Breakeven)`（早期信貸裂痕雷達）。
    - 台股金絲雀雙卡：卡 3 展示 `🇹🇼 外資/投信台指期淨未平倉`；卡 4 展示 `🇹🇼 全市場融資維持率` 與 `融資去槓桿清洗度 (marginDeleveragingRatio)`。
  - 新增連通 `/api/market/breadth` 之 **「台/美 20MA · 60MA · 200MA 多週期市場寬度橫條」**。
- **抽離 `DualMomentumRotationCard.tsx` (閉環 L9)**：
  - 依 `marketView` (`TW` / `US` / `GLOBAL`) 自動連動推薦對應動能資產池（使用者仍可手動切換）。
  - 排行榜每一列新增「在庫權重徽章（若用戶持有該標的）」與右側一鍵 `📈 技術面`、`⚡ 下單換倉` 按鈕。
  - 雙動能無風險利率：美股/全球池動態採用 `macroSnapshot.us3m`（若有效，否則預設 4%），台股池採用資產池定義之無風險利率基準（2%）。
- **抽離 `CatalystCalendarCard.tsx` (模組化 L10)**：
  - 封裝三段時序雷達、分類篩選與新增自訂事件 Modal；針對持股除息/法說事件提供點擊檢視技術面入口。
- **視角切換 (`GLOBAL / TW / US`) 全頁貫通**：
  - 移除 L0 Header 重複的三視角按鈕組，統一由 `MacroDualThermometerBar` 的三視角切換器（與 App Global Header 雙向同步）控制全頁：
    - 在 `MacroDualThermometerBar` 四聯卡中：當 `activeMarketTab === 'US'` 時，呈現 `^SOX 費半`、`S&P 500 (^GSPC)`、`Nasdaq (^IXIC)`、`TSM ADR 溢折價`；當 `GLOBAL` 或 `TW` 時呈現跨市傳導四聯卡（並在卡 4 補齊外資現貨買賣超金額顯示）。
    - 在 `HoldingTacticalSignalsCard` 中：當 `activeMarketTab === 'TW'` 或 `'US'` 時，自動過濾顯示該市場持股訊號（並提供切換回全市場之膠囊提示）。
- **擴充 `MacroQuickCalibrationModal` 與跨頁同步 `ZavySlowWealthWorkspace`**：
  - 於校準彈窗補齊 `taiexIndex`、`soxBias20Ma`、`taiexBias20Ma`、`dxy`、`oilPrice`、`cccSpreadOAS`、`usIsmPmi`、`twPmi` 欄位。
  - 在 `ZavySlowWealthWorkspace` 中，啟動時優先融合 `getLatestMacroPulseRecord()` 本地校準/快取快照與 `/api/market/macro`、`/api/market/breadth`（同時讀取 `data.tw` 與 `data.us` 雙市場寬度），並提供按鈕直接開啟 `MacroQuickCalibrationModal` 手動校準，徹底消滅跨頁 `--` 空值孤島。

---

## Testing Decisions

### 1. 測試理念與品質標準
- **高階縫隙外部行為測試 (High-Seam Behavioral Testing)**：僅針對公開純函式輸入輸出、Storage 正規化結果與頂層元件 DOM 渲染/互動回呼進行斷言，不耦合內部私有 state 名稱。
- **零回歸與向下相容保證**：既有 `WarRoomWorkspace.test.tsx`、`macroAdvisorEngine.test.ts`、`useWarRoomPortfolioMetrics.test.ts`、`macroPulseStorage.test.ts`、`warRoomPromptE2E.test.ts` 必須 100% 通過。

### 2. 受測模組與測試縫隙 (Testing Seams)
- **Seam 1：數據海關與正規化縫隙 (`src/utils/macroPulseStorage.test.ts`)**
  - 驗證 `sanitizeMacroRecord` 輸入後端 `/api/market/macro` 真實鍵名（`treasuryYield10y`, `treasuryYield2y`, `cnnFearGreedScore`, `creditSpreadOas`, `cccSpreadOas`, `soxClose`, `taiexClose`, `sp500Close`, `nasdaqClose`, `usOrdersMinusInvSpread`）時，100% 正確轉換為前端欄位且動態計算 `vixLevel` 與 `fearAndGreedLevel`。
  - 驗證部分欄位缺漏時不以 `undefined` 抹除既有快照，且黃金價格在 `2,600 USD/oz` 等合理區間不被強制覆寫為 `3350`。
- **Seam 2：計量與個人防護盾引擎縫隙 (`src/engine/macroAdvisorEngine.test.ts` & `src/hooks/useWarRoomPortfolioMetrics.test.ts`)**
  - 驗證維持率 200% 時 `maxDropToleranceTo130Percent` 為 `0.35`（UI 顯示 `-35.0%` 而非 `-0.4%`）。
  - 驗證 `soxStressImpact3PctTWD` 隨穿透半導體權重與總淨值精確計算非零金額。
  - 驗證 `1-Day 95% VaR` 扣除現金部位後，高現金部位帳戶之 VaR 顯著低於滿倉股票帳戶。
  - 驗證 `generateAiMorningBrief` 的減碼建議與 `evaluateMacroDualThermometer` 的 `recommendedEquityCapPercent` 完全一致。
- **Seam 3：戰情室全頁互動與隱私防漏縫隙 (`src/components/WarRoomWorkspace.test.tsx` & `src/components/zavy/ZavySlowWealthWorkspace.test.tsx`)**
  - 驗證舊版重複防護盾 (L8) 與獨立 VaR 重複三欄卡 (L6) 已移除，且 `privacyMode={true}` 時全頁無任何未遮罩之現金或 VaR 明文金額。
  - 驗證點擊 `PortfolioShieldAndAmmoCard` 可展開 ETF 穿透成分股明細，且顯示實際股票倉位 vs 建議上限對比。
  - 驗證切換 `GLOBAL / TW / US` 視角時，美股視角顯示 `S&P 500` / `Nasdaq`、持股戰術表與雙動能排行榜同步連動，且雙動能列與晨報執行項目支援點擊觸發 `onInspectTechnical` / `onOpenTradeModal`。
  - 驗證 `MacroQuickCalibrationModal` 新增欄位儲存後，`WarRoomWorkspace` 與 `ZavySlowWealthWorkspace` 均可讀取更新後之數值。

### 3. 現有程式庫之先驗模式 (Prior Art)
- `src/components/WarRoomWorkspace.test.tsx`
- `src/hooks/useWarRoomPortfolioMetrics.test.ts`
- `src/engine/macroAdvisorEngine.test.ts`
- `src/utils/macroPulseStorage.test.ts`

---

## Out of Scope

1. 新增付費商業 API 訂閱（如付費購買官方 ISM 商業授權 API；維持 FRED 免 Key 製造業新訂單減存貨硬數據代理 + 手動 10 秒校準雙軌制）。
2. 期權波動率曲面 (Volatility Surface) 或盤中逐筆 Tick 級 WebSocket 串流。
3. 廢除獨立的 `🐢 慢富週期與配置` 頁籤（維持「戰情室專注日/週級波段與風控執行、慢富頁籤專注季/年級週期配置與退休試算」之雙頁分工，僅打通底層數據總線与校準狀態）。

---

## Further Notes

- 本規格落實後，`WarRoomWorkspace.tsx` 將從 2,266 行單體巨石收斂為清晰的組合式架構，徹底根除「即時同步卻顯示假常數」、「耐受跌幅縮小 100 倍」、「同頁三張防護盾卡片重複渲染」與「看到動能/破線信號卻無法直接點擊操作」四大痛點。
