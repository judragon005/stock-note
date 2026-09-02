# 規格書 #0022: 全歷史資產淨值 (NAV) 與資產成長折線圖系統 (Historical Portfolio NAV & Equity Curve)

- **狀態**：`READY_FOR_AGENT`
- **優先級**：`P1`
- **建立日期**：2026-08-25
- **標籤**：`Feature` · `Analytics` · `NAV` · `Visualization` · `TDD`

---

## Problem Statement

目前投資人雖然能透過系統掌握當前的持倉現值、已實現損益與摩擦成本，但無法回溯檢視從「最初投入至今」的整體資產淨值成長曲線。
1. **缺乏歷史時間軸走勢**：無法清楚得知各時間節點（如過去一個月、半年、一年或全歷史）投資組合在面臨牛熊市波動、持續加碼與除權息時的真實淨值變化。
2. **缺乏本金與槓桿對照**：無法直觀比較「總淨資產 (NAV)」與「累計投入本金 (Cost Basis)」的差距（即真正的複利超額價值），亦無法掌握借貸負債（如質押借款、融資）對總資產的槓桿影響。
3. **外部 API 流量與效能痛點**：若每次開啟圖表皆重新連線請求全歷史每日收盤價，將造成 API Rate Limit 耗盡、載入延遲與離線無法運作的問題。

---

## Solution

建立完整的「全歷史資產淨值 (NAV) 走勢折線圖」分析系統：
1. **精準 NAV 估值引擎**：
   $$\text{總資產淨值 (Total NAV)} = \sum \text{各標的持股市值} + \sum \text{現金帳戶餘額} - \sum \text{借貸負債餘額}$$
   $$\text{累計投入本金 (Net Invested Capital)} = \sum \text{外部入金} - \sum \text{外部出金}$$
2. **本地歷史日 K 快照與增量同步機制 (Local Historical Price Store)**：
   - 針對所有在庫持股與歷史曾持有（已平倉）標的，自其「最早交易日」起下載歷史日 K 收盤價與匯率，持久化存於本地儲存庫。
   - 後續僅針對缺漏日期執行增量同步（Incremental Sync），大幅降低 API 請求並支援離線流暢運作。
3. **多維度視覺化與互動圖表 (Portfolio Growth Chart)**：
   - 提供專屬全寬圖表頁面，支援疊加顯示「總淨值 NAV」、「累計投入本金」、「持股市值」、「現金水位」與「借貸負債」。
   - 支援 `1M` / `3M` / `6M` / `1Y` / `YTD` / `ALL` 週期縮放，以及懸停 Tooltip 顯示當日損益率與重要交易事件標籤。

---

## User Stories

1. 作為長期價值投資人，我想要檢視自第一筆交易起至今的「全歷史資產淨值走勢圖」，以便評估整體資產隨時間成長的複利成效。
2. 作為自律投資人，我想要在折線圖上同時看到「總資產淨值 (NAV)」與「累計投入本金」兩條曲線，以便直觀評估資產增長中有多少是來自本金投入、多少是來自市場超額報酬。
3. 作為多帳戶多幣別投資人，我想要系統能將美股與台股部位每日按歷史 USD/TWD 匯率統一折算為基準幣別，以便消除匯率雜訊並精確統計合併資產。
4. 作為有現金管理與質押借貸的投資人，我想要系統在計算歷史 NAV 時自動計入現金帳戶餘額並扣除借貸負債，以便真實反映個人淨資產。
5. 作為頻繁交易的投資人，我希望在圖表上懸停游標（Hover）時能看到當日的淨值金額、當日總報酬率（%）以及當日發生的重要交易事件（如加碼、除息、分拆），以便迅速回溯特定日期的操作脈絡。
6. 作為關注不同週期的投資人，我想要一鍵切換 `1M`、`3M`、`6M`、`1Y`、`YTD`、`ALL` 等時間區間，以便深入分析短中長期績效。
7. 作為注重隱私與離線體驗的使用者，我希望歷史日 K 數據能快取於瀏覽器本地，且每次開啟時僅需極少量的增量更新，以便在無網路或離線環境下依然能秒開檢視歷史資產圖表。
8. 作為重視資料完整性的使用者，在遇到遇休假日、國定假日或 API 暫時缺漏時，系統能自動沿用前一交易日已知收盤價補齊（Forward Fill），以便圖表連續不中斷。

---

## Implementation Decisions

### 1. 數據模型與型別擴充
- **歷史日 K 快照結構 (`HistoricalDailyPriceMap`)**：
  - 鍵值：`symbol` (如 `"2330"`, `"AAPL"`)。
  - 數值：日期對應收盤價字典 `Record<string, number>` (日期格式 `YYYY-MM-DD`)。
- **每日資產序列數據點 (`PortfolioDailySnapshot`)**：
  - `date`: `string` (`YYYY-MM-DD`)
  - `totalNAV`: `number` (持股市值 + 現金餘額 - 借貸負債)
  - `stockMarketValue`: `number` (持股總市值)
  - `cashBalance`: `number` (現金帳戶總餘額)
  - `loanBalance`: `number` (借貸負債總額)
  - `netCostBasis`: `number` (累計投入本金基準)
  - `cumulativeReturnPnL`: `number` (累計總報酬金額)
  - `cumulativeReturnPercent`: `number` (累計總報酬率 %)
  - `events`: `string[]` (當日交易與事件摘要)

### 2. 歷史回測與序列計算引擎 (`calculateHistoricalNavSeries`)
- **歷史持股狀態重播 (State Machine Replay)**：
  - 將所有 `TradeRecord[]` 按日期正序排序。
  - 從最早交易日期逐日迭代至最新日期，維護當日持股股數狀態、現金餘額、累計手續費/稅額與配息入帳。
  - 對於每一天，以當日歷史收盤價換算當日持股市值。
- **多幣別匯率換算**：
  - 查詢歷史日匯率表；若當日為休假日或缺漏則採用前一交易日匯率進行換算。

### 3. 本地儲存與增量更新策略 (`HistoricalPriceStore`)
- 採 LocalStorage / IndexedDB 儲存各標的歷史收盤價陣列。
- 同步時先檢查本地快取的 `lastUpdatedDate`，僅向 API 請求未獲取之日期區間，大幅降低 API 調用量。

### 4. UI 元件與互動設計 (`PortfolioGrowthChart`)
- 於工作區新增獨立「資產成長 / 歷史淨值 (Portfolio Growth)」分頁標籤。
- 採用高對比且符合色彩無障礙標準的漸層曲線，並配備週期切換按鈕群與 Tooltip。

---

## Testing Decisions

- **測試原則**：只針對計算引擎的公開介面進行單元測試（黑盒測試），驗證特定交易序列在給定歷史價格下的輸出序列正確性。
- **核心測試縫隙 (Test Seams)**：
  1. `calculateHistoricalNavSeries(trades, cashEntries, loans, priceHistoryMap, fxHistoryMap)`：
     - 驗證單純買進與持有（Buy & Hold）情境下隨股價波動的 NAV 計算。
     - 驗證部分賣出、實現損益結算與現金回補之正確性。
     - 驗證股票分割 (Split)、減資 (Capital Reduction) 與除息 (Cash Dividend) 當日的淨值連續性。
     - 驗證借貸負債增減對 NAV 的扣抵正確性。
     - 驗證多幣別部位依歷史匯率折算的穩定性。
  2. `HistoricalPriceStore` 增量同步邏輯：
     - 驗證有快取時僅抓取新日期的行為。
     - 驗證缺漏日期的 Forward Fill 補齊機制。
- **現有參照**：參照 [calculator.test.ts](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) 的測試風格。

---

## Out of Scope

1. **盤中每秒即時 Tick-by-Tick 估值**：歷史折線圖以日收盤價 (EOD) 為最小顆粒度，不提供分鐘級別歷史走勢。
2. **自動連線銀行/券商 API 抓取入出金**：出入金與借貸紀錄目前透過手動記錄或 CSV 匯入，不提供即時 Open Banking 自動同步。
3. **衍生性金融商品（期貨/選擇權）複雜定價**：暫僅專注於現股、ETF、特別股與可轉債。

---

## Further Notes

- 本規格為全歷史資產成長視覺化的標準基礎，完成後將解決使用者長久以來「無法回顧投資生涯複利成長軌跡」的核心痛點。
- 相關技術債 #0003（現金帳本與資產淨值系統）亦將於本功能中一併完成主要架構奠基。
