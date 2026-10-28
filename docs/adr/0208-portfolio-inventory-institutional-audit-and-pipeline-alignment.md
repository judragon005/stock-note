# 0208 ADR: 投資組合與庫存法人級會計修復、跨帳戶隔離、斷頭管線貫通與風控歸因升級 (Portfolio & Inventory Institutional Accounting Repair, Account Isolation, Pipeline Wiring, and Risk Attribution Upgrade)

## 狀態 (Status)

* **狀態：** `APPROVED`
* **決策日期：** 2026-10-28
* **關聯 Issue：** #342
* **對應規格書：** [`docs/specs/0208-portfolio-inventory-institutional-audit-and-pipeline-alignment-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0208-portfolio-inventory-institutional-audit-and-pipeline-alignment-spec.md)

---

## 脈絡與問題陳述 (Context & Problem Statement)

針對「投資組合與庫存」頁面執行 13 輪深度法務會計與法人實戰調研後，發現以下結構性問題：
1. **假常數與會計公式裂痕**：美股雙軸 FX 拆解寫死買入匯率 `32.0`；已平倉 (`CLOSED`) 標的因剩餘成本為 0 導致總報酬率恆顯示 `+0.00%`；`lotEngine` 漏處理 `ADJUSTMENT`、`SPIN_OFF`、`STOCK_MERGER`、`MARGIN_BUY/SELL` 且多批次配股減資缺乏尾差收斂；`receivableDividendEngine` 漏傳 `symbol` 參數致 75 行官方發放日表失效、除息後賣股蒸發應收股利、未除息 (`UPCOMING_EX`) 誤計入平滑補償；無借貸時將淨槓桿設為 `0.00x` 與公式矛盾，且漏計融資買進 (`isMargin`) 負債。
2. **多帳戶與多市場維度污染**：切換 `selectedAccountId` 時，XIRR、現金、負債、時間軸與批次明細彈窗未同步過濾；`ReconciliationModal` 未綁定 `accountId`；`rebalancingEngine` 因 `||` 條件寫反使 5% 容忍帶完全失效；`TradeModal` 將 `00679B` 等帶字母尾碼之台股 ETF 誤判為美股。
3. **斷頭管線與湖倉脫鉤**：`FrictionCenterModal`（二代健保與海外所得稅階預警）無開啟入口；`lookThroughEngine` 將一般個股硬塞為 `'台股投資標的'` 假字串；啟動快取未水合昨收價與歷史日 K。
4. **法人風控歸因與 UX 缺口**：缺乏持倉權重 `%`、今日損益基點貢獻 (`bps`)、HHI 集中度指數、整戶停損最大承擔風險 (`Capital-at-Risk`)，且 `HoldingsTable` 缺乏點擊排序、密度切換、隱私遮罩與時間軸就地編輯。

---

## 決策結果 (Decision Outcome)

遵循 KISS 原則與第一性原理，採納全數推薦方案：
1. **會計與雙引擎恆等校準**：引入 `historicalTotalInvestedCost` 作為已平倉與含已實現總報酬率分母；由 `historicalFx` 加權推導真實 `avgCostFxRate`；補齊 `lotEngine` 全交易型別與最後一批次尾差收斂；修復 `receivableDividendEngine` 四大時序與去重守衛。
2. **全鏈路範圍隔離與跨頁 NAV 對齊**：於 `App.tsx` 統一派生受 `selectedAccountId` 與 `currentMarket` 約束之資料流；將融資買進負債與待入帳應收股利納入整戶 NAV，並正名「股票淨曝險率 (`Net Exposure Ratio`)」消除 `0.00x` 跳變。
3. **救活斷頭管線與真實產業穿透**：於 `SummaryCards` 接通 `FrictionCenterModal` 入口；`lookThroughEngine` 串接 `stockDictionary` 真實產業別；修復 `rebalancingEngine` 容忍帶 `&&` 邏輯。
4. **內嵌法人四大風控指標與表格 UX 閉環**：不增加表格欄位寬度，以次行微字內嵌權重 `%` 與今日貢獻 `bps`；增設 HHI 集中度與停損最大風險 `Capital-at-Risk`；支援表頭排序、`[ 標準清爽 | 法人深研 ]` 切換、`[ 👁️ 隱私遮罩 ]` 與時間軸就地編輯。
