# Spec 0237: 主力戰情室 4.0 — 全鏈路真實數據去假、量綱算術除錯、8 大湖倉資產貫通與曜石精密反 AI Slop 視覺重構規格 (Main Force War Room 4.0: Full-Stack De-Mocking, Dimensional Math Precision, Lakehouse Data Wiring & Obsidian Precision De-Slop UI Spec)

## Problem Statement

當投資人使用「主力戰情室 (`AiForceDashboardView`)」進行個股與 ETF 的全方位主力籌碼、技術結構、基本面估值與 AI 作戰決策分析時，面臨以下 **4 大結構性失真、合成假數據污染、1000 倍量綱算術錯誤、湖倉真實資料斷鏈與廉價 AI 模板視覺（AI Slop）問題**：

1. **前後端殘留 7 處合成假數據產生器與靜態硬編碼，違背 Zero-Mock Policy (Synthetic Data Poisoning & Hardcoded Mocks)**：
   - **後端 SQLite 湖倉遭三角函數假數據污染**：集保大戶入庫模組與月營收入庫模組並非抓取官方開放資料，而是以股票代號 `seed` 搭配 `Math.sin` 與 `Math.cos` 憑空捏造 10 週集保大戶比例（已寫入 12.5 萬筆假紀錄）與 12 個月營收 YoY/MoM（已寫入 10.9 萬筆假紀錄），導致戰情室 Card 19（TDCC 集保千張大戶趨勢）與 Card 20（月營收成長走勢）顯示完全虛構的數據。
   - **前端查無資料時偷偷合成 100 根假 K 線**：當本地與遠端皆查無某標的歷史日 K 時，回補管線在最後一步呼叫 `generateSyntheticCandles` 憑空生成假 K 線並寫入 IndexedDB，直接繞過戰情室的 `isDataPending` 空狀態防線，對錯誤代號渲染出整頁假分析。
   - **ETF 規模與配息全市場寫死單一假模板**：Card 20 在 ETF 模式下，無論輸入任何台美股 ETF（如 `0050`、`0056`、`00679B`、`VOO`、`QQQ`），一律硬編碼 `資產規模 420 億元`、`殖利率 4.2%`、`受益人 750,000 人` 及四筆固定 `$1.00` 的假季度配息（`2026 Q3 ~ 2025 Q4`）。
   - **技術警示與多週期指標造假**：任務二（技術警示）的「預估維持率」固定寫死 `168.5% (安全)`；任務三（KD+MA）的「週 KD」與「月 KD」未由週 K / 月 K 聚合計算，而是將日 KD 乘以固定常數（`0.55`、`0.35`）加上均線常數湊數，且當歷史低檔金叉次數為 `0` 時，硬編碼回傳 `勝率 80.0%、共 5 次、均漲 6.8%`。
   - **預設模板與卡片局部硬編碼洩漏**：Card 07（VWAP 成本結構）診斷函式寫死現價為 `1240`；Card 18（主力總評判）寫死固定停損停利乘數與勝率，且呼叫流動性守門員函式時未傳入均量參數；預設報表生成函式內含 `09/18 外資 -166、投信 89` 等靜態範例數字，當新掛牌標的僅有 1~4 根日 K 時，會因 `isDataPending` 解除而將假法人張數直接渲染上屏。

2. **台股「股 vs 張」1000 倍量綱混淆與正負向指標算術顛倒 (1000x Dimensional Mismatch & Inverted Polarity Math Bugs)**：
   - **日 K 成交量單位（股 vs 張）差 1000 倍**：本地 SQLite 與遠端報價之台股日 K `volume` 單位為「股 (Shares)」，但健康度評估、五維風險蛛網、AI 信心維度與六維雷達四個核心引擎直接將未除以 `1000` 的股數與「張數」門檻（`3000`、`5000`）比較，導致日均量僅 3~5 張（3,000~5,000 股）的冷門殭屍股全部拿到最高流動性滿分（風險僅 `5%`）。
   - **市場情緒之法人淨買超比被縮小 1000 倍**：計算市場情緒 `institutionalNetRatio` 時，分子為近 5 日三大法人買賣超「張數」，分母卻是近 5 日 K 線 `volume`「股數」，導致比值被縮小 1,000 倍趨近於 `0`，使得法人情緒指標永遠卡死在 `50%`。
   - **Card 11 健康度總評將負向風險指標當作正向分數相加**：5 項指標中前 4 項為正向健康度（越高越好），唯獨 `liquidityRisk` 為風險值（越低越好，如 `5%` 代表極安全），但總分計算直接將 5 個數值相加除以 5，導致流動性越安全的股票總健康分反而被拉低 15~20 分。
   - **Card 07 成本帶正負乖離標籤顛倒**：將正乖離 `> +5%` 的獲利突破成交量對應至 `衰竭區 (<-5%)` 標籤。
   - **外聯 AI 提示詞時序錯置與快速切換競態覆蓋**：提示詞轉接器讀取升序排列的 `tdcc.history[0]`（誤取 10 週前最舊紀錄而非最新紀錄）並將總持股比誤當作 4 週變動率；Card 08 近 5 日法人明細表被切為 `slice(-3)` 永遠只顯示 3 筆；盤中未結算時頂部行情 Bar 將「前日收盤價」與「當日盤中開高低量」混搭；且 `loadDataForSymbol` 缺乏非同步請求序號防護，快速切換標的時慢速舊請求會覆蓋新標的畫面。

3. **本地 SQLite 湖倉與既有引擎中 8 大真實資料資產斷鏈未接線 (Unwired Lakehouse Assets & Disconnected Props)**：
   - **借券賣出餘額 (`sbl_balance`) 斷鏈**：SQLite `tw_institutional_chips` 已存有 5.7 萬筆真實借券賣出餘額，但前端載入器映射時漏接該欄位。
   - **董監事持股質押比 (`pledge_ratio`) 與內部人轉讓斷鏈**：`loadSymbolFullLakehouseData` 已取回 `pledge` 物件，但戰情室主組件完全丟棄未傳入估值矩陣與 AI 提示詞。
   - **融資餘額日增減 (`marginBalanceChange`) 斷鏈**：未計算最新日與前日之融資餘額增減並傳入市場情緒與動態信號引擎，導致 Card 12「融資浮額沉重 / 斷頭防守警戒」淪為永遠無法觸發的死代碼。
   - **台指期未平倉、Put/Call Ratio 與大盤維持率 (`twMacroData`) 斷鏈**：後端已回傳台股宏觀期權指標，但 Card 10·13 在台股模式下未顯示，且 AI 提示詞轉接器將 `twPutCallRatio` 寫死為 `undefined`。
   - **ETF 官方每日淨值與真實折溢價 (`etf_daily_nav`) 及除權息日曆 (`corporate_action_calendar`) 斷鏈**：`/api/market/history/:symbol` 未一併返回 `etf_daily_nav` 最新折溢價，導致 Card 21 在 ETF 模式下折溢價率永遠顯示 `--`。
   - **MLP-AI 主力語意合成引擎 (`synthesizeMainForceVerdict`) 與法人連買連賣天數 (`foreignConsecutiveDays`) 未接入**：專為 Card 18 開發的多因子語意引擎從未被匯入呼叫，僅以單一 VWAP 乖離率決定結論動詞。
   - **美股微觀量價 4 大指標 (`usMicroMetrics`: RVOL, VWAP Bias, MFI, ATR) 未計算**：Card 15 UI 已寫好美股微觀指標面板，但引擎層從未計算並填入 `usMicroMetrics` 與 `sparklineHistory`，導致美股一律退化為純文字 fallback。
   - **個人持倉 (`HoldingPosition`)、API 金鑰、`colorTheme` 與「7步深度投研」彈窗斷路**：`holdings` 傳入戰情室後被命名為 `_holdings`，主畫面完全未顯示用戶持倉成本對照；Card 02 算出的 `xaiExplanation` 白話因果從未渲染，且 `shortTermState` 與 `chipStructure` 永遠寫死為 `'區間震盪'` 與 `'中性'`；開啟 `<EquityDeepDiveModal>` 時漏傳 `candles`、`institutionalRecords`、`boxFloorPrice`、`boxCeilingPrice` 與估值倍數，導致深度投研彈窗內 PE/PB 與法人買賣超全數變為 `N/A` 與 `0 張`。

4. **視覺呈現充滿「廉價 AI 模板味 (AI Slop)」且決策動線倒置 (Visual AI Slop & Inverted Information Hierarchy)**：
   - **彩虹霓虹邊框與流水號方塊噪音**：21 張卡片各自使用紫、綠、藍、紅、橘等不同顏色的發光邊框與彩色編號方塊（`01`~`21`），掩蓋了真正代表多空與風險警示的數據語意色。
   - **Emoji 氾濫與 15 個無作用假按鈕**：任務切換器、雷達軸標籤、匯出列與警示面板大量使用系統 Emoji（`📊 ⚠️ 📈 📉 📑 🏛️ 💧 ⚡ 🚀 🔍`）充當圖示；且 15 張卡片右上角的 `<MoreVertical />` 三點按鈕完全沒有綁定任何點擊事件。
   - **核心結論沉底與平鋪無章節**：最重要的 Card 18（主力追蹤總評判與操作點位）被放在整頁最底部的第 8 層（需滾動超過 2,000px），而 21 張卡片平鋪直敘缺乏章節骨骼，底部 Sticky 切換器更常遮擋圖表視線。

---

## Solution

建構 **「主力戰情室 4.0 — 全鏈路真實數據認證、量綱同態校準、個人持倉感知 HUD 與曜石精密（Obsidian Precision）三幕式戰術指揮艙」**：

1. **全鏈路徹底去假與官方開放資料直連 (Full-Stack De-Mocking & Official OpenData Ingestion)**：
   - **拔除後端三角函數造假器**：重構 TDCC 集保入庫模組與 MOPS 月營收入庫模組，徹底移除 `Math.sin / Math.cos` 合成公式，改為抓取 **TDCC 集保結算所開放資料 CSV (`1-5` 股權分散表) / FinMind API** 與 **TWSE / TPEx 官方月營收 OpenAPI (`t187ap05_L`)**，並提供資料庫清洗程序清除既有合成假紀錄（加上真實來源驗證標記）。
   - **拔除前端合成假 K 線與靜態假數字**：移除歷史回補管線中的 `generateSyntheticCandles` fallback，無真實日 K 時誠實回傳 `[]` 並進入 `isDataPending` 空狀態面板；清空 `createDefaultAiForceReport` 中的假法人明細與假波段數據；將 Card 20 ETF 視圖改接真實除權息紀錄（`corporate_action_calendar`）、官方殖利率（`tw_valuation_daily`）與官方淨值折溢價（`etf_daily_nav`）。
   - **真實多週期 KD 聚合與動態壓力測試**：任務三透過 `aggregateCandlesToTimeframe` 聚合真實週 K 與月 K 重算週/月 KD（且切換主圖週 K/月 K 時同步重算副圖指標），無低檔金叉樣本時誠實顯示 `0 次 (尚無樣本)`；任務二維持率壓力測試改依用戶實際持倉融資/質押維持率或大盤真實維持率（`tw_margin_maintenance_ratio`）動態計算；Card 07 診斷傳入真實 `currentPrice`；Card 18 依真實箱頂/箱底/VWAP 與波動率預測錐動態推算停損停利價位與風報比，並傳入真實 5 日均量至流動性守門員。

2. **量綱同態校準與極性算術修復 (Dimensional Homomorphism & Polarity Math Fixes)**：
   - **統一台股「張數 (Lots)」量綱基準**：在健康度、風險蛛網、AI 信心度、六維雷達與市場情緒 `institutionalNetRatio` 計算中，針對台股日 K `volume`（若為股數則除以 `1000` 換算為張數）進行正規化後再與張數門檻及法人買賣超張數運算。
   - **健康度極性反轉與成本帶校準**：Card 11 計算 5 維綜合健康平均分時，將負向風險指標 `liquidityRisk` 轉換為正向安全度 `(100 - liquidityRisk)`；Card 07 校準正負乖離區間標籤（`> +5%` 獲利突破區、`+2%~+5%` 強勢攻擊區、`±2%` 主力成本核心區、`<-2%` 套牢防守區）。
   - **競態防護與時序對齊**：在 `AiForceDashboardView` 引入 `activeRequestIdRef` 阻斷過期非同步請求覆蓋；修復盤中未結算時頂部行情 Bar 開高低量與收盤價錨點一致性；修復 Card 08 顯示完整近 5 日法人明細（`slice(-5)`）；修復 AI 提示詞轉接器讀取 TDCC 最新一筆 `history[history.length - 1]` 與 `change4WeeksRatio`。

3. **8 大湖倉真實資產與個人持倉全量貫通 (Full Lakehouse Wiring & Portfolio-Aware HUD)**：
   - 擴充 `/api/market/history/:symbol` 與 `loadSymbolFullLakehouseData`，完整提取並傳遞：**借券賣出餘額 (`sblBalance`)**、**董監事質押比與內部人轉讓 (`directorPledgeRatio` / `insiderTransferShares`)**、**融資餘額日增減 (`marginBalanceChange`)**、**台指期外資/投信未平倉與 P/C Ratio (`twMacroData`)**、**ETF 最新官方淨值與折溢價率 (`etfNav` / `etfPremiumDiscountRate`)** 及 **歷年除權息紀錄 (`corporateActions`)**。
   - 在 `aiForceDashboardEngine` 正式接線 `synthesizeMainForceVerdict`（MLP 主力語意引擎）、計算外資/投信連買連賣天數（`foreignConsecutiveDays` / `trustConsecutiveDays`）、計算美股微觀量價 4 大指標（`usMicroMetrics`: RVOL, VWAP Bias, MFI, ATR 與 10 日 OBV Sparkline）、向 `calculateRiskSpider` 傳入真實法人量與換手率、並動態推導 Card 02 之 `shortTermState`、`chipStructure` 與 `riskHorizonDays`。
   - 從 `App.tsx` 完整傳入 `holdings`、`loanRecords`、`apiKeys` 與 `colorTheme` 至 `AiForceDashboardView`，並在開啟 `<EquityDeepDiveModal>` 時傳入完整 `candles`、`institutionalRecords`、`boxFloorPrice`、`boxCeilingPrice` 與估值倍數。

4. **「曜石精密 (Obsidian Precision)」反 AI Slop 視覺與三幕式資訊建築重構 (Pentagram × Linear De-Slop UI Architecture)**：
   - **頂部一體化戰術指揮艙 (Unified Command Deck & Portfolio HUD)**：整合標的搜尋、常駐快速切換膠囊（優先顯示用戶在庫持倉 + 核心指標股）、即時報價矩陣、**個人持倉成本對照膠囊（顯示在庫股數、持倉均價 `avgCost`、距主力成本 VWAP 安全邊際 %、未實現損益 %）**、7 步深度投研入口與匯出選單；並將 5 大任務視圖切換器上移為頂部精密分段控制器（Segmented Control），消除底部遮擋。
   - **首屏主力戰術總綱橫幅 (Above-the-Fold Executive Verdict Banner)**：將 Card 18（5 態主力作戰光譜、動態停損停利點位）與 Card 02 的 `xaiExplanation`（白話文因果判讀）提煉至主 K 線圖緊鄰之黃金視線區，實現「0 滾動直達結論」。
   - **徹底去 AI 味 (De-Slop) 四大紀律**：① 移除 15 張卡片右上角無作用的 `<MoreVertical />` 裝飾按鈕；② 100% 根除所有系統 Emoji，全面替換為 `lucide-react` 1.5px 單一筆畫向量圖示；③ 消滅五顏六色的彩虹發光外框與刺眼彩色編號塊，統一收斂為曜石深邃底色（`#0B101B`）、`1px solid rgba(255,255,255,0.07)` 極細石墨髮絲邊框、頂部 `inset 0 1px 0 rgba(255,255,255,0.06)` 鏡面微高光與低調等寬微標籤（`M01`~`M21`），將色彩 100% 留給多空與風險語意；④ 全面強制數值欄位套用 `tabular-nums` 等寬對齊。
   - **4 大戰術章節網格 (4 Editorial Tactical Zones)**：以瑞士網格章節標題線將 21 組模型組織為 **Zone I（價格結構與主力成本錨定）**、**Zone II（AI 決策中樞與多維風險雷達）**、**Zone III（機構籌碼、集保與基本面估值）**、**Zone IV（微觀博弈、資券借券與隔日沖防線）**。

---

## User Stories

1. As a quantitative investor adhering to the Zero-Mock policy, I want the backend TDCC (`tw_tdcc_distribution`) and Monthly Revenue (`tw_monthly_revenue`) ingestion scripts to purged all `Math.sin`/`Math.cos` synthetic records and fetch real data from official TDCC OpenData / TWSE & TPEx OpenAPIs (or FinMind), so that Cards 19 and 20 never display fabricated shareholder or revenue curves.
2. As a user searching for an unlisted, delisted, or offline ticker in the Main Force War Room, I want the historical backfill pipeline to return an empty candle array `[]` instead of calling `generateSyntheticCandles`, so that the War Room honestly displays the `isDataPending` empty-state panel rather than rendering 100 fake candlesticks and polluting IndexedDB.
3. As an ETF investor analyzing `0050`, `0056`, `00878`, `VOO`, or `QQQ`, I want Card 20 (ETF Adaptive View) and Card 21 (Valuation Matrix) to display real historical dividends from `corporate_action_calendar`, real dividend yields from `tw_valuation_daily`, and real NAV premium/discount rates from `etf_daily_nav` (falling back to `--` when unavailable) instead of hardcoded `420 億元 / 4.2% / $1.00` mock numbers.
4. As a Taiwan stock trader evaluating liquidity risk and AI confidence across cards 03, 05, 11, 13, and 14, I want daily candlestick volume (recorded in shares) to be normalized into lots (`volume / 1000`) before comparing against lot thresholds or institutional net buy lots, so that illiquid zombie stocks trading 3 lots a day are no longer misclassified as "5% ultra-low liquidity risk" and institutional sentiment is no longer crushed by a 1000x denominator error.
5. As an investor reading Card 11 (Health Summary), I want the composite health score to invert the negative `liquidityRisk` metric into positive liquidity safety (`100 - liquidityRisk`) when averaging the 5 rings, so that highly liquid stocks with low risk receive a higher overall health rating rather than being penalized.
6. As a trader inspecting Card 07 (VWAP Cost Structure), I want the cost band labels to accurately match their mathematical bias intervals (`>+5%` Profitable Breakout, `+2~+5%` Heavy Accumulation, `±2%` Main Force Core Cost, `<-2%` Trapped Defense) and the diagnostic tooltip to evaluate the actual `currentPrice` instead of a hardcoded `1240`.
7. As a short-term trader checking Card 09 (Day Trade Risk) and Card 15 (Chips Summary), I want to see the real Securities Borrowing and Lending short balance (`sblBalance` / 借券賣出餘額) and daily margin balance change (`marginBalanceChange` / 融資增減張數) wired from SQLite `tw_institutional_chips`, so that I can detect foreign shorting pressure and retail margin deleveraging.
8. As a fundamental and governance-conscious investor viewing Card 21 and the War Room AI Prompt, I want the director & insider pledge ratio (`directorPledgeRatio` / 董監設質比) from `tw_insider_pledge_records` to be wired into the Valuation Matrix and Strategic Prompt Digest, so that high insider pledge risks are visibly flagged.
9. As a Taiwan market trader viewing Card 10·13 (`EnergySentimentTwinCard`) and exporting the War Room AI Prompt, I want to see real Taiwan Futures Foreign/Trust Net Open Interest (`twForeignFuturesOi`) and Put/Call Ratio (`twPutCallRatio`) from `macro_sentiment_daily`, so that individual stock energy is contextualized against real derivatives positioning.
10. As a US equity investor analyzing `NVDA`, `AAPL`, or `TSLA` in the Main Force War Room, I want Card 15 (`ChipsSummaryCard`) to compute and render the 4 US microstructure metrics (`RVOL`, `VWAP Bias %`, `MFI Score`, `ATR`) along with a 10-day OBV/volume sparkline, activating the dedicated US microstructure UI instead of a plain-text fallback.
11. As a swing trader relying on Card 18 (`MainForceVerdictCard`) and Card 02 (`AiDecisionCoreCard`), I want the verdict engine to invoke `synthesizeMainForceVerdict` (combining 5-day institutional net flow, VWAP bias, and RSI), compute dynamic stop-loss/take-profit levels from real 60D support/resistance and forecast cone volatility, pass real 5-day average volume to the liquidity gate, and dynamically derive `shortTermState`, `chipStructure`, and `xaiExplanation` on the main screen.
12. As a portfolio holder analyzing a stock I already own, I want the War Room header and K-line/VWAP cards to display a **Portfolio Position HUD** (showing my held shares, weighted average cost `avgCost`, breakeven price, safety margin % against Main Force VWAP, and unrealized PnL %), so that I can immediately compare my cost basis against the main force's cost basis.
13. As a research-driven investor clicking "7步深度投研" (`EquityDeepDiveModal`) from inside the Main Force War Room, I want the modal to receive the full resolved dataset (`candles`, `institutionalRecords`, `boxFloorPrice`, `boxCeilingPrice`, `pe`, `pb`, `dividendYield`, `sblBalance`, and `apiKeys`), so that Step 2 valuation metrics and Step 6 institutional 20D flows populate with 100% real data instead of `N/A` and `0 張`.
14. As a technical analyst switching to Task 2 (Technical Alerts) and Task 3 (KD + MA), I want Task 2's margin maintenance stress test to reflect my actual holding/loan maintenance ratio or the real market maintenance ratio (with a `-10%` limit-down stress simulation) instead of a hardcoded `168.5%`, and I want Task 3's Weekly KD and Monthly KD to be calculated from true aggregated weekly and monthly candlesticks via `aggregateCandlesToTimeframe` (with honest `0 samples` when no historical oversold golden cross exists).
15. As a power user rapidly clicking through multiple stock quick-chips (`0050` -> `2330` -> `NVDA`), I want asynchronous data fetches in `AiForceDashboardView` to be guarded by a request sequence token, so that a slow network response from an earlier symbol never overwrites the currently selected symbol's report.
16. As a user with a preferred price color convention (`taiwan` red-up/green-down vs `international` green-up/red-down), I want `AiForceDashboardView` and all its child cards to respect the global `colorTheme` prop passed from `App.tsx` rather than hardcoding theme overrides by market.
17. As a discerning user who dislikes generic "AI-generated dashboard slop", I want the Main Force War Room redesigned with the **Obsidian Precision (Pentagram × Linear)** visual system—removing all 15 non-functional `<MoreVertical />` buttons, replacing 100% of system emojis with crisp `lucide-react` vector icons, unifying rainbow card borders into `1px` obsidian hairlines with subtle top specular highlights, elevating the Main Force Verdict & Task Switcher to the top command zone, and organizing the 21 modules into 4 clear Editorial Tactical Zones.

---

## Implementation Decisions

### 1. 後端 SQLite 入庫無假化與 `/api/market/history/:symbol` 擴充契約 (Backend De-Mocking & Lakehouse API Contract)
- **廢除合成三角函數入庫邏輯**：
  - 修改 `ingest-tw-tdcc.cjs`：移除以 `Math.sin` / `Math.cos` 產生假大戶比例之迴圈，改為從台灣集保結算所開放資料端點（`https://smart.tdcc.com.tw/opendata/getOD.ashx?id=1-5`）或 FinMind `TaiwanStockHoldingSharesPer` 取得真實分級資料並經 `parseTdccRecords` 寫入 `tw_tdcc_distribution`。
  - 修改 `ingest-tw-monthly-revenue.cjs`：移除以 `seed * 12345` 與 `Math.sin` / `Math.cos` 產生假月營收之迴圈，改為從 TWSE OpenAPI（`https://openapi.twse.com.tw/v1/opendata/t187ap05_L`）、TPEx OpenAPI 或 FinMind `TaiwanStockMonthRevenue` 解析真實當月營收、去年同月營收、MoM 與 YoY 寫入 `tw_monthly_revenue`。
  - 於資料庫初始化或入庫前執行冪等清理：清除過去由合成公式寫入之無效偽紀錄（或當網路不可用時保持誠實空表，絕不寫入隨機/三角函數假資料）。
- **擴充 `GET /api/market/history/:symbol` 回應結構**：
  - 除既有 `candles`、`chips`（含 `sbl_balance`）、`tdcc`、`revenue`、`valuation`、`pledge`、`macro` 外，新增查詢並回傳：
    - `etfNav`: 取自 `etf_daily_nav` 該標的最新一筆 `{ date, close_price, nav, premium_discount_ratio }` 及近 30 日歷史。
    - `corporateActions`: 取自 `corporate_action_calendar` 該標的近 8 季/歷年除權息與融券強制回補紀錄。

### 2. 前端數據載入與回補零假化契約 (Frontend Loader & Backfill Zero-Mock Contract)
- **移除 `generateSyntheticCandles` Fallback**：
  - 在 `historicalOhlcvBackfill.ts` 中，當 SQLite 湖倉、Yahoo Finance 與備援來源皆無法取得日 K 時，直接回傳空陣列 `candles: [], indicators: []`，不再呼叫 `generateSyntheticCandles` 亦不將合成資料寫入 IndexedDB。
- **擴充 `LakehouseFullPayload` 與 `GenerateReportOptions` 型別契約**：
  ```ts
  export interface LakehouseFullPayload {
    candles: DailyCandle[];
    institutionalRecords?: RawInstitutionalRecord[];
    marginBalance?: number;
    marginBalanceChange?: number;
    shortBalance?: number;
    shortBalanceChange?: number;
    sblBalance?: number;
    dayTradeRate?: number;
    marginAsOfDate?: string;
    tdccRecords?: TdccRecordItem[];
    revenueRecords?: RevenueRecordItem[];
    valuation?: ValuationPayload;
    pledge?: {
      report_date?: string;
      pledged_shares?: number;
      total_director_shares?: number;
      pledge_ratio?: number;
      insider_transfer_shares?: number;
    };
    etfNav?: {
      date: string;
      closePrice: number;
      nav: number;
      premiumDiscountRatio: number;
    };
    corporateActions?: Array<{
      exDate: string;
      paymentDate?: string;
      cashDividendPerShare: number;
      stockDividendRatio: number;
      mandatoryBuybackDate?: string;
    }>;
    macro?: Record<string, any>;
  }
  ```

### 3. 核心量化引擎量綱校準、極性修復與未接線算法貫通 (Engine Math & Wiring Decisions)
- **台股「股 $\to$ 張」量綱同態正規化 (`normalizeVolumeToMarketUnit`)**：
  - 定義純輔助函式：當 `market === 'TW'` 時，若日 K `volume` 為股數（通常單日成交股數或與 `volumeUnit === '張'` 對照），將 `volume / 1000` 轉換為「張 (Lots)」後，統一供以下模組消費：
    1. `calculateHealthSummaryFromCandles`（5 日均量 `> 3000 張` 流動性風險為 `5`）。
    2. `calculateRiskSpider`（20 日均量 `>= 5000 張` 流動性風險為 `20`），並傳入真實 `{ institutionalNetVolume: sum5Inst, turnoverRate: dayTradeRisk.turnoverRate }`。
    3. `calculateAiConfidence`（20 日均量 `> 2000 張` 且最新日 `> 1000 張` 策略適用度為 `82`）。
    4. `calculateMultiDimensionRadar`（台股 5 日均量以「張」為基準計算流動性分數）。
    5. `estimateMarketSentiment` 的 `institutionalNetRatio`：分子 `sum5Inst`（張）除以分母 `totalVol5Lots`（張），消除 1,000 倍縮小誤差，並傳入真實 `marginChangeRatio`。
- **Card 11 健康度正向平均公式修正**：
  - 在 `calculateHealthSummaryFromCandles` 與 `HealthSummaryCard.tsx` 的 `calculateOverallHealthScore` 中，將 `liquidityRisk` 轉為正向指標 `liquidityHealth = Math.max(0, Math.min(100, 100 - liquidityRisk))` 後再與其餘 4 項正向指標取算術平均。
- **Card 07 VWAP 成本帶校準與動態價格診斷**：
  - 修正 `vwapCostEngine.ts` 的 `BAND_TEMPLATES` 與桶位分配，使正乖離 `> +5%` 對應「獲利倉儲區 (`>+5%`)」、`+2%~+5%` 對應「強勢換手區 (`+2~+5%`)」、`±2%` 對應「主力成本區 (`±2%`)」、`<-2%` 對應「套牢防守區 (`<-2%`)」；並在 `VwapCostStructureData` 帶入真實 `currentPrice`，消除 `VwapCostStructureCard.tsx` 中寫死的 `1240`。
- **Card 02、08、15、16、18、20、21 真實演算法全面接線**：
  - **Card 02 (`decisionCore`)**：根據 ADX/均線斜率與乖離動態計算 `shortTermState`（如 `'強勢突破'`、`'均線多頭發散'`、`'破線尋底'`、`'區間震盪'`）、根據法人與集保計算 `chipStructure`（`'土洋合買集中'`、`'大戶鎖碼'`、`'法人調節鬆動'`、`'中性平衡'`），並在 `AiDecisionCoreCard` 醒目渲染 `xaiExplanation`。
  - **Card 08 (`institutionalFlow`)**：`recentDaysTable` 切片由 `slice(-3)` 擴展為 `slice(-5)`，完整呈現近 5 日三大法人買賣超明細。
  - **Card 15 (`chipsSummary`)**：台股計算外資與投信連買連賣天數（`foreignConsecutiveDays`, `trustConsecutiveDays`）與 `sblBalance`；美股計算真實 `usMicroMetrics`（20 日 `rvol`、`vwapBiasPct`、14 日 `mfiScore`、14 日 `atrValue`）與近 10 日累積 OBV `sparklineHistory`。
  - **Card 16 (`forceDistribution`)**：當有真實三大法人買賣紀錄時，結合法人買賣佔成交量比與紅黑 K 量能計算大戶買進佔比與散戶賣壓。
  - **Card 18 (`mainForceVerdict`)**：接入 `synthesizeMainForceVerdict({ fiveDaysNetShares: sum5Inst, vwapBiasPercent: vwapBias, rsi: lastKline.rsi ?? 50 })`，並將 `keyLevels`（`supportLevel`, `highResistance`, `mainForceCost`）、`forecastCone` 與 5 日均量（張）傳入 `MainForceVerdictCard`，取代硬編碼乘數與空參 `checkLiquidityGate()`。
  - **Card 20 (`monthlyRevenue`) & Card 21 (`valuationMetrics`)**：ETF 模式下以 `corporateActions` 渲染真實歷次配息、以 `etfNav.premiumDiscountRatio` 渲染真實折溢價率、以 `valuation.dividendYield` 渲染真實殖利率；個股模式下將 `pledge.pledge_ratio` 注入 `valuationMetrics.directorPledgeRatio`。
- **Task 2、Task 3、K 線副圖與外聯提示詞修復**：
  - **Task 2 (`TechnicalAlertsView`)**：接收用戶在庫 `holding` / `loanRecords` 與 `macro.tw_margin_maintenance_ratio`，動態計算當前維持率與「跌停 -10% 壓力維持率」（取代寫死的 `168.5%`），若有近期除權息或融券強制回補日則動態生成預警卡。
  - **Task 3 (`deriveKdMaMetrics`) & Card 01 (`KLineChartCard`)**：使用 `aggregateCandlesToTimeframe` 聚合週 K / 月 K 後，在聚合序列上重新計算真實週 KD、月 KD、週 MACD 與週 RSI；且當 `goldenCrossCount === 0` 時回傳 `{ sampleCount: 0, winRate: 0, avgReturnPercent: 0 }`。
  - **Prompt Adapter (`createWarRoomPromptDigest`)**：修復 `tdcc.history` 取最後一筆最新資料 `history[history.length - 1]`，`bigHolderRatioChange1000` 取 `tdcc.change4WeeksRatio`，並正確映射 `twPutCallRatio` 與 `sblBalance`。

### 4. 「曜石精密 (Obsidian Precision)」反 AI Slop 視覺與組件架構決策 (UI/UX De-Slop Decisions)
- **移除無作用裝飾與 Emoji 清零**：
  - 移除 15 張卡片右上角無 `onClick` 行為的 `<MoreVertical />` 按鈕（保留 Card 01 K 線圖設定選單）。
  - 將 `TaskViewsSwitcher`、`MultiDimensionRadarCard`、`HeaderExportBar`、`TaskPanels`、`AiDecisionCoreCard` 與空狀態面板中的所有系統 Emoji 替換為 `lucide-react` 向量圖示。
- **曜石精密視覺 Token 與 4 大戰術章節佈局**：
  - 統一卡片容器背景為深邃曜石漸層 `linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)`，邊框統一為 `1px solid rgba(255, 255, 255, 0.07)` 搭配頂部微高光 `inset 0 1px 0 rgba(255, 255, 255, 0.06)`，將編號徽章收斂為等寬微標籤（`01`~`21` 石墨灰底 `#1e293b` + 冷灰字 `#94a3b8`）。
  - **頂部指揮艙合體与持倉 HUD**：在 `HeaderMarketBar` 渲染常駐快選膠囊（優先列出用戶 `holdings` 前 5 大持股 + `QUICK_CHIPS`），當分析標的存在於 `holdings` 時顯示「持倉成本 HUD 膠囊（持股數、均價 `avgCost`、距主力 VWAP `%`、未實現損益 `%`）」。
  - **導航與首屏結論提煉**：將 `TaskViewsSwitcher`（徽章更新為 `'21 模組'`）置於頂部指揮艙下方；在 `TASK_1_COMPREHENSIVE` 首屏緊接主 K 線圖呈現「主力追蹤總評判 (`MainForceVerdictCard`) + AI 決策核心 (`AiDecisionCoreCard` 含 `xaiExplanation`)」，並以 4 個清晰的戰術章節標題（`ZONE 01 // PRICE ACTION & COST STRUCTURE`、`ZONE 02 // AI TACTICAL VERDICT & RISK RADAR`、`ZONE 03 // INSTITUTIONAL FLOW & FUNDAMENTALS`、`ZONE 04 // MICRO-STRUCTURE & INTRADAY DEFENSE`）統御全頁網格。
  - **100% 向後相容契約**：保留所有既有 `data-testid` 與核心組件匯出介面，確保既有自動化測試與 Canvas 快照匯出零斷裂。

---

## Testing Decisions

### 1. 什麼構成良好的測試 (What Makes a Good Test)
- **僅測試公開介面縫隙之外部可觀測行為 (Test External Behavior at Public Seams)**：透過輸入特定日 K、籌碼、湖倉 Payload 與持倉 Props，斷言輸出的報表結構、量化指標數值與 DOM 可見文字/屬性，不綁定內部私有變數或純 CSS 樣式細節。
- **數學邊界與防偽不變量驗證 (Mathematical & Zero-Mock Invariants)**：針對「股 vs 張 1000 倍量綱」、「正向/負向指標平均」、「無資料時零合成假數據」與「非同步競態保護」編寫可證偽的精確數值斷言。

### 2. 受測模組與四大測試縫隙 (Modules Under Test & Four Test Seams)
1. **Seam 1：主力戰情室核心量化引擎縫隙 (`aiForceDashboardEngine.ts`, `riskSpiderEngine.ts`, `aiConfidenceEngine.ts`, `vwapCostEngine.ts`)**
   - 驗證台股日均量 3 張（`volume: 3000` 股）時，`liquidityRisk` 判定為高風險（`>= 60`）而非舊版的 `5%`；日均量 5,000 張（`volume: 5_000_000` 股）時才判定為低風險。
   - 驗證台股 5 日法人買超 `+5,000 張`、5 日總成交量 `25,000 張`（`25,000,000 股`）時，`estimateMarketSentiment` 的 `institutionalSentimentPercent` 顯著大於 `50%`（不再因 1000 倍分母誤差卡在 `50%`）。
   - 驗證 `calculateHealthSummaryFromCandles` 在 `liquidityRisk = 5`（極安全）且其餘四維為 `80` 時，總平均分數為 `Math.round((80*4 + 95)/5) = 83` 分（優良），而非舊版 `(80*4 + 5)/5 = 65` 分。
   - 驗證 `sblBalance`、`directorPledgeRatio`、`marginBalanceChange`（觸發 `brokerMarginAlert`）、`etfPremiumDiscountRate`、`corporateActions`、`usMicroMetrics`（美股 RVOL/VWAP/MFI/ATR）、`synthesizeMainForceVerdict` 與 `foreignConsecutiveDays` 正確寫入 `AiForceDashboardReport`。
2. **Seam 2：歷史回補與後端入庫無假化縫隙 (`historicalOhlcvBackfill.ts`, `ingest-tw-tdcc.cjs`, `ingest-tw-monthly-revenue.cjs`, `vite-market-middleware.cjs`)**
   - 驗證當遠端與本地均查無代號時，`backfillSymbolOhlcvAndIndicators` 回傳 `candles: []`，不產生合成假 K 線。
   - 驗證 `ingest-tw-tdcc.cjs` 與 `ingest-tw-monthly-revenue.cjs` 解析真實格式資料入庫，且無網路/無資料時不產生 `Math.sin/cos` 假紀錄；驗證 `/api/market/history/:symbol` 正確回傳 `etfNav` 與 `corporateActions`。
3. **Seam 3：多週期技術面板與外聯 AI 提示詞縫隙 (`TaskPanels.tsx`, `aiForcePromptAdapter.ts`)**
   - 驗證 `deriveKdMaMetrics` 使用真實週 K / 月 K 聚合計算週/月 KD，且當無歷史低檔金叉時回傳 `sampleCount: 0, winRate: 0`。
   - 驗證 `TechnicalAlertsView` 動態顯示用戶持倉/大盤真實維持率與跌停壓力測試（非寫死 `168.5%`）。
   - 驗證 `createWarRoomPromptDigest` 的 `bigHolderRatioChange1000` 等於 `tdcc.change4WeeksRatio`，且取最新一筆 `history[history.length - 1]` 與真實 `twPutCallRatio`。
4. **Seam 4：主力戰情室容器整合、持倉感知 HUD 與反 AI Slop 視覺契約縫隙 (`AiForceDashboardView.tsx`)**
   - 驗證快速切換標的（A 慢速未完成前切換至 B）時，A 完成後不會覆蓋 B 的報表狀態。
   - 驗證傳入 `holdings` 時，頂部渲染個人持倉成本 HUD（顯示均價與 VWAP 乖離），且點擊「7步深度投研」時 `<EquityDeepDiveModal>` 接收到完整 `candles`、`institutionalRecords`、`boxFloorPrice`、`boxCeilingPrice` 與估值倍數。
   - 驗證卡片右上角無作用 `<MoreVertical />` 按鈕已移除、Card 02 渲染 `xaiExplanation`、Task 1 徽章更新且所有既有 `data-testid` 100% 通過測試。

### 3. 既有測試先例 (Prior Art)
- 參考 `src/engine/__tests__/aiForceDashboardEngine.test.ts`、`src/components/aiForceDashboard/__tests__/AiForceDashboardView.test.tsx`、`src/engine/__tests__/aiForcePromptAdapter.test.ts` 與 `scripts/market-sync/__tests__/` 中針對純引擎計算、組件渲染與 SQLite API 中介層之單元與整合測試模式。

---

## Out of Scope

- 不新增需要付費訂閱之第三方商業數據源（如 Bloomberg Terminal 專線或 TEJ 付費資料庫），全數使用官方免費開放資料（TWSE / TPEx / TDCC OpenData、FRED、Yahoo Finance）與既有 FinMind / FMP 金鑰機制。
- 不變動「投資組合與庫存 (`portfolio`)」或「股息現金流 (`dividend`)」等其他獨立工作區的會計帳本計算公式。
- 不移除既有 `HeaderExportBar` 的 5 大匯出功能（PNG / 圖表打包 / CSV / HTML / PDF 列印）與底部 `WarRoomPromptCard` 外聯 AI 提示詞中樞。

---

## Further Notes

- **領域語言對齊 (`CONTEXT.md`)**：本規格將於實作時同步在 `CONTEXT.md` 補登 **「Dimensional Homomorphism Gate (量綱同態校驗閘門)」**、**「Zero-Synthetic Circuit Breaker (零合成數據物理斷路器)」** 與 **「Portfolio-Aware Tactical HUD (持倉感知戰術抬頭顯示器)」** 等核心領域術語，並依規範生成對應 ADR 與本地 `.scratch/` 票券鏡像。
