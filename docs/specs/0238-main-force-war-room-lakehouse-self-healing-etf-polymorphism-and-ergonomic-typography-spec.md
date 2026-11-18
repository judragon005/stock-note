# Spec 0238: 主力戰情室 4.1 — 湖倉欄位級自癒同步、ETF 資產多型數據貫通與零微字人體工學視覺重構規格 (Main Force War Room 4.1: Column-Level Lakehouse Self-Healing, ETF Asset Polymorphism & Zero-Micro-Font Ergonomic Typography Spec)

## Problem Statement

當投資人使用「主力戰情室 (`AiForceDashboardView`)」檢視台灣核心 ETF（如 `0050 元大台灣50`、`0056`、`00878`）與上市櫃個股（如 `2330`、`1312`）時，儘管 Spec 0237 已完成合成假數據拔除，但在實際生產環境與本地 SQLite 湖倉運作中，仍面臨以下 **3 大系統性結構斷路與視覺人體工學痛點**：

1. **外部資料同步管線「假性新鮮度鎖死 (False-Positive Freshness Lock)」與歷史序列斷層，導致多張卡片資料殘缺或停滯於 `NULL`**：
   - **單表筆數掩蓋跨時段欄位半殘（Half-Baked Sync Lock-in）**：台股盤後資料由證交所與櫃買中心於不同時段分批釋出（14:30~15:00 釋出日 K `MI_INDEX`，15:30~16:30 釋出三大法人 `T86`，16:30~20:30 陸續釋出融資融券 `MI_MARGN`、借券賣出 `TWT93U`、當沖 `TWTB4U`、本益比殖利率 `BWIBBU_d` 與 ETF 淨值 `all_etf.txt`）。然而現有新鮮度探針與歷史回補快取跳過邏輯僅檢查「當日日 K 筆數 $\ge 1800$ 且法人筆數 $\ge 2000$」即判定當日同步完成（`isStale = false`），不再補抓同日稍晚才公布的資券、借券、當沖與估值，導致本地資料庫出現大量「有日 K 與法人、但上市融資/借券/當沖/估值全為 `NULL`」的半殘交易日。
   - **歷史回補腳本漏接借券與當沖且未掛載美股/質押追趕**：日期驅動之歷史回補模組未納入 `TWT93U`（借券賣出）與 `TWTB4U`（現股當沖），且自動追趕任務在檢測到美股過期或每月 16 日董監質押更新時未實際呼叫對應同步程序。
   - **TDCC 集保與月營收僅抓單期快照、缺乏歷史序列回補**：台灣集保 OpenData (`id=1-5`) 每次僅提供當週最新 1 筆快照，月營收 OpenAPI 僅提供當月最新 1 筆申報；同步模組雖定義了歷史回補參數卻未實作 FinMind 歷史序列回補，導致新部署環境或初次查詢個股在 Card 19（TDCC 集保趨勢）僅有 1 週資料、Card 20（月營收）僅有 1 個月資料。

2. **ETF 與個股「資產型態多型性 (Asset-Class Polymorphism)」失配與解析器漏接，導致 `0050` 等主流 ETF 在 Card 19、20、21 資料空白**：
   - **ETF 每日淨值與折溢價解析器硬編碼 `a1[0]` 漏接 98% ETF**：證交所 `all_etf.txt` 將不同投信與類別的 ETF 分組存放於 `rawData.a1[0..N]` 陣列中，但現有解析器寫死僅讀取 `rawData.a1[0].msgArray`，導致 `a1[1]` 之後的所有主流 ETF（包含 `0050`、`0056`、`00878` 等近 200 檔）完全被丟棄，本地 `etf_daily_nav` 僅存 4 檔冷門標的。
   - **Card 20（ETF 資產規模與收益分配）三欄位斷路**：① 全系統未抓取或推算 ETF 資產規模（`aumBillion`），亦未傳入報表生成引擎，導致規模永遠顯示 `--`；② 平均年化殖利率僅讀取 `tw_valuation_daily`，但證交所 `BWIBBU_d` 個股本益比表天然不包含 ETF，且引擎未利用歷史配息與現價反推殖利率，導致殖利率永遠顯示 `--`；③ 近四季配息紀錄僅讀取 `corporate_action_calendar`（來源為 TWSE `TWT48U` **未來除權息預告表**，不含歷史已除息紀錄），導致 `0050` 的近四季配息為空陣列，而卡片 UI 又因集保受益人數存在而解除空狀態，直接渲染出下半部整塊黑底空白。
   - **Card 21（估值與殖利率量化矩陣）對 ETF 誤判為全空**：報表引擎判定 Card 21 是否為空的條件為 `!valuationData && !etfNav && !pledge`；由於 `0050` 無個股本益比、無董監質押，且因 `a1[0]` 解析 Bug 導致 `etfNav` 亦為空，加上未接通 ETF 總費用率（`etfExpenseRatio`）與配息反推殖利率，導致 `0050` 在 Card 21 直接落入「尚無估值數據」空狀態。
   - **Card 19（TDCC 集保趨勢）單筆資料幾何退化與 Card 09/15 欄位斷路**：當 TDCC 僅有 1 週資料時，`compareIndex = 0` 使最新週減去自己得出誤導性的 `+0.00%` 變動，且 SVG 長條座標鎖死在最左緣 `x = 20`、折線因單一頂點無法成線而消失；此外 Card 09 漏將 `dayTradeRate` 納入獨立向前回退與非空條件，Card 15 雖計算了融資與融券餘額卻未在 UI 渲染。

3. **全戰情室 272 處 `< 12px` 極限微字級、SVG 視口非等比壓縮二次坍縮與 4 欄窄網格擠壓，造成嚴重閱讀痛苦 (Micro-Typography, SVG Viewport Collapse & Low-Contrast Fatigue)**：
   - **微字級氾濫**：全戰情室 29 個元件中有 28 個元件廣泛使用 `0.58rem`（`9.28px`）至 `0.74rem`（`11.84px`）及 `9px ~ 11px` 的極小字體，共計 272 處，遠低於桌面端舒適閱讀視角下限。
   - **SVG 固定 `viewBox` 縮放二次坍縮與 `preserveAspectRatio="none"` 變形**：多維度雷達圖、風險蛛網圖與 TDCC 雙軸圖因容器高度受限，內部 `8 ~ 10.5` 的 SVG 字體被二次縮小至物理像素 **`6.88px ~ 10.0px`**；而主 K 線圖、AI 預測錐與 VWAP 成本結構圖因設定 `preserveAspectRatio="none"`，在桌機寬螢幕上產生近 **2 倍橫向拉寬與垂直壓扁** 的嚴重文字失真。
   - **Layer 6 四欄窄網格內嵌三宮格與低對比度暗字**：Layer 6 採 4 欄並排（`minmax(260px, 1fr)`），在標準視窗下每卡僅寬約 `300px`，內部（如 Card 21 估值矩陣）再切 3 欄使單格僅寬 `82px`；同時全區有 **63 處** 在深邃黑底（`#0B101B` / `#0f172a`）上使用 `#64748b` 暗灰字色，WCAG 對比度僅 `3.07:1 ~ 4.00:1`（未達 WCAG AA `4.5:1` 標準）。

---

## Solution

建構 **「主力戰情室 4.1 — 湖倉欄位級自癒同步引擎 (Column-Level Lakehouse Self-Healing)、資產型態多型感知 (Asset-Aware Card Polymorphism) 與零微字人體工學視覺規範 (Zero-Micro-Font Ergonomic Typography System)」**：

1. **欄位級湖倉新鮮度探針與半殘日自動自癒 (Column-Level Completeness Probe & Self-Healing Sync)**：
   - **7 大數據平面完好度向量檢查**：升級市場新鮮度服務，不再以單一 `daily_candles` 筆數代表當日同步完成，而是針對最近 5 個已結算交易日逐一查核 **日 K (`daily_candles`)、三大法人 (`foreign/trust/dealer`)、上市櫃融資融券 (`margin_balance`)、借券賣出 (`sbl_balance`)、現股當沖 (`day_trade_rate`)、每日估值 (`tw_valuation_daily`) 與 ETF 每日淨值 (`etf_daily_nav`)** 之有效筆數下限。只要任一子平面未達完好門檻（例如上市 TWSE 融資或估值筆數為 0），即標記 `isStale = true` 並附帶缺漏平面清單。
   - **精準補抓與歷史回補解鎖**：解除歷史回補模組對半殘交易日的盲目快取跳過，將 `TWT93U`（借券賣出）與 `TWTB4U`（現股當沖）納入按日歷史回補管線；並在自動追趕任務中補齊美股日 K 追趕與每月董監質押同步。
   - **TDCC 10 週歷史序列與歷史配息雙軌回補**：當本地湖倉中查詢標的之 `tw_tdcc_distribution` 少於 4 週、或 `tw_monthly_revenue` 少於 6 個月、或缺乏歷史近四季除權息紀錄時，透過後端或前端回補服務自動從公開歷史資料源（FinMind `TaiwanStockHoldingSharesPer` / `TaiwanStockMonthRevenue` / `TaiwanStockDividend` 或 Yahoo Finance 歷史除息）拉取時間序列並永久沉澱至本地 SQLite 湖倉。

2. **ETF 全分組淨值破局與卡片資產多型數據合流 (Full-Group ETF Ingestion & Asset-Aware Card Polymorphism)**：
   - **修復 `all_etf.txt` 全分組解析與規模/費用率映射**：修改 ETF 每日淨值解析器，完整遍歷 `rawData.a1[0..N]` 所有投信與資產類別分組之 `msgArray`（並支援上櫃 ETF），使 `0050`、`0056`、`00878`、`00679B` 等全市場 200+ 檔 ETF 100% 入庫 `etf_daily_nav`；同時建立主流 ETF 總費用率與資產規模（或由已發行受益權單位數 × NAV 動態推算）之領域映射。
   - **Card 20（ETF 資產規模與收益分配）自適應合流**：向報表生成引擎完整傳入 ETF 資產規模（`aumBillion`）、淨值（`etfNav`）與歷史配息（`corporateActions`）；當 `tw_valuation_daily` 無 ETF 殖利率時，自動以「近 4 季（或近 1 年）累計現金股利 ÷ 當前收盤價」動態推算年化殖利率；當標的確屬不配息 ETF 或尚無配息紀錄時，於四季配息區顯示誠實狀態提示而非空白黑塊。
   - **Card 21（估值與殖利率量化矩陣）ETF 非空解鎖**：修正 ETF 模式下之 `isEmpty` 判定，只要具備 `etfNav`（折溢價率）、`etfExpenseRatio`（總費用率）或年化配息率任一有效指標，即正常渲染三宮格與折溢價套利診斷。
   - **Card 19 單週幾何防禦與 Card 09/15 資券當沖閉環**：當 Card 19 僅有 1 筆集保紀錄時，將 4 週變動標記為「首週基準（待跨週比對）」而非 `+0.00%`，並將單柱置中、繪製水平基準參考線；修復 `marketCacheLoader` 與 `AiForceDashboardView` 對 `dayTradeRate` 的獨立向前回退與條件傳遞；在 Card 15 補齊融資餘額與融券餘額之清晰呈現。

3. **零微字人體工學排印系統、SVG 等比視口解放與 Layer 6 雙欄舒展 (Zero-Micro-Font Ergonomic Typography & 2x2 Grid Expansion)**：
   - **強制執行 `12px (0.75rem)` 物理字高硬底線**：全面掃除 `src/components/aiForceDashboard/` 下 28 個元件中的 272 處 `< 12px` 微字級。確立三階排印規範：輔助標籤/徽章/時間戳最小 `0.75rem ~ 0.8125rem` (`12px ~ 13px`)、卡片內文与指標名稱 `0.85rem ~ 0.875rem` (`13.6px ~ 14px`)、核心 KPI 數值 `1.1rem ~ 1.35rem` (`17.6px ~ 21.6px`)。
   - **消除 SVG 二次縮小與 `preserveAspectRatio="none"` 文字變形**：針對雷達圖（Card 03）、風險蛛網（Card 05）與 TDCC 雙軸圖（Card 19），收緊 SVG `viewBox` 外圍冗餘留白並調升內部 `fontSize`，確保容器縮放後的螢幕物理字高 $\ge 12\text{px}$；針對主 K 線圖（Card 01）、預測錐（Card 06）與 VWAP 成本圖（Card 07），解除文字隨 `preserveAspectRatio="none"` 的非等比橫向拉伸，確保座標軸與價格標籤維持 1:1 清晰字體比例。
   - **Layer 6 網格由 4 欄降密為 2×2 雙欄大視野矩陣**：將 Layer 6（Card 10·13 能量情緒雙子卡、Card 12 動態信號、Card 21 估值矩陣、Card 14 AI 信心度）由擁擠的 4 欄並排（`minmax(260px, 1fr)`）調整為與 Layer 2/3/5 一致的 **2×2 雙欄對稱矩陣（`minmax(440px, 1fr)`）**，使每張卡片可用寬度翻倍（`~300px` $\to$ `~680px`），徹底消除內部三宮格擠壓。
   - **WCAG 2.1 AA 對比度全面合規**：將深色背景上 63 處對比度不足（`3.07:1 ~ 4.00:1`）的 `#64748b` 次要文字，全面升級為 `#94a3b8` 或 `#cbd5e1`（對比度 $\ge 5.71:1$），並提升非活躍狀態之最低不透明度，實現零眼壓閱讀體驗。

---

## User Stories

1. As an ETF investor analyzing `0050`, `0056`, or `00878` in the Main Force War Room, I want the backend ETF NAV ingestion parser to iterate across all groups (`a1[0..N]`) of the official TWSE ETF feed rather than only `a1[0]`, so that `etf_daily_nav` stores real NAV and premium/discount rates for all 200+ Taiwan ETFs instead of only 4 obscure tickers.
2. As an ETF investor viewing Card 20 (ETF Adaptive View) for `0050`, I want to see the ETF's Assets Under Management (`aumBillion`), trailing annualized dividend yield (derived from official valuation or trailing 12-month cash dividends divided by current price), total beneficiaries, and the last 4 dividend distributions (backfilled from historical dividend records when upcoming announcements are empty), so that Card 20 is fully populated with actionable ETF intelligence instead of `--` and blank space.
3. As an ETF investor viewing Card 21 (Valuation & Yield Matrix) for `0050`, I want the card to activate its ETF mode whenever `etfNav`, `etfExpenseRatio`, or derived `dividendYield` is available—displaying real-time premium/discount rate, expense ratio, and annualized yield—rather than falsely falling into the "尚無估值數據" empty state because `BWIBBU_d` lacks stock PE/PB for ETFs.
4. As a user opening the app after 16:30 or on a subsequent day when an earlier sync only captured 15:00 candlesticks (`daily_candles`) and missed 16:30+ margin (`margin_balance`), SBL short (`sbl_balance`), day-trade (`day_trade_rate`), valuation (`tw_valuation_daily`), or ETF NAV (`etf_daily_nav`), I want the freshness probe to detect column-level incompleteness across the last 5 settled trading days and automatically self-heal the missing columns in the background.
5. As a user running historical backfill or viewing historical chips, I want the date-driven backfill pipeline to fetch both TWSE/TPEx margin/valuation and `TWT93U` (SBL short balance) / `TWTB4U` (day-trade rate) without skipping partially populated dates, so that historical SBL and day-trade metrics are never stuck at `NULL`.
6. As a trader inspecting Card 19 (TDCC Distribution Trend) for a symbol that currently has only 1 week of TDCC snapshot in SQLite, I want the system to automatically backfill up to 10 weeks of historical TDCC distribution when available, and if only 1 week exists for a newly listed security, I want Card 19 to center the single data point with a reference line and display an honest baseline badge instead of a misleading `+0.00%` 4-week change and an isolated bar stuck on the far-left edge.
7. As a short-term trader inspecting Card 09 (Day Trade Risk) and Card 15 (Chips Summary), I want `dayTradeRate` to independently fall back to the latest non-null settled record in `marketCacheLoader` and `AiForceDashboardView`, and I want Card 15 to visibly render the latest Margin Balance (`marginBalance`) and Short Balance (`shortBalance`) alongside Foreign Consecutive Days and SBL Balance.
8. As a desktop or laptop user reading the Main Force War Room for extended sessions, I want every single text label, badge, table cell, and footnote across all 21 cards and 5 task views to have a strict minimum font size of `12px` (`0.75rem`), eliminating all 272 instances of `9px ~ 11.8px` micro-typography.
9. As a user inspecting SVG charts (Card 01 K-Line, Card 03 Multi-Dimension Radar, Card 05 Risk Spider, Card 06 Forecast Cone, Card 07 VWAP Cost Structure, and Card 19 TDCC Trend), I want all chart labels and numeric callouts to render at a physical screen height of at least `12px` without horizontal stretching or vertical squashing from `preserveAspectRatio="none"`.
10. As a user scanning Layer 6 (Cards 10·13, 12, 21, and 14), I want the layout expanded from a cramped 4-column row (`~300px` per card) into a spacious 2×2 two-column grid (`minmax(440px, 1fr)`), so that 3-column sub-grids and diagnostic badges breathe naturally without text truncation or crowding.
11. As a user reading secondary labels, timestamps, and axis ticks on dark obsidian cards (`#0B101B` / `#0f172a`), I want all low-contrast `#64748b` text upgraded to `#94a3b8` or `#cbd5e1` (achieving WCAG 2.1 AA contrast $\ge 4.5:1$), so that no text appears muddy or requires squinting.

---

## Implementation Decisions

### 1. 湖倉欄位級完好度探針與半殘日自癒同步契約 (Column-Level Lakehouse Freshness & Self-Healing Sync Contract)
- **擴充 `checkMarketFreshness` 為 7 維欄位級完好度向量**：
  - 除檢查最新結算交易日之 `daily_candles`（台股 $\ge 1800$ 筆、美股 $\ge 5$ 筆）與三大法人買賣超外，新增查核最近 5 個台股已結算交易日之欄位覆蓋率：
    1. `twMarginComplete`: 當日 `tw_institutional_chips` 中具備非空 `margin_balance` 之上市櫃總筆數 $\ge 1500$（防止僅抓到上櫃 TPEx ~900 筆而漏掉上市 TWSE）。
    2. `twSblComplete`: 當日具備非空 `sbl_balance` 之筆數 $\ge 500$。
    3. `twDayTradeComplete`: 當日具備非空 `day_trade_rate` 之筆數 $\ge 500$。
    4. `twValuationComplete`: 當日 `tw_valuation_daily` 總筆數 $\ge 1500$（防止僅有上櫃而無上市 `BWIBBU_d`）。
    5. `twEtfNavComplete`: 最新結算日 `etf_daily_nav` 總筆數 $\ge 100$（防止僅有 4 檔冷門 ETF）。
  - 當任一維度未達標時，`checkMarketFreshness` 回傳 `tw.isStale = true` 與 `tw.incompleteDates: string[]`、`tw.missingPlanes: string[]`。
- **升級自動追趕任務 (`triggerCatchupTask`) 與按日歷史回補 (`backfill-tw-history-web`)**：
  - 當 `incompleteDates` 非空時，自動針對缺漏交易日呼叫按日回補程序，補抓該日之 `MI_MARGN`（融資融券）、`TWT93U`（借券賣出）、`TWTB4U`（現股當沖）、`BWIBBU_d`（個股估值）與 `all_etf.txt`（ETF 淨值）。
  - 在 `backfill-tw-history-web` 的快取跳過判定中，必須同時確認該日之 `marginCount >= 1500`、`sblCount >= 500` 與 `valuationCount >= 1500` 才允許跳過，根除半殘日永久鎖死。
  - 當 `freshness.us.isStale` 為真時，`triggerCatchupTask` 正式呼叫美股日 K 同步程序。

### 2. ETF 全分組淨值入庫、歷史序列按需回補與卡片多型合流契約 (ETF Full-Group Ingestion, Historical Series Backfill & Card Polymorphism)
- **修復 `parseTwseEtfNavResponse` 全分組解析**：
  - 遍歷證交所 `all_etf.txt` 回應中 `rawData.a1` 陣列的所有分組物件，提取每個分組內的 `msgArray` 並正規化代碼、收盤價、淨值與折溢價率寫入 `etf_daily_nav`，確保 `0050`、`0056`、`00878` 等所有分組之 ETF 100% 入庫。
- **单標的按需歷史序列補齊 (`on-demand series enrichment`)**：
  - 在 `/api/market/history/:symbol` 或前端湖倉載入管線中：
    - 若台股標的之 `tw_tdcc_distribution` 筆數 `< 4` 週，自動嘗試從 FinMind `TaiwanStockHoldingSharesPer` 拉取近 10 週資料寫入 SQLite 並回傳。
    - 若台股個股（非 ETF）之 `tw_monthly_revenue` 筆數 `< 6` 個月，自動嘗試從 FinMind `TaiwanStockMonthRevenue` 拉取近 12 個月營收寫入 SQLite 並回傳。
    - 若標的之 `corporate_action_calendar` 缺乏過去已除息紀錄（僅有未來預告或為 0 筆），自動合併歷史除息紀錄（來自 `TaiwanStockDividend` / Yahoo Chart Events / 內建權威基準庫），使 `corporateActions` 包含近 4~8 次歷史除權息紀錄。
- **Card 19、Card 20、Card 21、Card 09 與 Card 15 引擎與組件多型閉環**：
  - **Card 19 (`buildTdccDistribution` & `TdccDistributionCard`)**：
    - 當 `history.length === 1` 時，`change4WeeksRatio` 與 `change4WeeksShareholders` 設為 `undefined`（或標記 `isSinglePoint = true`），徽章顯示 `'首週基準建立'`；SVG 長條與圓點置於畫布水平中央 `x = chartWidth / 2`，並繪製一條貫穿畫布的水平基準虛線，不再鎖死於 `x = 20` 最左緣。
  - **Card 20 (`buildMonthlyRevenue` & `MonthlyRevenueCard`)**：
    - 擴充 `GenerateReportOptions.etfMeta`（或由引擎內建台灣主流 ETF 規模與費用率基準映射 + 動態計算），在 ETF 模式下填入 `aumBillion`；當 `valuationData?.dividendYield` 為空時，自動以近 12 個月（或近 4 季）`corporateActions` 現金股利總和除以 `currentPrice` 計算真實年化殖利率；若 `quarterlyDividends` 仍為空陣列，渲染結構化空狀態提示框而非空白區域。
  - **Card 21 (`valuationMetrics` & `ValuationMetricsCard`)**：
    - 修正 `isEmpty` 判定：當 `isEtfSymbol(symbol, name)` 為真時，只要 `etfNav`、`etfExpenseRatio` 或推算之 `dividendYield` 任一存在，即判定 `isEmpty = false`，完整展示折溢價率、總費用率與年化配息率。
  - **Card 09 & Card 15 (`marketCacheLoader`, `AiForceDashboardView`, `ChipsSummaryCard`)**：
    - 在 `marketCacheLoader` 對 `dayTradeRate` 獨立執行 `extractLatestAndDelta(sortedInst, r => r.dayTradeRate)` 向前回退，並在 `AiForceDashboardView` 組裝 `marginData` 的條件中加入 `lakehouseData.dayTradeRate !== undefined`。
    - 在 `aiForceDashboardEngine` 中，當 `options.marginData.sblBalance` 未提供時，從 `effectiveInstRecords` 向前回退尋找最新非空 `sblBalance`。
    - 在 `ChipsSummaryCard` 的台股籌碼區新增渲染 `marginBalance`（融資餘額）與 `shortBalance`（融券餘額）。

### 3. 零微字人體工學排印系統與視覺網格重構契約 (Zero-Micro-Font Typography, SVG Viewport & Grid Layout Contract)
- **全站戰情室字級硬底線（Minimum `12px / 0.75rem` Floor）**：
  - 在 `src/components/aiForceDashboard/` 所有 29 個組件中，全面禁止出現 `< 12px` 或 `< 0.75rem` 的字級設定（包含移除 `transform: scale(0.9)` 等間接縮小手段）：
    ```ts
    export const WAR_ROOM_TYPOGRAPHY_FLOOR = {
      captionMinRem: '0.75rem',     // 12px: 編號徽章、時間戳、座標軸刻度、輔助註腳
      labelMinRem: '0.8125rem',     // 13px: 指標標題、膠囊標籤、表格欄位名
      bodyMinRem: '0.875rem',       // 14px: 診斷內文、XAI 解讀、表格數值
      kpiMinRem: '1.125rem',        // 18px+: 核心大字指標
      minContrastSecondary: '#94a3b8', // 取代 #64748b，確保於 #0B101B 上對比度 >= 5.71:1
    } as const;
    ```
- **SVG 圖表等比視口與物理字高保障**：
  - **雷達圖 (`MultiDimensionRadarCard`) 與風險蛛網 (`RiskSpiderCard`)**：收緊 `viewBox` 四周空白邊距（或調升容器高度與內部 `labelFontSize >= 16`、`scoreFontSize >= 15`、`scoreDetailFontSize >= 14`），確保經容器縮放後的螢幕物理像素高度 $\ge 12\text{px}$。
  - **K 線圖 (`KLineChartCard`)、預測錐 (`ForecastConeCard`)、VWAP 成本結構 (`VwapCostStructureCard`) 與 TDCC 趨勢 (`TdccDistributionCard`)**：移除造成文字橫向拉寬 2 倍與垂直壓扁的 `preserveAspectRatio="none"`（或將圖表文字與純幾何路徑分離，路徑可自適應寬度而文字維持 1:1 比例與 $\ge 12\text{px}$ 字級）。
- **Layer 6 雙欄大視野矩陣 (`2x2 Grid Expansion`)**：
  - 在 `AiForceDashboardView.tsx` 中，將 `data-layer="6-energy-sentiment"` 的 `gridTemplateColumns` 由 `'repeat(auto-fit, minmax(260px, 1fr))'` 升級為 `'repeat(auto-fit, minmax(440px, 1fr))'`，形成與 Layer 2、3、5 對齊的 2×2 雙欄矩陣，徹底消除 `ValuationMetricsCard` 與 `EnergySentimentTwinCard` 的水平擠壓。
- **WCAG 2.1 AA 對比度全面升級**：
  - 將全戰情室 18 個元件中所有用於文字的 `#64748b` 替換為 `#94a3b8`（或 `#cbd5e1`），並將 `MainForceVerdictCard` 非活躍光譜階段的 `opacity: 0.45` 提升至 `0.75` 以上，確保所有可見文字 100% 符合 WCAG AA（對比度 $\ge 4.5:1$）。

---

## Testing Decisions

### 1. 什麼構成良好的測試 (What Makes a Good Test)
- **只測試公開介面縫隙的外部行為與可證偽不變量**：針對同步服務、引擎純函式與組件渲染輸出進行斷言，驗證真實輸入下的輸出資料結構、DOM 文字與無障礙/排印不變量，不依賴內部實作細節。

### 2. 受測模組與三大高階測試縫隙 (Modules Under Test & Three High-Level Test Seams)
1. **Seam 1：湖倉欄位級完好度探針與 ETF 全分組解析縫隙 (`market-freshness-service.cjs`, `ingest-macro-sentiment.cjs`, `vite-market-middleware.cjs`)**
   - 驗證當 `rawData.a1` 包含多個分組（`a1[0]`, `a1[1]`, `a1[2]`）時，`parseTwseEtfNavResponse` 能完整解析所有分組並包含 `0050` 與 `0056`。
   - 驗證當某交易日雖有 `1900` 筆 `daily_candles`，但 `margin_balance` 僅有上櫃 `900` 筆（缺上市）或 `sbl_balance` 為 `0` 筆、或 `etf_daily_nav` 僅有 `4` 筆時，`checkMarketFreshness` 準確回傳 `isStale: true` 與缺漏平面資訊。
2. **Seam 2：戰情室報表引擎與資產多型合流縫隙 (`aiForceDashboardEngine.ts`, `marketCacheLoader.ts`)**
   - 驗證 `0050`（ETF）在傳入 `etfNav` 或歷史配息 `corporateActions` 時，Card 20 (`monthlyRevenue.etfData`) 產出非空之 `aumBillion`、推算之 `dividendYield` 與 `quarterlyDividends`，且 Card 21 (`valuationMetrics.isEmpty`) 為 `false` 並具備 `etfPremiumDiscountRate` 與 `etfExpenseRatio`。
   - 驗證當 `tdccRecords` 僅有 1 筆時，`buildTdccDistribution` 不會產生誤導性 `+0.00%` 變動，且 `TdccDistributionCard` 將單點置中渲染。
   - 驗證 `marketCacheLoader` 在最新日 `day_trade_rate` 為 `null` 時能向前回退提取最近有效日之 `dayTradeRate`，且 `ChipsSummaryCard` 渲染融資與融券餘額。
3. **Seam 3：零微字人體工學、SVG 視口比例與 WCAG 對比度合規縫隙 (`AiForceDashboardView.tsx` & `cards/*.tsx`)**
   - 驗證 `src/components/aiForceDashboard/` 下全數 `.tsx` 組件源碼與渲染輸出中，0 處包含 `< 12px` (`< 0.75rem`) 之微字級與 `scale(0.9)` 縮小樣式，且 0 處包含 `#64748b` 低對比度文字色碼。
   - 驗證 SVG 圖表（Card 01, 03, 05, 06, 07, 19）之文字元素字級換算後物理高度 $\ge 12\text{px}$ 且無 `preserveAspectRatio="none"` 造成的文字扭曲。
   - 驗證 Layer 6 網格採用 `minmax(440px, 1fr)` 雙欄舒展配置，且所有既有組件 `data-testid` 與端到端互動測試 100% 綠燈通過。

### 3. 既有測試先例 (Prior Art)
- 延續 `src/engine/syncFuturesOiAndEtfNav.test.ts`、`src/engine/aiForceDashboardEngine.test.ts`、`src/components/aiForceDashboard/AiForceDashboardView.test.tsx` 與 `src/components/aiForceDashboard/cards/TdccDistributionCard.test.ts` 之單元與整合測試架構。

---

## Out of Scope

- 不引入需額外付費之商業授權數據 API。
- 不更動投資組合庫存、股息帳本或 Zavy 慢富工作區之計算邏輯。
- 不改變戰情室 21 張卡片的模組編號體系（`01` ~ `21`）與 5 大任務頁籤結構。

---

## Further Notes

- **領域模型同步 (`CONTEXT.md` & ADR 0238)**：本規格正式確立 **「Column-Level Lakehouse Completeness (湖倉欄位級完好度)」**、**「Asset-Aware Card Polymorphism (資產型態感知卡片多型)」** 與 **「Ergonomic Typography Floor (戰情室人體工學字級底線)」** 三大領域法則。
