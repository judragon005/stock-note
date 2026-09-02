# ADR #0022: 全歷史資產淨值 (NAV) 與資產成長折線圖系統 (Historical Portfolio NAV & Equity Curve)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-25
- **標籤**：`Feature` · `Analytics` · `NAV` · `Visualization` · `Performance`

---

## 1. 背景與脈絡 (Context)

系統已具備完善的持倉現值、損益統計、券商分流與摩擦成本追蹤，但缺乏跨時間軸的歷史淨值（NAV）與資產成長走勢。投資人無法掌握投資組合在歷史波動下的累積報酬曲線，亦難以評估投入本金與負債槓桿對淨資產的影響。

---

## 2. 架構決策 (Decisions)

1. **總資產淨值 (Total NAV) 計算口徑**：
   $$\text{總資產淨值 (Total NAV)} = \sum \text{各標的持股市值} + \sum \text{現金帳戶餘額} - \sum \text{借貸負債餘額}$$
   $$\text{累計投入本金 (Cost Basis)} = \sum \text{外部入金} - \sum \text{外部出金}$$
2. **本地歷史價格快照與增量同步 (Incremental Sync)**：
   - 採用 LocalStorage 儲存歷史日 K 與歷史 USD/TWD 匯率字典。
   - `fetchSymbolHistoricalPrices` 比對本地快取日期區間，僅請求缺漏日 K 資料，大幅減輕 API 負擔。
   - 遇休市日、假日或 API 缺漏時，採用向前補齊（Forward-Fill）演算法無縫填充。
3. **回測重播引擎架構 (`calculateHistoricalNavSeries`)**：
   - 逐日重播交易買賣、股息入帳、股票分割/減資、現金出入金與借貸異動。
   - 計算各日 NAV、持股市值、現金水位、負債餘額、累計損益與當日漲跌幅。
4. **專屬視覺化元件與分頁 (`PortfolioGrowthChart`)**：
   - 於 `WorkspaceTabs` 新增獨立「資產成長 (NAV)」分頁。
   - 提供 5 條曲線勾選疊加、`1M`~`ALL` 週期篩選、ATH/MDD 指標卡與 Hover 十字準心。

---

## 3. 結果與影響 (Consequences)

- **優點**：
  - 歷史資產走勢完全離線可用，秒開且不依賴高頻外部請求。
  - 本金投入與資產成長雙線對照，清晰反映超額複利回報與槓桿負債狀態。
  - 100% 通過單元測試覆蓋，數學恆等式嚴格成立。
- **後續維護**：
  - 新增更多標的或手動點擊「同步日 K」即可快速完成增量補齊。
