# 0222 Spec: Zavy 慢富週期與配置工作區全鏈路真實數據驅動與既有引擎統一規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0222
* **標題：** Zavy 慢富週期與配置工作區全鏈路真實數據驅動與既有引擎統一 (Zavy Slow Wealth Workspace Full-Chain Real Data Pipeline & Existing Engine Unification)
* **目標版本：** v9.16.1
* **關聯 Issue：** #478 (<https://github.com/judragon005/stock-note/issues/478>)
* **關聯 Tickets：**
  - [#479](https://github.com/judragon005/stock-note/issues/479) (Ticket 01: 免 Key FRED 官方公開 CSV 備援與總經持久化擴充)
  - [#480](https://github.com/judragon005/stock-note/issues/480) (Ticket 02: 本地 SQLite tw_monthly_revenue 動態營收擴散指數與總營收年增率聚合)
  - [#481](https://github.com/judragon005/stock-note/issues/481) (Ticket 03: 台美市場結構寬度獨立定錨、權證剔除與 200MA 寬度修復)
  - [#482](https://github.com/judragon005/stock-note/issues/482) (Ticket 04: 台股融資去槓桿殘缺日過濾、0050 大盤回撤 Fallback 與動態布林/利空鈍化檢核)
  - [#483](https://github.com/judragon005/stock-note/issues/483) (Ticket 05: Zavy 決策引擎去偽存真與既有引擎統一)
  - [#484](https://github.com/judragon005/stock-note/issues/484) (Ticket 06: 前端 ZavySlowWealthWorkspace 全量假數據拔除、誠實空狀態與端到端驗收)
* **關聯架構決策：** [`docs/adr/0222-zavy-workspace-real-data-and-engine-unification.md`](file:///d:/APP/股票紀錄/docs/adr/0222-zavy-workspace-real-data-and-engine-unification.md)
* **規格狀態：** `APPROVED`
* **版本：** V1.0
* **建立日期：** 2026-11-10

---

## Problem Statement

在 Spec 0221 初版交付後，針對 `ZavySlowWealthWorkspace`（`🐢 慢富週期與配置`）進行端到端資料真實性與架構審查，發現頁面雖然具備完整的三層鏡頭 UI，但底層存在 **四大數據失真與重複造輪子問題**：

1. **鏡頭一（總經指南針）高度依賴前端寫死假常數，且未配置 API Key 時後端 FRED 數據全數歸零**：
   * 前端初始狀態硬編碼了 `usIsmPmi: 51.5`、`usNewOrdersMinusInventory: 2.8`、`twPmi: 53.8`、`twExportOrdersYoY: 11.5`，且 `loadLiveData()` 從未向後端讀取或更新這四個核心製造業指標，導致「台灣小車 vs 美國大卡車」輪動與週期階段永遠鎖死在固定劇本。
   * 後端 `ingest-macro-sentiment.cjs` 的 `fetchFredSeriesLatest` 在使用者未填寫 `FRED_API_KEY` 時直接回傳 `null`，未善用 FRED 官方免費免 Key 的公開 CSV 端點（`fredgraph.csv`），導致本地 SQLite `macro_sentiment_daily` 的 2Y 殖利率、10Y-2Y 利差、高收益債 OAS（真實值 `3.42%`）、CCC 級垃圾債利差（真實值高達 `13.17%` 信貸裂痕警戒）在無 Key 環境下全數為 `null`，前端只能靜默回退至假預設值（如 `7.8%` 安全假象）。
   * 專案 SQLite 湖倉內早已存有全台灣 1,957 家 4 碼上市櫃公司之真實月營收表（`tw_monthly_revenue`），卻未被用於動態計算台灣企業營收擴張擴散指數（Diffusion Index）與全市場營收年增率（YoY %）。
2. **鏡頭二（台美市場結構寬度與融資去槓桿）遭遇四大 SQL 統計污染與前後端斷線**：
   * **跨市場交易日聯集污染**：`getMarketMultiHorizonBreadth` 將台股與美股混於同一 `SELECT DISTINCT date ... LIMIT 200` 視窗，因台美休市日不同，單一市場在聯集 200 日內實際開盤僅 180~192 天，觸發 `cnt200 >= 200` 硬性門檻失敗，導致合格分母歸零、**`200MA (年線大趨勢)` 永遠顯示為 `0.0%`**。
   * **單筆跨日美股覆蓋台股母體**：當最新日（如 `2026-11-10`）僅有 1 檔美股而台股最新收盤在 `2026-11-05` 時，SQL `WHERE date = max_date` 直接將台股母體過濾為 `0 檔`，並自動 Fallback 顯示該唯一 1 檔美股之 `100% / 100% / 0.0%` 異常數據。
   * **4,660 檔 6 碼認購/認售權證污染台股寬度**：`daily_candles` 中符合數字開頭的台股包含 4,660 檔 `70xxxx`～`73xxxx` 權證（因時間價值衰減長期破線），將 2,333 檔普通股與 ETF 的真實 20MA 寬度（`15.3%`）稀釋為 `9.8%`；且後端回傳 `totalStocks` 與前端型別 `totalFilteredStocks` 脫鉤，造成畫面顯示「共 [空白] 檔」。
   * **融資去槓桿前後端脫節與殘缺日跳水**：前端 `marginStatus` 寫死 `-5.2% / -6.8% / 1.31` 且未宣告 `setMarginStatus`；後端大盤回撤死查不存在的 `^TWII`（0 筆）而未 Fallback 至現成 281 筆日 K 的 `0050`，且聚合 `tw_institutional_chips.margin_balance` 時未加 `HAVING COUNT(margin_balance) >= 1500` 過濾，把缺漏上市資料的殘缺日誤算為融資暴減 `-81.2%`（真實值為大盤 `0050` 回撤 `-6.00%`、融資減幅 `-1.97%`、去槓桿比率 `0.33` 尚未清洗充分）。
3. **中期修正落底核對表 (Bottoming Checklist) 硬編碼死常數**：
   * `zavySlowWealthEngine.ts` 在呼叫 `evaluateBottomingChecklist` 時硬編碼 `isAtBollingerLowerBand: false` 與 `isBadNewsDivergenceObserved: false`，完全未利用 SQLite 內現成的 `0050` / `SPY` 日 K 與專案既有的布林通道計算函數，導致落底就緒度永遠卡死。
4. **鏡頭三（A/B 雙軌配置）嚴重重複造輪子，未複用既有核心引擎**：
   * 專案內的 `rebalancingEngine.ts`（`calculateAssetClassRebalancePlan`）與 `monteCarloFireEngine.ts`（`calculateSlowWealthFireMetrics`）早已完整實作「股票質押優先還本金降槓桿 (`debtRepayment`)」、「含 `🔒` 設質股數鎖定防呆的四階減碼瀑布流 (`waterfallSellSuggestions`)」、「依低配缺口動態分配的股息活水導流計畫 (`dividendRedirectPlan`)」及「30 倍本金、Coast-FIRE 與前 10 年順序風險破產率模擬」。
   * 然而 `zavySlowWealthEngine.ts` 卻完全沒呼叫這兩個現成引擎，反而自己重複寫了一套寫死 `currentEquityWeightPercent: 80`、寫死匯率 `32`、寫死靜態股息字串且忽略質押借款 `LoanRecord` 的簡陋版死代碼。

---

## Solution

嚴格遵循 **「100% 使用專案內 SQLite 資料庫與外部免費免 Key API、零外部私有 CSV 依賴、KISS 原則、不重複造輪子」**，透過三層架構收斂與外科手術式重構，讓整個 Zavy 工作區成為 100% 真實數據驅動的決策系統：

1. **免費免 Key 外部總經管道 + 本地 SQLite 月營收動態聚合（消除鏡頭一假數據）**：
   * 擴充 `ingest-macro-sentiment.cjs` 的 `fetchFredSeriesLatest`：當未提供 `FRED_API_KEY` 時，自動 Fallback 至 FRED 官方免費免 Key 公開 CSV 端點（`https://fred.stlouisfed.org/graph/fredgraph.csv?id={SERIES_ID}`），確保在任何使用者電腦上皆能免 Key 自動抓回最新官方真實利率（`DGS10`、`DGS2`、`T10Y2Y`）、通膨（`CPIAUCSL`、`T10YIE`）、信用利差（`BAMLH0A0HYM2` 高收益債 OAS、`BAMLH0A3HYC` CCC 垃圾債利差）及美國普查局/聯準會官方製造業硬數據（`AMTMNO` 製造業新訂單 YoY、`AMTMTI` 製造業存貨 YoY、新訂單減存貨動能差、`INDPRO` 工業生產指數）並寫入 SQLite `macro_sentiment_daily`。
   * 於 `sqlite-db-core.cjs` 與 `/api/market/macro` 直接聚合本地 SQLite 現成資料表 `tw_monthly_revenue`（過濾 4 碼普通股），按標準擴散指數公式 `(YoY正成長家數 + 0.5 × 持平家數) / 總家數 × 100` 動態算出「台灣企業營收擴張擴散指數（Diffusion Index，50 為榮枯線）」與「台灣全市場總營收年增率（YoY %）」，作為台灣小車之真實基本面動能指標。
   * 移除 `evaluateMacroCompass` 中違反實證的 `(usPmi + twPmi) / 2` 算術平均與假信心度，改為基於真實台美擴散/新訂單動能與信貸利差的客觀規則判讀；若任何欄位無資料則誠實呈現 `--`，絕不硬編碼假數字。
2. **SQLite 多週期寬度、融資去槓桿與大盤布林/利空鈍化真實運算（消除鏡頭二與落底表假數據）**：
   * 重構 `sqlite-db-core.cjs` 的 `getMarketMultiHorizonBreadth(targetDate, db, options)`：
     * **市場獨立定錨與權證剔除**：台股與美股各自獨立查詢其最新有效交易日（當日有效標的數 `>= 100`）與專屬近 200 個交易日視窗；台股僅納入 4 碼普通股與 `00` 開頭 ETF（排除 6 碼認購/認售權證），200MA 合格門檻設為合理交易日下限（`Math.min(180, marketDates.length)`），並同時回傳 `totalStocks` 與 `totalFilteredStocks`。
     * **真實融資去槓桿計算**：於 `tw_institutional_chips` 聚合 `SUM(margin_balance)` 時加上 `HAVING COUNT(margin_balance) >= 1500` 排除未同步上市資料之殘缺日；大盤近 60 日最大回撤優先查詢 `^TWII`，若無則自動 Fallback 至資料庫內有完整歷史日 K 的代表性指數 ETF `0050`（美股為 `SPY`）。
     * **動態大盤布林下軌與利空鈍化檢核**：直接基於大盤代表標的（`^TWII` 或 `0050`）近 200 日收盤價，動態計算 60MA / 200MA 布林通道下軌（`MA - 2 × SD`）位階（是否觸及或接近下緣）與利空鈍化指標（近 5 日最低價未再跌破近 20 日最低價且回撤收斂），隨 `/api/market/breadth` 一併回傳並注入 `evaluateBottomingChecklist`，徹底消滅兩個 `false` 死常數。
3. **廢除重複造輪子，直接橋接專案既有 `rebalancingEngine` 與 `monteCarloFireEngine`（統一鏡頭三）**：
   * 由 `App.tsx` 將真實的 `usdToTwdRate`（即時美元匯率）與 `loans`（股票質押借貸帳本）傳入 `ZavySlowWealthWorkspace`。
   * 重構 `zavySlowWealthEngine.ts` 的 `generateTrackADecision` 與 `generateTrackBDecision`：
     * 刪除寫死的 `currentEquityWeightPercent: 80`、`usdToTwdRate = 32`、靜態股息文字與重複的資產加總迴圈。
     * 直接呼叫 `rebalancingEngine.ts` 的 `calculateAssetClassRebalancePlan`，取得真實當前股票佔比、股票質押優先還本金建議（`debtRepayment`）、含 `🔒` 設質股數鎖定防呆的四階減碼瀑布流（`waterfallSellSuggestions`）及動態股息活水導流計畫（`dividendRedirectPlan`）。
     * 直接呼叫 `monteCarloFireEngine.ts` 的 `calculateSlowWealthFireMetrics`，取得 30 倍年支出目標、Coast-FIRE 今日所需本金門檻與前 10 年順序風險（SRR）雙軌破產率對比。

---

## User Stories

1. **As a** 未申請外部付費或繁瑣 API Key 的一般使用者，**I want** 系統在同步宏觀數據時自動透過 FRED 官方免費免 Key 公開端點抓取美債 10Y/2Y 殖利率、10Y-2Y 利差、高收益債 OAS、CCC 級垃圾債利差、10Y 平衡通膨率與美國製造業新訂單/存貨年增率並存入本地 SQLite，**so that** 我打開 Zavy 工作區時看到的所有利率、信貸裂痕與美國製造業數據都是 100% 官方最新真實值，而非寫死的假預設值。
2. **As a** 觀察台灣小車領先動能的投資人，**I want** 系統直接從本地 SQLite `tw_monthly_revenue`（全市場 4 碼上市櫃公司真實月營收）動態計算「台灣企業營收擴張擴散指數（Diffusion Index）」與「全市場總營收年增率（YoY %）」，**so that** 在不依賴任何外部私人 CSV 檔案的情況下，任何使用者電腦都能從本地資料庫獲得真實的台灣企業基本面擴張數據。
3. **As a** 重視數據誠實性的使用者，**I want** 當某項指標在本地 SQLite 尚無紀錄且離線無法抓取時，UI 明確標示 `-- (尚無資料)` 與真實資料基準日（`As-Of Date`），**so that** 我不會被寫死的 `51.5 / 53.8 / 1.31` 假數字誤導投資決策。
4. **As a** 檢視台美市場結構寬度的投資人，**I want** 後端在計算 `20MA / 60MA / 200MA` 站上比例時，將台股與美股的交易日曆與最新結算日完全隔離，並自動剔除台股 6 碼認購/認售權證（僅統計 4 碼普通股與 `00` 開頭 ETF），**so that** 我能看到真實的台股全市場寬度（如 `15.3% / 20.2% / 25.2%` 與真實有效檔數 `2,333 檔`），徹底消除 `200MA = 0.0%` 與「共 [空白] 檔」的異常 Bug。
5. **As a** 觀察台股籌碼清洗度的投資人，**I want** 後端在計算近 60 日融資去槓桿比率時，自動過濾掉未同步完整之殘缺交易日（`HAVING COUNT(margin_balance) >= 1500`），並在無 `^TWII` 時自動以 `0050` 日 K 計算大盤波段最大回撤，同時將此真實結果直接連通至前端 `marginStatus`，**so that** 我能看到真實的融資去槓桿比率（如大盤回撤 `-6.0%`、融資減幅 `-1.97%`、比率 `0.33` 尚未清洗充分），而非永遠顯示寫死的 `1.31 清洗充分`。
6. **As a** 執行中期修正落底檢核的投資人，**I want** 落底核對表中的「季線/年線布林通道下軌位階」與「恐慌利空鈍化不破底」直接根據 SQLite 內的大盤代表日 K（`^TWII` 或 `0050` / `SPY`）動態計算，**so that** 落底核對表四項指標皆為 100% 真實市場狀態反應，不再因代碼硬編碼 `false` 而永遠無法觸發落底訊號。
7. **As a** 執行 A 軌風險預算與減碼調節的投資人，**I want** 系統支援切換不同市場壓力跌幅基準（標普 `-10%`、那指 `-15%`、台股/費半 `-20%`、中期修正 `-30%`），並直接複用 `rebalancingEngine` 計算我真實的當前股票佔比、股票質押優先還本金金額與包含 `🔒` 設質鎖定防呆的四階減碼清單，**so that** 我的風險調節建議完全貼合我的真實持倉與質押借貸帳本。
8. **As a** 執行 B 軌多資產配置與慢富退休規劃的投資人，**I want** 系統直接複用 `rebalancingEngine` 與 `monteCarloFireEngine`，根據我的真實美元匯率、持倉市值與現金股息計算「股息活水轉向公債/黃金之具體分配金額」與「30 倍本金 / Coast-FIRE / 前 10 年順序風險破產率降幅」，**so that** 系統內部保持單一真相來源（Single Source of Truth），不因重複造輪子而產生計算分歧。

---

## Implementation Decisions

1. **架構收斂與測試縫隙（Test Seams）**：
   * 本次修復與重構嚴格收斂於 **2 個既有公開測試縫隙**，不新增多餘中間層：
     1. **SQLite 湖倉與免費宏觀入庫縫隙（`sqlite-db-core.cjs` + `ingest-macro-sentiment.cjs` + `vite-market-middleware.cjs`）**：
        * 於 `ingest-macro-sentiment.cjs` 內建免 Key FRED CSV 解析備援（`fetchFredCsvObservations`）：當無 `FRED_API_KEY` 時，自動請求 `https://fred.stlouisfed.org/graph/fredgraph.csv?id={seriesId}`；支援計算 12 個月 YoY 年增率（用於 `CPIAUCSL`、`AMTMNO` 美國製造業新訂單、`AMTMTI` 美國製造業存貨、`INDPRO` 工業生產指數）。
        * 於 `sqlite-db-core.cjs` 執行無損冪等 `ALTER TABLE macro_sentiment_daily ADD COLUMN`，新增持久化欄位：`us_mfg_new_orders_yoy`、`us_mfg_inventories_yoy`、`us_orders_minus_inv_spread`、`us_industrial_prod_yoy`，並新增查詢函式 `getTwRevenueDiffusionAndYoY(db)` 從 `tw_monthly_revenue`（過濾 4 碼普通股）即時算出最新月份之 `twRevenueDiffusionIndex`（擴散指數）與 `twAggregateRevenueYoY`（全市場總營收年增率 %），由 `/api/market/macro` 統一回傳。
        * 於 `sqlite-db-core.cjs` 重構 `getMarketMultiHorizonBreadth(targetDate, db)`：
          * 依市場分類（台股：`LENGTH(symbol) = 4 AND symbol GLOB '[0-9][0-9][0-9][0-9]'` 或 `symbol LIKE '00%'`；美股：`NOT GLOB '[0-9]*'` 且非指數）各自定錨最新有效交易日（當日該市場有效筆數 `>= 50`，若測試環境總筆數較少則降級取該市場 `MAX(date)`）與各自的 200 日視窗。
          * 200MA 合格門檻設為 `Math.min(180, marketAvailableDates.length)`（相容長假與單市場交易日數，同時兼容單元測試小樣本）。
          * 融資去槓桿查詢 `tw_institutional_chips` 時，優先取 `HAVING COUNT(margin_balance) >= 1500` 之完整交易日（若測試環境筆數較少則 fallback 至無 HAVING 限制以保持測試相容），大盤回撤優先查 `^TWII`，若無資料則自動查 `0050`。
          * 基於大盤代表日 K（`^TWII` 或 `0050`）一併計算 60MA/200MA 布林通道下軌狀態 `isAtBollingerLowerBand` 與近 5 日未破 20 日低點之 `isBadNewsDivergenceObserved`，附於回傳物件中。
     2. **Zavy 慢富週期與雙軌決策引擎統一縫隙（`zavySlowWealthEngine.ts` + `ZavySlowWealthWorkspace.tsx`）**：
        * `generateZavyAnalysisReport` 擴充接收 `usdToTwdRate`、`loans`（`LoanRecord[]`）、`annualEstimatedDividendsTwd`、`isAtBollingerLowerBand`、`isBadNewsDivergenceObserved` 與 `stressScenarioDrawdownPercent`。
        * `generateTrackADecision` 與 `generateTrackBDecision` 內部移除重複的持倉加總與寫死的 `currentEquityWeightPercent: 80` / `usdToTwdRate = 32` / 固定 25 年折現，改為直接呼叫 `calculateAssetClassRebalancePlan` 與 `calculateSlowWealthFireMetrics`，將其真實計算結果映射至 `TrackADecision` 與 `TrackBDecision`。
        * `ZavySlowWealthWorkspace.tsx` 移除寫死的假預設數字，改為在 `/api/market/macro` 與 `/api/market/breadth` 回傳後完整更新 `macroSnapshot`、`marketBreadth` 與 `marginStatus`（含布林下軌與利空鈍化標記）。

---

## Testing Decisions

1. **測試原則（Testing Philosophy）**：
   * 遵循 TDD 紅-綠-重構（Red-Green-Refactor）循環，僅在上述兩個公開縫隙編寫測試，驗證外部可觀測輸入與輸出，不測試 React 內部私有 state。
2. **預計測試模組與案例**：
   * `scripts/market-sync/sqlite-db-core.test.cjs` & `ingest-macro-sentiment` 測試：
     * 驗證台股與美股交易日不同步或混入 6 碼權證代碼（如 `710001`）時，`getMarketMultiHorizonBreadth` 能正確剔除權證、獨立定錨台股最新有效交易日，且 `breadth200` 與 `totalFilteredStocks` 計算正確不歸零。
     * 驗證當 `^TWII` 無資料但 `0050` 有日 K、且某日 `tw_institutional_chips` 出現殘缺筆數時，能正確過濾殘缺日並以 `0050` 算出真實回撤、去槓桿比率、布林下軌與利空鈍化標記。
     * 驗證 `getTwRevenueDiffusionAndYoY` 能從 `tw_monthly_revenue` 正確算出 4 碼普通股之營收擴散指數與總營收 YoY。
     * 驗證 `fetchFredSeriesLatest` 在無 API Key 時能透過免 Key CSV 格式解析出最新值與 12 個月 YoY。
   * `src/engine/zavySlowWealthEngine.test.ts`：
     * 驗證 `generateZavyAnalysisReport` 真實串聯 `isAtBollingerLowerBand` 與 `isBadNewsDivergenceObserved`，不再寫死 `false`。
     * 驗證 A/B 軌真實反映傳入之持倉股票佔比（非寫死 80%）、`loans` 股票質押還款建議、設質鎖定四階減碼、真實匯率與 `calculateSlowWealthFireMetrics` 退休指標。

---

## Out of Scope

* 不讀取、不依賴任何位於專案目錄外的私人檔案（如 `D:\APP\諮詢\私人\慢富之路` 下的 CSV/JSON）。
* 不建立需要 Puppeteer / Playwright 繞過反爬蟲的脆弱網頁爬蟲。
* 不修改與 Zavy 工作區無關的其他工作區 UI 佈局。

---

## Further Notes

* 本規格旨在徹底償還 Spec 0221 初版遺留之「前端硬編碼假數據」與「引擎重複造輪子」問題，確保所有數據 100% 源自本地 SQLite 湖倉與外部免費免 Key API。
