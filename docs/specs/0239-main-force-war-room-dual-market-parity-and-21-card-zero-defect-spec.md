# Spec 0239: 主力戰情室 5.0 — 台美雙市場一等公民對等架構、全鏈路資料管線修復與 21 卡零缺陷閉環規格 (Main Force War Room 5.0: Dual-Market First-Class Parity, Full-Pipeline Repair & 21-Card Zero-Defect Spec)

## Problem Statement

當投資人在「主力戰情室 (`AiForceDashboardView`)」切換檢視台股（上市個股、上櫃 OTC、傳統與主動型/債券型 ETF）與美股（個股、含點號標的如 `BRK.B`、美股 ETF 如 `VT`/`SPY`/`QQQ`、低價股與虧損成長股）時，實庫剖面探測與全鏈路審計顯示，當前系統存在五大系統性結構缺陷，導致多數卡片無法正常顯示、數值失真或跨市場互相污染：

1. **雙市場語意劫持與評分數學封殺（Dual-Market Semantic Hijack & Mathematical Lockout）**：
   - **台股遭美股視圖劫持**：報表引擎不分市場一律寫入 `usMacroData`，加上能量情緒雙子卡以 `Boolean(market === 'US' || ... || usMacroData)` 判定市場，導致所有台股只要湖倉存在總經資料，就被強制覆蓋為美股宏觀視圖，台股情緒與衍生品數據（P/C 比、外資期貨未平倉）徹底消失。
   - **美股遭台股公式全面鎖死**：多張核心評分卡片未接入美股機構量價微結構（`usMicrostructure`），且流動性門檻直接拿美股「股數」比對台股「張數」（誤差 1000 倍），導致 100% 美股標的在健康度（Card 11）籌碼/法人永遠鎖死 `50%`、在動態信號（Card 12）最高僅 ~55 分永遠無法亮綠燈且仲裁落入預設整理、在決策核心（Card 02）永遠亮不出 `AI BULLISH`、在主力總評判（Card 18）永遠輸出「區間整理 / 法人近 5 日合計 +0 張 / 元」。
   - **漲跌色彩主題斷裂**：超過半數卡片與 4 大任務子頁籤未消費全域 `colorTheme`，美股模式下多處硬編碼台股紅漲綠跌，同一畫面內卡片多空色彩互相矛盾。

2. **台股實庫採集器靜默失效與歷史序列真空（Silent Scraper Rot & Single-Period Snapshots）**：
   - **現股當沖率全滅 (`0%`)**：`TWTB4U` 解析器漏讀 `tables[0].data`，導致本地湖倉 612,581 筆籌碼紀錄之 `day_trade_rate` 全為 `NULL`，Card 09 永遠退回 K 線估算。
   - **台股總經衍生品全空**：TAIFEX 期貨未平倉以 UTF-8 解碼 Big5 CSV 導致中文比對亂碼失敗；`tw_put_call_ratio` 無採集器；全市場融資維持率讀取不存在欄位而全庫 `0%`；且最新一日列為 `NULL` 時直接覆蓋昨日有效值。
   - **TDCC、月營收與董監質押序列斷層**：實庫中 100% 台股僅存 1 週集保快照、99.9% 僅存 1 個月營收、董監質押僅存 5 檔樣本；開頁按需補齊因 2.5 秒強制棄權加上 5 分鐘冷卻鎖死，前端補完不會重繪，導致 Card 19 無法算 4 週變化與 10 週趨勢、Card 20 僅見單月柱體。
   - **櫃買 OTC 歷史回補污染與監理狀態停滯**：TPEx OpenAPI 忽略歷史日期參數卻被寫入所有歷史日；處置/注意股票標記未接通生產同步，狀態永遠為 `NORMAL`。

3. **美股基本面、13F 機構籌碼與 ETF 管線全真空（US Fundamental & ETF Pipeline Vacuum）**：
   - 本地湖倉缺乏美股估值表與 13F/放空資料源，Card 19（`us13fData`）對所有美股 100% 呈現空狀態；Card 21 對美股三宮格（PE / PB / 殖利率）與 `forwardPe`、`psRatio`、`netDividendYieldUs`、`isLossMaking` 永遠為 `--`；SEC EDGAR 僅硬編碼 18 檔 CIK 且瀏覽器直傳違規 `User-Agent` 標頭。
   - 美股個股已抓回之季度財報營收從未餵入 Card 20，導致美股個股 100% 空狀態；美股 ETF 缺乏淨值、費用率、AUM 與歷史配息同步，且因條件分支漏洞在空狀態時竟誤落入「個股空月營收」畫面。

4. **基礎設施瓶頸、路由攔截與資產分類誤判（Middleware Thrashing, Routing & Asset Misclassification）**：
   - 開發中介層於每個 HTTP 請求（含靜態資源）重複初始化資料庫與重跑新鮮度聚合查詢；市場寬度快取永不過期。
   - 中介層代碼路由正則未允許點號 `.`，導致 `BRK.B` 穿透回傳 HTML 200 並靜默解析失敗；財報 API 寫入與讀取欄位名錯置（`dividendPaid` vs `cash_dividends_paid`）造成現金股利欄位全寫入 `NULL`。
   - 系統內存在 3 套衝突的 ETF 判斷邏輯，其中正則誤將「富邦金 (`2881`)、國泰金 (`2882`)、富邦媒 (`8454`)」等金融/一般個股誤判為 ETF；標的名稱解析函式參數錯傳導致未收錄標的名稱顯示為 `'TW'` 或 `'US'`；美股結算時間引擎於台北週日/週一凌晨誤報未結算。

5. **偽零造假漏洞、互動死鎖與多卡 SVG/版面瑕疵（Zero-Mock Leaks, UI Deadlocks & Chart Defects）**：
   - **分頁切換物理死鎖**：任務視圖切換器內層 `TermTooltip` 呼叫 `stopPropagation()`，點擊分頁文字或圖示無法切換 `TASK_1`~`TASK_5`。
   - **假數值外洩**：預設報表與子引擎殘留大量硬編碼假數值（`-64 張`、`+1,621 張`、`2131`、`06/26~08/31`、`56 分`、`100%` 完整度），透過 `isLoading` 未遮罩、`<5D` 回退與「有報價無日 K」三條路徑直接洩漏至畫面；載入中 `currentPrice=0` 更會誤觸發已釘選策略之停損警報。
   - **多卡圖表與幾何故障**：低價美股（`< $25`）在 Card 01/04/06 產生重複整數刻度、React `key` 碰撞或 Y 軸飛出畫布；Card 07 寫死 `60k~0k` 且圖例與填色三方錯位；Card 03/05 雷達圖標籤超出 `viewBox`；Card 08 折線與柱狀圖 X 軸錯位且 >38 根碰撞；Card 11 第 4 環標籤與數值語意錯位；Card 16/17 三環最小寬 `228px` 在 `200px` 格線溢位；Card 18 正則漏千分位逗號導致 `>=1,000 張` 膠囊消失且三欄無響應折行；`TaskPanels` 之 MACD 負數底背離公式符號反轉誤報。

---

## Solution

建構 **「主力戰情室 5.0 — 台美雙市場一等公民對等引擎 (Dual-Market First-Class Parity Engine)、全鏈路自癒資料管線與 21 卡零缺陷閉環」**，一次性根除底層資料、核心計算與前端渲染的所有缺損：

1. **基礎設施去瓶頸與單一事實分類契約 (Singleton Middleware, Dot-Safe Routing & Canonical Asset Classification)**：
   - 將本地市場 API 中介層改為單例快取實例（僅於腳本熱更新時重置），消除每請求重開資料庫與重複 freshness 掃描；資料入庫時自動失效寬度快取。
   - 擴展所有標的路由支援含點號代碼（如 `BRK.B`）與雙向別名探測（`BRK.B` ↔ `BRK-B`、OTC `O` 尾綴剝除），並直接復用歷史端點回傳之 `meta` 消除冗餘查詢；對齊財報雙向欄位契約（`cash_dividends_paid` 等）。
   - 收斂全專案 3 套衝突的 ETF 判斷為單一權威資產分類器（優先信任 `symbols_meta.type`，移除 `/(富邦|國泰)/` 誤殺規則，涵蓋全量台股主動/債券 ETF 與主流美股 ETF）；修正標的名稱解析參數與美股結算時區/DST/休市日判定。

2. **台股實庫全平面修復與非阻塞歷史補齊 (TW Full-Plane Repair & Non-Blocking Hydration)**：
   - 修復 `TWTB4U` 現股當沖率（`tables[0].data`）、TAIFEX Big5 期貨未平倉解碼、台股 Put/Call Ratio 與全市場融資維持率採集；總經查詢改採「逐欄最新非空值合併」，避免當日盤前 `NULL` 蓋掉昨日有效衍生品指標。
   - 根除 TPEx 歷史回補以最新快照覆寫舊日期的污染問題；接通台股注意/處置股票狀態與上市櫃董監質押同步。
   - 解除開頁單檔歷史序列（TDCC 10 週、月營收 12 月、歷史配息）之 2.5 秒強制棄權與 5 分鐘失敗冷卻鎖死：首屏 300ms 立即呈現在庫資料，背景完成 SQLite 寫入後通知前端自動無縫重繪，並支援全持股批次歷史補齊。

3. **美股一等公民資料管線（`us_fundamentals_daily` + SEC EDGAR 本地代理 + 美股季營收/配息）**：
   - 新增 SQLite 冪等表 `us_fundamentals_daily`，透過本地中介層整合免費雙軌來源：**主軌** Yahoo Finance v10 `quoteSummary`（伺服器端自動管理 Cookie/Crumb 緩存、24H TTL 與 429 熔斷）與 **備援/財報軌** 本地代理 SEC EDGAR（透過全美股 `company_tickers.json` 動態解析 CIK，徹底解決 18 檔硬編碼上限與瀏覽器 `User-Agent` 違規）及 FMP/Finnhub 金鑰池。
   - 完整貫通美股 4 大長期空白卡片：Card 19 接入真實 `us13fData`（機構持股比、內部人持股比、Short Float 與軋空警戒）；Card 20 美股個股改為渲染 10-Q/10-K **近 8 季營收與 YoY 成長走勢**、美股 ETF 渲染規模/費用率/殖利率與近 4 季配息；Card 21 貫通美股 `PE`、`Forward PE`、`PB`、`PS`、殖利率、扣除 30% 稅後實質殖利率 (`netDividendYieldUs`) 與虧損轉機股判定。

4. **雙市場統一能力適配引擎與 ARINC 661 零幻覺淨化 (Unified Dual-Market Engine & Zero-Mock Gate)**：
   - 嚴格隔離 `twMacroData` 與 `usMacroData`（依 `market` 專屬寫入，徹底根治台股遭美股劫持），並統一美股總經欄位命名契約。
   - 建立雙市場等價訊號適配層：將美股 `usMicrostructure`（MFI / OBV / RVOL / VWAP 乖離 + 13F/Short Float 權重）與美股股數/成交額流動性階梯注入 Card 02、05、09、11、12、14、16、18，徹底解除美股評分封殺與 `+0 張` 退化；同步校準美股無漲跌幅日內波動模型與等價卡片語意。
   - 統一 20D VWAP（Typical Price）公式與 RSI 零波動防呆（回傳 `50`）；全面剷除預設報表與所有子引擎內殘留之假數值，實作 `isLoading` 載入態與 `isDataPending`（含 `<5D` 與無日 K 僅有即時報價）全區隔離遮罩，杜絕停損警報於 `currentPrice=0` 誤觸發。

5. **21 張卡片 + 5 大任務分頁全面 UI / SVG / 互動 / 主題精修 (21-Card & 5-Tab Zero-Defect UI Polish)**：
   - 解除 `TaskViewsSwitcher` 點擊攔截死鎖，修復 `TASK_2~5`（KD+MA 補畫均線與防裁切、MACD 修正負數底背離公式、美股專屬技術警示規則、原始表頁碼重設與單位標示）。
   - 全域貫穿 `colorTheme` 與 `market` 至全數 21 張卡片與子頁籤，實現台股（紅漲綠跌）與美股（綠漲紅跌）100% 視覺一致。
   - 逐一修復所有圖表幾何與契約缺陷（低價美股自適應小數刻度、雷達圖 `viewBox` 邊距與 `useId()`、Card 07 動態比例軸與色帶對齊、Card 08 雙軸座標與柱寬防碰撞、Card 11 標籤對齊、Card 12 燈色與字級底線、Card 15 投信連買與 Sparkline、Card 16/17 窄欄防溢位、Card 18 千分位正則/RWD/Modal 與 `key={symbol}`、Card 19 標籤疏化與 13F 長條歸一、Card 20 ETF 空狀態分支、Card 21 分位指針與稅前/稅後優先序、補齊詞彙表缺漏詞條、收斂孤兒元件與修復匯出非同步等待）。

---

## User Stories

1. As a Taiwan stock investor viewing `2330` or `0050`, I want Card 10·13 (`EnergySentimentTwinCard`) to stay in Taiwan market sentiment mode with real TAIFEX futures open interest and Put/Call ratio rather than being hijacked into the US CNN/VIX view whenever global macro records exist in SQLite.
2. As a US stock investor viewing `NVDA`, `AAPL`, or `BRK.B`, I want Card 02 (`AiDecisionCore`), Card 11 (`HealthSummary`), Card 12 (`DynamicSignals`), Card 14 (`AiConfidence`), and Card 18 (`MainForceVerdict`) to evaluate real US institutional volume-price microstructure (`usMicrostructure`) and US share-based liquidity thresholds so that strong US equities can legitimately earn `AI BULLISH`, green verdicts, and actionable institutional momentum conclusions instead of being mathematically capped at 55 points or stuck on `"區間整理 / +0 張"`.
3. As a US stock investor researching `BRK.B` (or any dotted ticker), I want the local lakehouse API routes and symbol resolver to match dotted symbols seamlessly and resolve fallback aliases (`BRK.B` ↔ `BRK-B`) so that historical candles and fundamentals load without falling through to an HTML 200 error.
4. As a US stock investor inspecting Card 19 (`TdccDistributionCard`), I want to see real institutional ownership %, insider ownership %, Short Float %, public float %, and short-squeeze alerts sourced from the local US fundamentals pipeline (`us_fundamentals_daily`) rather than a permanent empty state.
5. As a US stock investor inspecting Card 20 (`MonthlyRevenueCard`), I want individual US stocks to automatically render their last 8 quarters of 10-Q/10-K revenue and YoY growth bars from the quarterly financial statements table, and US ETFs (`VT`, `SPY`, `QQQ`, `VOO`) to render USD AUM, expense ratio, annualized yield, and trailing quarterly dividends without ever falling into the broken stock empty-revenue box.
6. As a US stock investor inspecting Card 21 (`ValuationMetricsCard`), I want to see real `PE`, `Forward PE`, `PB`, `PS`, gross/net dividend yield (with 30% US withholding tax applied even on loss-making tickers), and `$` USD EPS units—working across the entire US stock universe via dynamic SEC EDGAR CIK lookup and server-side Yahoo `quoteSummary` instead of only 18 hardcoded stocks.
7. As a US investor inspecting Card 09 (`DayTradeRiskCard`) and Card 16 (`ForceDistributionCard`), I want the cards to present calibrated US-native metrics (intraday ATR volatility, RVOL surge, upper-wick distribution pressure, Short Float risk, and price-volume institutional vs. retail momentum) with USD/share terminology and zero Taiwan-specific `"張"` or `"三大法人"` labels.
8. As a Taiwan investor analyzing financial stocks like `2881 富邦金` or `2882 國泰金` alongside active/bond ETFs like `00403A`, `00981A`, and `00679B`, I want asset classification to use a single canonical source (`symbols_meta.type` + strict ticker rules) so financial stocks are never misclassified as ETFs and active/bond ETFs are accurately identified with real names rather than `'TW'`.
9. As a Taiwan trader inspecting Card 09 (`DayTradeRiskCard`) and Card 15 (`ChipsSummaryCard`), I want real daily `day_trade_rate` parsed from TWSE `TWTB4U` (`tables[0].data`) and consecutive investment trust buying/selling days (`trustConsecutiveDays`) displayed alongside foreign investors and margin/SBL balances.
10. As a Taiwan investor inspecting OTC stocks (`8299`, `00679B`), I want historical backfill not to overwrite historical dates with today's TPEx snapshot, `O`-suffixed codes to normalize cleanly across all chip/valuation tables, and remote dividend backfill to try `.TWO` after `.TW`.
11. As a Taiwan investor opening a stock whose SQLite cache currently holds only 1 week of TDCC or 1 month of revenue, I want the page to paint immediately in $\le 300\text{ms}$ while the backend completes full 10-week TDCC / 12-month revenue / historical dividend backfill without a 2.5-second abort or 5-minute lock-out, and automatically refresh the cards as soon as the backfill lands.
12. As a user switching between the 5 task tabs (`綜合戰情`, `技術警示`, `KD+MA`, `MACD`, `原始資料`), I want clicking anywhere on a tab button (including its text and icon) to switch views reliably instead of being blocked by `TermTooltip`'s `stopPropagation()`.
13. As a user viewing `TASK_2` through `TASK_5` (`TaskPanels`), I want `TechnicalAlertsView` to adapt its risk rules for US markets (replacing Taiwan disposition/10% limit-down/130% margin rules), `KdMaView` to plot actual MA curves without left-edge SVG clipping, `MacdView` to detect bearish/bullish divergences accurately even when DIF is negative, `RawDataView` to reset pagination on symbol change with clear volume units, and all 4 tabs to obey `colorTheme`.
14. As a user viewing low-priced US stocks or ETFs (e.g., `$2.50` or `$12.40`), I want Card 01 (`KLineChartCard`), Card 04 (`VolumeProfileCard`), and Card 06 (`ForecastConeCard`) to compute adaptive decimal Y-axis ticks so ticks never duplicate, never trigger React key collisions, and never fly off-canvas due to rounding by 50.
15. As a user switching between Taiwan (`taiwan` red-up/green-down) and US (`international` green-up/red-down) color themes, I want every single one of the 21 cards and 5 task views—including sparklines, badges, forecasts, VWAP bias, institutional summaries, and HTML exports—to display consistent bullish/bearish color polarity.
16. As a user opening an uncached, newly listed (`< 5` days), or loading ticker, I want a clean loading skeleton and strict Zero-Mock isolation across all layers (including the Executive Verdict Strip, `TASK_2~5`, and `WarRoomPromptCard` stop-loss monitor) so fabricated numbers (`-64張`, `2131`, `56分`, `100% 完整度`) or false `0 <= stopLoss` alerts never flash on screen.
17. As a user inspecting SVG charts across Cards 03, 05, 07, 08, 16, 17, 18, and 19, I want zero clipped radar/spider labels, aligned bar/polyline coordinates without bar overlap, accurate VWAP band colors/percentages without fake `'60k~0k'` ticks, responsive 3-ring/3-column layouts without narrow-column overflow, comma-safe `>= 1,000 張` verdict parsing, and clean Modal dismissal (ESC/click-outside/symbol change).
18. As a user searching tickers in the header bar or exporting dashboard PNGs, I want full US dictionary search suggestions, safe handling when pressing Enter on Chinese stock names, real `await` confirmation before reporting PNG export success, and fast local API responses ($\le 80\text{ms}$ P95) without per-request database re-initialization overhead.
19. As a US/TW cross-market user checking settlement timing on weekends, late nights (00:00–07:59 Taipei), or US daylight-saving transitions, I want `marketSettlementEngine` and `market-freshness-service` to accurately determine settled vs. live trading status using `America/New_York` / `Asia/Taipei` clocks and market holiday calendars.
20. As a maintainer of the codebase, I want orphan legacy components (`BullBearEnergyCard`, `MarketSentimentCard`, `HeaderQueryBar` UI duplication) consolidated cleanly without breaking public exports, and all glossary `termId` references verified against the canonical dictionary so zero tooltips silently degrade to plain text.

---

## Implementation Decisions

### 1. 基礎設施、路由與權威資產分類 (Infrastructure, Dot-Safe Routing & Canonical Asset Classification)
- **單例快取中介層與快取失效**：將開發伺服器市場 API 中介層實例與 SQLite 連線狀態快取於模組層級，僅在同步腳本發生檔案變更熱重載時重建；每次市場資料寫入完成後主動失效 `breadthAnchorCache`，消除每請求重複執行 `PRAGMA` 與多表 freshness 掃描。
- **含點號代碼路由與別名歸一**：放寬市場歷史、報價、公司行動與財報路由之代碼匹配規則以支援點號 `.`（例如 `BRK.B`），並統一提供美股點號/連字號別名探測（`BRK.B` ↔ `BRK-B`）與台股上櫃 `O` 尾綴雙向正規化；前端湖倉載入器直接消費歷史端點回傳之 `meta`（含 `name`, `type`, `status`），移除重複發起 `/quote/:symbol` 之冗餘往返。
- **單一權威資產分類器 (`resolveAssetClass`)**：廢除分散的 3 套重複 `isEtfSymbol` 實作，統一依優先順序判定：① 湖倉 `symbols_meta.type === 'ETF'`；② 台股嚴格代碼規則（`00xxx[A-Z]?` / `01xxx[A-Z]?`）；③ 擴充版美股主流 ETF 白名單集合；**徹底移除名稱含 `富邦`/`國泰` 之誤判條件**。
- **名稱解析與時區結算校正**：修正標的名稱解析調用契約（不再將市場代碼 `'TW'`/`'US'` 誤作預設名稱）；市場結算引擎全面採用 `hourCycle: 'h23'` 與 IANA 時區（`Asia/Taipei` / `America/New_York` 自動處理夏冬令 DST），修正美股週日/週一台北凌晨誤判未結算與盤中 `isTradingHours` 恆為 `false` 缺陷；美股日 K 入庫日期嚴格以美東交易日格式化；新鮮度檢查於空資料庫時正確回傳 `isStale = true` 並納休市日曆判斷。
- **財報資料表欄位契約對齊**：統一後端財報 API 與前端湖倉財報用戶端之欄位映射，確保 `cash_dividends_paid` (`cashDividendsPaid`)、`period_date`、`cash_and_equivalents` 與 `source` 讀寫雙向無損一致。

### 2. 台股實庫全平面修復與非阻塞補齊 (TW Real-Data Pipeline & Non-Blocking Hydration)
- **修復 4 大台股靜默失效採集器**：
  - 現股當沖 `TWTB4U` 解析器優先自 `rawData.tables[0].data`（兼容 `rawData.data`）提取各股當沖率寫入 `tw_institutional_chips.day_trade_rate`。
  - TAIFEX 期貨未平倉採集器改以 `TextDecoder('big5')`（搭配 UTF-8 偵測回退）解碼官方 CSV，並新增台指選擇權 Put/Call Ratio (`tw_put_call_ratio`) 與 TWSE 全市場信用融資維持率 (`tw_margin_maintenance_ratio`) 真實計算入庫。
  - 總經歷史查詢改採「近 7 筆逐欄取最新非空值合併」，避免盤前空值列遮蓋前一結算日之期貨未平倉與 P/C Ratio。
  - 隔離 TPEx OpenAPI 僅適用於當日快照（嚴禁寫入歷史回補舊日期），統一於 TPEx T86/資券/估值解析端剝除 `O` 尾綴；遠端除權息備援對上櫃標的支援 `.TW` ➔ `.TWO` 雙試探；將注意/處置股票狀態與上市櫃董監質押接通定期同步與按需補齊。
- **非阻塞按需歷史補齊與自動重繪**：將開頁觸發之單檔歷史補齊（TDCC 10 週、月營收 12 月、歷史配息）改為「首屏立即回傳在庫資料 + 附帶 `enrichmentPending` 狀態旗標 + 後端非阻塞寫入完成後解除冷卻」，前端收到待補齊旗標時進行受控輕量輪詢（具 RequestGuard 防競態）於補齊完成後無縫刷新卡片；並提供持股清冊批次歷史補齊腳本。

### 3. 美股一等公民資料湖倉與聚合管線 (US First-Class Fundamentals, 13F & ETF Pipeline)
- **新增冪等資料表 `us_fundamentals_daily`（Schema 契約）**：
  ```sql
  CREATE TABLE IF NOT EXISTS us_fundamentals_daily (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    pe REAL,
    forward_pe REAL,
    pb REAL,
    ps_ratio REAL,
    dividend_yield REAL,
    institutional_ratio REAL,
    insider_ratio REAL,
    short_float_ratio REAL,
    public_float_ratio REAL,
    etf_aum_billion REAL,
    etf_expense_ratio REAL,
    etf_nav_price REAL,
    etf_premium_discount_ratio REAL,
    source TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (symbol, date)
  );
  ```
- **伺服器端雙軌免費聚合與本地代理**：
  - 於本地市場中介層建置美股基本面/13F/ETF 擷取器：優先透過 Yahoo Finance v10 `quoteSummary`（伺服器端快取 Cookie/Crumb、24 小時 SQLite TTL 與 429 熔斷降級）寫入 `us_fundamentals_daily`，並自 Yahoo Chart `events=div` 同步美股歷史配息至 `corporate_action_calendar` (`market='US'`)。
  - 建立本地 SEC EDGAR 代理路由（伺服器端注入合規 `User-Agent` 標頭，消除瀏覽器違規），搭配本地快取之全美股 `company_tickers.json` 動態解析任意美股 CIK（取代 18 檔靜態表），與 FMP/Finnhub 金鑰池構成備援鏈，寫入 `financial_statements_quarterly`。
  - 歷史聚合端點 `/api/market/history/:symbol` 依市場回傳 `usFundamentals` 與 `quarterlyFinancials`，無縫供應 Card 19 (`us13fData`)、Card 20（美股個股近 8 季營收 YoY / 美股 ETF 規模費用配息）與 Card 21（美股 `pe`/`forwardPe`/`pb`/`psRatio`/`dividendYield`/`netDividendYieldUs`/`isLossMaking`）。

### 4. 雙市場核心評分引擎解鎖與 Zero-Mock 淨化 (Dual-Market Scoring Parity & Zero-Mock Purification)
- **跨市場總經隔離與契約統一**：報表引擎嚴格依 `market` 分流——僅 `market === 'US'` 掛載 `usMacroData` 並設 `marketSentiment.isUsMarket = true`；僅 `market === 'TW'` 掛載 `twMacroData` 並設 `isUsMarket = false`。統一 `UsMacroSentimentData` 正規欄位並相容舊別名，無資料時不捏造 `'中性'`。
- **美股評分全面解鎖（Unified Institutional Signal & Liquidity Adapter）**：
  - 流動性評估全面區分台股（張）與美股（股數 / 美元成交額），修正風險蛛網（Card 05）、健康度（Card 11）、AI 信心度（Card 14）與主力總評判（Card 18）流動性閘門之 1000 倍量綱誤差。
  - 將美股 `usMicrostructure`（結合 MFI / OBV / RVOL / VWAP 乖離與 13F/Short Float 權重）注入 Card 02（`chipHealthScore` 連動）、Card 11（`chipHealth` 與 `institutionalSupport`）、Card 12（`chipScore`、`chipSignal` 與仲裁決策樹，解除 55 分封頂使美股正常亮綠燈）、Card 14（美股具備日 K 與微結構即享滿額資料完整度）、Card 18（產出美股專屬機構動能總評動詞與 `$`/`股` 單位文案）。
  - 校準 Card 09 美股日內波動模型（依美股 ATR% 動態區間，不套台股 9.5% 漲跌幅封頂），並於 Card 16 區分美股價量機構動能語意。
- **引擎算術一致性與零造假守衛 (ARINC 661 Gate)**：
  - Card 10 改消費過濾後之 `effectiveCandles`；統一全引擎 20D VWAP 為 Typical Price `(H+L+C)/3` 成交量加權；修正 RSI 零波動回傳 `50`；修正 `vwapCostEngine` 四帶佔比歸一消除 `-1%` 溢位並統一名稱與色碼；修正 `calculateValuationPercentile` 使 PE/PB 分位數並存且僅於 `historySampleSize >= 5 && !isEtf` 時標定估值位階；修正 `aiForcePromptAdapter` 20D 切片、量能單位與四週集保變動。
  - 徹底清除預設報表與所有子引擎內之硬編碼假數值/假日期/假 OHLC；嚴格執行 `effectiveCandles.length < 5` 一律維持 `isDataPending = true`（即使存在即時報價亦不得放行假卡片）；載入期間顯示載入骨架不閃現空狀態錯誤，且於 `isLoading` 或 `isDataPending` 狀態下全面封鎖 Executive Verdict Strip、`TASK_2~5` 與 `WarRoomPromptCard` 停損誤報（`currentPrice > 0` 門禁）。

### 5. 21 張卡片、5 大分頁與導覽列 UI/SVG/主題全面收斂 (UI, SVG, Interaction & Theme Convergence)
- **解除互動死鎖與分頁完善**：重構 `TaskViewsSwitcher` 使 `TermTooltip` 不攔截分頁切換按鈕事件；修復 `TaskPanels` 之 `KdMaView`（補繪 MA 均線、修正左界裁切、修正共振主值）、`MacdView`（修正負數 DIF 底背離判定公式、補刻度與空狀態）、`TechnicalAlertsView`（美股切換至 ATR 波動/財報/軋空風控規則，隔離台股處置分盤與 130% 追繳線）、`RawDataView`（切標的重置頁碼、標註成交量單位與空狀態）。
- **全域 `colorTheme` 與 `market` 貫通**：所有 21 張卡片、4 大任務子頁籤與 HTML 匯出報表一律依 `resolvedColorTheme` 決定多空紅綠色票，徹底消除跨卡色彩打架。
- **逐卡幾何、契約與字級修復**：
  - 低價股/美股自適應小數刻度：Card 01 K 線 Y 軸與游標、Card 04 `priceTicks`（改用索引 `key` 防重複）、Card 06 `generateYAxisTicks`（動態十進位步進，徹底取代除以 50 取整）。
  - SVG 防裁切與靜態 ID 隔離：全站 SVG `<linearGradient>` / `<radialGradient>` 改用 `React.useId()` 並加 `NaN` 防護；修正 Card 03/05 `viewBox` 邊距防頂側文字裁切；修正 Card 07 動態正規化軸與四帶色彩對齊並呈現各帶百分比；修正 Card 08 雙軸步距與動態柱寬防重疊且移除 `preserveAspectRatio="none"`；修正 Card 19 10 週 X 軸疏化、左軸 `>= 0` 鉗制與美股 13F 超過 100% 長條歸一。
  - 契約與版面修復：修正 Card 02/05 `dayTradeRatio` 傳真實值與 `'1~4 級交易日日'` 錯字；修正 Card 11 第 4 環語意對齊「流動性風險（越低越佳）」與窄螢幕折行；修正 Card 12 `'風險可控'` 綠燈、字級 `>= 0.75rem` 底線與錯字；修正 Card 14 標籤「訊號穩定度」；修正 Card 15 投信連買顯示、Sparkline 零軸/空狀態與移除美股重複結論；調整 Layer 7 網格與 Card 16/17 三環尺寸防 `200px` 溢位並消費 `signalTierLevel`；修正 Card 18 正則支援千分位逗號、`'賣壓沉重'` 階段映射、RWD 折行、彈窗定位/ESC 關閉與 `key={symbol}`；修正 Card 20 `isEtf && isEmpty` 分支漏洞與柱圖容器高度；修正 Card 21 美股虧損稅率優先序、USD EPS 單位、PR 分位指針視覺化與 `operatingMargin` 顯示；補齊詞彙表缺失詞條（`tdccDistribution`, `usInstitutionalHoldings`, `etf`, `revenue` 等）；整合清理孤兒元件重複邏輯並修復 `HeaderMarketBar` 溢出/全量美股搜尋與 `HeaderExportBar` 非同步匯出等待。

---

## Testing Decisions

### 1. 什麼構成良好的測試 (What Makes a Good Test)
- **僅在公開介面縫隙驗證外部行為與領域不變量**：測試真實輸入（台股個股、台股 ETF、美股個股含 `BRK.B`、美股 ETF、低價虧損美股、空/短天期資料）通過管線後的輸出結構、數值邊界、DOM 可見文字、色彩極性與互動狀態，不綁定私有內部函式實作細節。

### 2. 三大高階測試縫隙 (Three High-Level Test Seams)
1. **Seam 1：本地湖倉中介層與雙市場資料攝取縫隙（Middleware, Scrapers & US Fundamentals Pipeline）**
   - 驗證 `TWTB4U` (`tables[0].data`)、TAIFEX Big5 期貨 OI 解碼、總經逐欄最新非空合併、TPEx 歷史防污染與 `O` 尾綴清理、`BRK.B` 含點號路由匹配、`financial_statements_quarterly` 雙向欄位對齊、中介層單例快取與快取失效。
   - 驗證美股 `us_fundamentals_daily`（Yahoo `quoteSummary` 解析 + SEC EDGAR 動態 CIK 代理）與美股歷史配息寫入及 `/api/market/history/:symbol` 完整回傳；驗證 `marketSettlementEngine` 美股週日/週一凌晨與 DST 邊界判定。
2. **Seam 2：雙市場核心報表引擎與 Zero-Mock 契約縫隙（`generateAiForceReportFromCandles` & `createDefaultAiForceReport`）**
   - 針對 **4 象限黃金夾具（`2330` TW 個股、`0050`/`00403A` TW ETF、`2881` 金融股防誤判、`NVDA`/`BRK.B` US 個股、`VT` US ETF）+ 邊界夾具（`0D`、`3D`、`$4.50` 虧損美股、14 日平盤）** 驗證：
     - 台股不被 `usMacroData` 劫持、美股不洩漏 `twMacroData` / `張` / `元`。
     - 美股多頭微結構可於 Card 02 亮 `AI BULLISH`、Card 11 擺脫鎖死 50%、Card 12 突破 60 分亮綠燈、Card 18 產出正確美股機構動能動詞。
     - `0D` 與 `3D`（含僅有即時報價）嚴格維持 `isDataPending = true` 且零假數值外洩。
     - 資產分類器正確辨識 `2881` 為個股、`00403A`/`VT` 為 ETF；Card 20/21 正確輸出美股季營收、Forward PE/PS、30% 稅後殖利率與 13F/Short Float。
3. **Seam 3：主力戰情室端到端 DOM 渲染、SVG 幾何、主題極性與互動縫隙（`AiForceDashboardView` + 21 Cards + 5 Task Tabs）**
   - 驗證點擊 `TaskViewsSwitcher` 任一分頁文字/圖示可 100% 切換至 `TASK_1`~`TASK_5`（無 `stopPropagation` 死鎖）。
   - 驗證台股（`taiwan`）與美股（`international`）雙主題切換時，全數 21 卡與 `TASK_2~5` 漲跌色極性一致、無 `NaN` SVG 座標、低價美股無重複刻度或飛出畫布、Card 20 ETF 空狀態不誤入個股月營收、Card 18 正確解析 `>=1,000 張` 且切標的關閉 Modal、載入中不閃現「查無真實數據」且不誤觸停損警報、全站 `termId` 100% 命中詞彙表且守住 `>= 0.75rem` 字級底線。

### 3. 既有測試先例 (Prior Art)
- 延續既有整合與單元測試架構：`fullSpectrumAiForceE2E.test.ts`、`aiForceDashboardEngine.test.ts`、`viteMarketMiddleware.test.ts`、`marketSettlementEngine.test.ts`、`AiForceDashboardView.test.tsx`、`ergonomicTypographyGuardrail.test.ts` 與各卡片獨立測試檔。

---

## Out of Scope

- 不購買或強制綁定付費商業數據訂閱 API（所有核心雙市場功能必須可透過免費官方/公開端點 + 本地 SQLite 快取獨立運行，付費金鑰僅作可選增強備援）。
- 不更動既有投資組合會計帳本（`calculator.ts`）、股息日誌（`DividendLogView`）或 Zavy 慢富工作區之領域計算規則。
- 不變更主力戰情室 21 張卡片之模組編號體系（`01`~`21`）與 5 大任務頁籤之頂層導覽結構。

---

## Further Notes

- **領域模型同步 (`CONTEXT.md` & ADR 0239)**：本規格實作時須同步於領域詞彙表與架構決策紀錄中確立四大新領域準則：
  1. **Dual-Market First-Class Parity (台美雙市場一等公民對等架構)**
  2. **Unified Market Capability Adapter (統一市場能力適配層 — 隔離制度差異、對等評分引擎)**
  3. **Canonical Asset Classification SSOT (權威資產型態單一分類來源)**
  4. **ARINC 661 Zero-Mock Loading & Pending Gate (零幻覺載入與待命硬閘門)**
- **合規與節流守則**：伺服器端 Yahoo `quoteSummary` 與 SEC EDGAR 代理必須嚴格遵守速率限制（SEC $\le 10\text{ req/s}$ + 合規 `User-Agent`，Yahoo 24H SQLite 快取 + 429 熔斷），所有敏感 API Key 僅存本地不入庫 Git。
