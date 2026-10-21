# 0198 Spec: 湖倉全量注水補全、定時排程節奏化與戰情室卡片視覺優化規格書

- **規格編號**：Spec 0198
- **標題**：湖倉全量注水補全、定時排程節奏化與戰情室卡片視覺優化
- **關聯 Issue**：#304 (https://github.com/judragon005/stock-note/issues/304)
- **關聯 ADR**：待對齊 (ADR 0198)
- **前置依賴**：Spec 0196 (受控聯網協議與 TPEx 估值管線)、Spec 0197 (次秒級秒開與度量衡校準)
- **建立日期**：2026-10-21
- **版本**：V1.0
- **狀態**：`READY_FOR_AGENT`

---

## 1. 問題陳述 (Problem Statement)

使用者在主力戰情室與系統各模組實戰操作中，識別出以下影響數據完整性、視覺體驗與日常維運負擔之核心缺陷：

1. **Card 21 估值卡於上市股票無數據（「尚無估值數據 2026-10-20」）**：
   - 使用者切換測試 1217（愛之味）等上市股票時，卡片 21 出現空狀態。
   - **根本原因**：`market_history.db` 內的 `tw_valuation_daily` 過去僅成功抓取 TPEx 890 檔（上櫃股票），TWSE 1,084 檔上市股票在庫筆數為 0。後端中介層雖具備「`ORDER BY date DESC LIMIT 1`」降級邏輯（無今日取前一日），但因歷史庫連一筆 1217 紀錄都沒有，導致查出依然為 `null`。
2. **戰情室 Layer 6 卡片高度侷促、文字擁擠**：
   - 包含【10·13 多空情緒】、【12 動態信號】、【21 估值矩陣】、【14 信心維度】的容器外層被硬編碼寫死為 `height: '250px'`，且 `EnergySentimentTwinCard` 內部亦設置了 `maxHeight: '250px'`。
   - 在 250px 限制下，多因子量化分數條、雙子共振條、估值位階條等資訊過度擠壓。使用者明確要求「**視覺高度應該要再高一些，不要再縮小字了，應該是要放大卡片的高度**」。
3. **卡片編號標示規則不統一**：
   - 右側卡片 14 採用純數字 `[14]`；但前三張卡片仍帶有英文字樣 `[CARD 10 · 13]`、`[CARD 12]`、`[CARD 21]`，視覺規範不一致。使用者要求統一改為純數字標示（如 `[10]`）。
4. **資料庫底座多張核心表格為 0 筆（有表無數據）**：
   - `corporate_action_calendar` (0 筆)：TWSE 除權除息 OpenAPI 舊端點已被官方改版導向 404，導致入庫中斷，前端 `/api/market/corporate-actions/:symbol` 取得 404/空陣列。
   - `macro_sentiment_daily` (0 筆)：已實作 FRED 與 CNN 抓取腳本，但從未排程執行。
   - `tw_insider_pledge_records` (0 筆)：已具備質押解析邏輯，但未執行全量入庫。
   - `etf_daily_nav` (0 筆)：缺乏 ETF 官方淨值與折溢價採集。
5. **排程脫鉤導致日常維護負擔**：
   - 目前 Windows 排程每日 16:00 僅單獨跑日 K 與籌碼，週五集保 (TDCC) 與每月營收未整合進排程；缺乏節奏化（每日/每週/每月）分流機制，導致使用者擔憂日後仍需頻繁大幅手動補資料。

---

## 2. 解決方案 (Solution)

恪守 **KISS 原則** 與 **第一性原理**，拒絕過度工程化，以極簡代碼完成全流程閉環：

### 2.1 視覺與佈局優化 (UI & Cards Layout)
1. **Layer 6 垂直空間擴增**：
   - 將 `AiForceDashboardView.tsx` 中 Layer 6 的四欄外層容器高度由 `250px` 擴大至 **`295px`**（增加約 18% 垂直高度）。
   - 解除 `EnergySentimentTwinCard.tsx` 內部的 `height: '250px'` 與 `maxHeight: '250px'` 寫死限制，讓內部元素自適應舒展，文字維持高清晰度易讀字級，不再擠壓。
2. **卡片標籤純數字化規範**：
   - 拔除 `CARD ` 前綴，將標籤統一為純數字徽章（`[10 · 13]`、`[12]`、`[21]`），並同步將 `TdccDistributionCard` (`[19]`) 與 `MonthlyRevenueCard` (`[20]`) 一併規範化。

### 2.2 湖倉一次性全量注水 (One-Time Bootstrap Backfill)
1. **除權除息預告正式連通**：
   - 修正 TWSE 官方除權除息預告端點為最新可用之 `https://www.twse.com.tw/rwd/zh/exRight/TWT48U?response=json`，全量寫入 `corporate_action_calendar`。
2. **宏觀指標全量注水**：
   - 執行 `ingest-macro-sentiment.cjs`，將 10 年期美債殖利率、10Y-2Y 倒掛利差、VIX、CNN 恐懼貪婪指數寫入 `macro_sentiment_daily`。
3. **董監質押全量注水**：
   - 介接全市場董監質押開放資料，全量沉澱至 `tw_insider_pledge_records`。
4. **全市場台股估值覆蓋**：
   - 確保 TWSE 1,084 檔與 TPEx 890 檔全量沉澱至 `tw_valuation_daily`（1217 愛之味 PE 14.92 / PB 0.63 / 殖利率 2.54%）。

### 2.3 極簡定時排程節奏化 (Cadence-Based Scheduled Sync)
不引入額外排程伺服器，利用現有每日腳本順路附掛：
1. **每日 16:00 台股排程 (`sync-tw-market.cjs`)**：
   - 順路同步 TWSE/TPEx 官方每日估值 (`tw_valuation_daily`)。
   - 順路同步最新已宣告除權除息預告 (`corporate_action_calendar`)。
   - 若為**每週五**（且 > 19:00），自動順路觸發 `runTdccIngestion`（集保千張大戶）。
   - 若日期為**每月 1~11 號**，自動順路觸發 `runMonthlyRevenueIngestion`（月營收）。
   - 若日期為**每月 16 號**，自動順路觸發 `ingestTwPledgeToDb`（董監事質押月報）。
2. **每日 08:00 美股排程 (`sync-us-market.cjs`)**：
   - 順路執行 `ingestMacroSentimentToDb`（美債/VIX/CNN 恐懼指數）。
   - 順路從 Yahoo quote 沉澱美股輕量估值快取。

---

## 3. 使用者故事 (User Stories)

1. 作為一名戰情室使用者，當我在搜尋框輸入「1217」（愛之味）時，我希望卡片 21 立即顯示其真實本益比 14.92、淨值比 0.63 與殖利率 2.54%，不再出現「尚無估值數據」的空白。
2. 作為一名視覺體驗導向的交易者，當我檢視戰情室第 6 層卡片時，我希望卡片具備足夠的垂直高度（295px），文字清晰不縮小、進度條不重疊，且卡片編號統一為簡潔的純數字（如 `[10]`、`[12]`、`[21]`）。
3. 作為一名長期投資者，當我開啟個股除權息日曆或現金流預測時，我希望系統直接從本地湖倉查出官方除權息日期與現金股利，不再面臨 404 斷層。
4. 作為一名系統維運者，我希望完成一次性資料庫補全後，日後完全依賴每日定時排程進行極簡增量更新，免去定期手動全量修補資料庫的繁瑣負擔。

---

## 4. 實作決策 (Implementation Decisions)

1. **戰情室高度擴增**：
   - 修改 `src/components/aiForceDashboard/AiForceDashboardView.tsx` 中 `data-layer="6-energy-sentiment"` 下的四個子容器：
     `height: '250px'` ➔ `height: '295px'`。
   - 修改 `src/components/aiForceDashboard/cards/EnergySentimentTwinCard.tsx`：
     移除 `height: '250px'` 與 `maxHeight: '250px'`，改為 `height: '100%'`。
2. **卡片標籤純數字化**：
   - `src/components/aiForceDashboard/cards/EnergySentimentTwinCard.tsx`：`CARD 10 · 13` ➔ `10 · 13`。
   - `src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx`：`CARD 12` ➔ `12`。
   - `src/components/aiForceDashboard/cards/ValuationMetricsCard.tsx`：`CARD 21` ➔ `21`。
   - `src/components/aiForceDashboard/cards/TdccDistributionCard.tsx`：`CARD 19` ➔ `19`。
   - `src/components/aiForceDashboard/cards/MonthlyRevenueCard.tsx`：`CARD 20` ➔ `20`。
3. **除權息資料來源修正**：
   - 修改 `scripts/market-sync/ingest-tw-corporate-actions.cjs`，將來源由已廢棄之 openapi 端點修正為 `https://www.twse.com.tw/rwd/zh/exRight/TWT48U?response=json`。
4. **一次性 Bootstrap 腳本封裝**：
   - 建立 `scripts/market-sync/bootstrap-lakehouse-full.cjs`，提供一次性全庫注水（補齊 TWSE 估值、除權息行事曆、宏觀情緒、董監質押）。
5. **排程節奏化串聯**：
   - 在 `scripts/market-sync/sync-tw-market.cjs` 與 `scripts/market-sync/sync-us-market.cjs` 結尾加入條件式附掛調用，實現自適應週期同步。

---

## 5. 測試決策 (Testing Decisions)

- **測試原則**：遵循 TDD 紅-綠-重構，聚焦於公開介面縫隙 (Test Seams)。
- **測試縫隙 1 (卡片標籤與高度測試)**：
  - 驗證 `ValuationMetricsCard.test.ts`、`DynamicSignalsCard.test.ts`、`EnergySentimentTwinCard.test.ts` 渲染包含純數字標籤 `21`、`12`、`10 · 13`，不含 `CARD ` 前綴。
- **測試縫隙 2 (中介層估值與除權息 API 縫隙)**：
  - 驗證 `viteMarketMiddleware.test.ts` 對 `/api/market/history/1217` 回傳有效之 `valuation` 物件（PE、PB、殖利率）。
  - 驗證 `/api/market/corporate-actions/2330` 成功回傳除權息陣列，非 404。
- **測試縫隙 3 (排程節奏化單元測試)**：
  - 編寫單元測試驗證排程在不同日期（週五、月初、月中 16 號）能正確觸發對應的附掛任務。

---

## 6. 排除範圍 (Out of Scope / Anti-Over-Engineering)

- ❌ 不建構龐大的分佈式排程器（如 Celery/Airflow），沿用 Node.js 原生腳本與 Windows 工作排程器。
- ❌ 不為冷門指標單獨發起多次重複 HTTP 請求，嚴格遵循「每日 16:00 順路批量帶回」原則。
- ❌ 不破壞既有資料庫 Schema，所有新增或補全皆以冪等 `INSERT OR REPLACE` 寫入。

---

## 7. 驗收標準 (Acceptance Criteria)

1. **1217 估值驗收**：主力戰情室切換至「1217」時，卡片 21 顯示真實估值數據（非「尚無估值數據」）。
2. **卡片高度驗收**：Layer 6 卡片垂直高度達到 295px，版面垂直舒展，字體不縮小，無裁切或擠壓。
3. **標籤格式驗收**：Layer 6 及關聯卡片之頂部標籤全數呈現純數字（如 `10 · 13`、`12`、`21`），徹底移除 `CARD` 英文字。
4. **資料表零空表驗收**：執行稽核後，`corporate_action_calendar`、`macro_sentiment_daily`、`tw_valuation_daily` 筆數皆大於 0。
5. **代碼與測試品質**：本地 `npm test` 100% 通過，TypeScript 0 報錯。
