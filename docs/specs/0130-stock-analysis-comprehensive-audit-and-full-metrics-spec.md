# 0130. 個股深度分析全量指標補齊、公開市場歷年股利串接與實盤體驗優化規格 (Stock Analysis Comprehensive Audit & Full Metrics Spec)

- **狀態**：Approved
- **建立日期**：2026-09-14
- **負責 Agent**：Antigravity Agent
- **關聯 PRD / Spec**：[0129](0129-stock-analysis-workspace-and-key-metrics-spec.md)
- **關聯 GitHub Issue**：[#61](https://github.com/judragon005/stock-note/issues/61)
- **目標分支**：`fix/61-stock-analysis-audit`

---

## 1. 需求背景與核心痛點 (Problem & Context)

在 V8.46.0（Spec 0129）初版上線後，經實盤多圖比對與深入審查，發現以下影響使用者體驗與數據正確性的嚴重問題：

1. **一級導航未完全收斂**：頂部導航列仍保留舊有的「股票健診 4大幫手」分頁，與新落地的「個股分析」造成導航重複混淆。
2. **二級健診選單無差異**：左側選單之「四大健診總覽」與「21項量化指標」點選後渲染一模一樣的卡片流，缺乏明確功能區隔。
3. **股利政策抓取個人帳戶交易**：目前錯誤讀取使用者自己的 `trades` 紀錄（呈現個人單筆 1000 元入帳），而非上市公司真正的歷年每股公開配發政策。
4. **財務報表每股淨值 (BVPS) 與負債為零**：FinMind API 欄位映射缺少 `Liabilities` 與 `Equity`，導致總負債與權益全部解析為 0，每股淨值也連帶算出 0。
5. **總資產規模變化柱狀圖高度失真**：由於未啟用動態 Baseline（以 0 為基準點），4500 億與 6200 億的高度佔比均在 72%~100% 間，在 200px 容器內肉眼看起來每根柱子一樣高。
6. **23 個二級指標未實作黑屏空白**：營業費用率拆解、業外佔比、ROE/ROA、經營週轉能力、股利發放率、財務結構比率、利息保障倍數、盈餘再投資比率、YoY 成長率（毛利/營益/淨利/EPS）、本益比河流圖、淨值比河流圖、殖利率河流圖、長短期借款等點進去均全黑空白。

---

## 2. 核心功能規格與架構設計 (Functional Specifications)

### 2.1 一級導航與二級選單收斂 (Navigation Architecture)
1. **頂部導航完全收斂 (`WorkspaceTabs.tsx` & `App.tsx`)**：
   - 徹底移除頂部導航列的「股票健診 (health)」頁籤，僅保留「📊 個股分析 (analysis)」。
   - `App.tsx` 加入相容重定向：若外部傳入或 LocalStorage 記錄 `activeTab === 'health'`，自動定向至 `analysis` 並預設切換至 `health` 分類。
2. **股票健診二級子項目明確區隔 (`StockAnalysisWorkspace.tsx`)**：
   - **【四大健診總覽 (`health_overview`)】**：維持 4 大卡片流（排除地雷股、定存股、成長股、便宜股）。
   - **【21項量化指標 (`health_radar`)】**：平鋪展開全量 21 項量化指標檢驗清單（含門檻條件、實測數值、綠勾「✔ 通過」、紅叉「✖ 未過」與產業豁免標籤），使用者無需手動打開彈窗即可一覽無遺。

### 2.2 公開市場歷年股利串接 (`dividendPipeline.ts`)
1. **上市公司歷年配息政策數據集**：
   - 串接 FinMind `TaiwanStockDividend`（台股）與 FMP 歷史配息 API（美股）。
   - 萃取每股現金股利 (`CashEarningsDistribution + CashStatutorySurplus`) 與股票股利 (`StockEarningsDistribution`)。
2. **股利政策視覺圖表 (`AnalysisMetricView.tsx`)**：
   - 渲染近 10 年上市公司每股歷年現金股利與股票股利堆疊柱狀圖。
   - 徹底廢除抓取使用者個人 `trades` 的錯誤記帳邏輯。

### 2.3 財務報表會計平衡與欄位對齊 (`taiwanFinancialPipeline.ts`)
1. **資產負債表欄位對齊**：
   - 補齊 `values['Liabilities']` 映射至 `totalLiabilities`。
   - 補齊 `values['Equity']` 與 `values['EquityAttributableToOwnersOfParent']` 映射至 `totalEquity`。
2. **會計恆等式互補自癒運算**：
   - 若 $TotalAssets > 0$ 且 $Equity > 0$ 但 $TotalLiabilities = 0$，自動補算 $TotalLiabilities = TotalAssets - Equity$。
   - 若 $TotalAssets > 0$ 且 $TotalLiabilities > 0$ 但 $Equity = 0$，自動補算 $Equity = TotalAssets - TotalLiabilities$。
3. **每股淨值 (BVPS) 走勢**：
   - 以 $TotalEquity / 股本$（或 FinMind BVPS）精確推算每季真實每股淨值。

### 2.4 動態 Baseline 柱狀圖縮放引擎 (`AnalysisMetricView.tsx`)
1. **Dynamic Baseline Range Mapping**：
   - 當數值全為正且最小值 $> 0$ 時，設定圖表底線 $Baseline = minVal \times 0.85$。
   - 柱高百分比公式：
     $$Height\% = Math.max(12, Math.min(100, \frac{value - Baseline}{maxVal - Baseline} \times 100))$$
   - 徹底拉大 4500 億至 6200 億之間的視覺起伏，呈現真實擴張階梯。

### 2.5 全量 45 項指標視圖實作補齊 (`AnalysisMetricView.tsx`)
1. **獲利能力全覆蓋**：
   - `opex_breakdown`：營業費用率走勢（研發/管理/銷售費用佔營收比）。
   - `non_op_ratio`：業外收支佔稅前淨利比率（衡量獲利含金量）。
   - `roe_roa`：股東權益報酬率 (ROE) 與資產報酬率 (ROA) 雙軌走勢圖。
   - `turnover_capability`：應收帳款週轉率、存貨週轉率、總資產週轉率對比。
   - `dividend_payout`：歷年現金股利發放率 (DPS / EPS)。
2. **安全性分析全覆蓋**：
   - `capital_structure`：負債比率 (Liabilities / Assets) 與股東權益比率。
   - `interest_coverage`：利息保障倍數 (EBIT / Interest Expense)。
   - `cashflow_safety`：自由現金流 (FCF) 與營業現金流對負債比。
   - `reinvestment_rate`：盈餘再投資比率。
3. **成長力分析全覆蓋**：
   - 毛利成長率 YoY、營業利益成長率 YoY、稅後淨利成長率 YoY、每股盈餘成長率 YoY 柱狀圖。
4. **價值評估全覆蓋**：
   - `pe_river` / `pe_valuation`：本益比河流圖通道 (5 條評價倍數帶) 與當前 PE 位階。
   - `pb_river` / `pb_valuation`：股價淨值比河流圖通道 (5 條 PB 區間帶) 與當前 PB 位階。
   - `dividend_river` / `dividend_yield`：殖利率河流圖帶與當前殖利率。
5. **關鍵指標全覆蓋**：
   - `debt_structure`：短天期借款 vs 長天期借款結構分佈。
   - `cash_conversion`：現金轉換循環 CCC (DSO + DIO - DPO) 走勢。

### 2.6 財務指標計算深度稽核與快取自癒防禦 (Calculation Integrity & Cache Self-Healing)
1. **快取自癒驗證器 (`financialCacheValidator.ts`)**：
   - 強化 `isFinancialRecordsCacheValid`：若總資產存在但所有季度的負債為 0 或權益為 0（舊版殘缺快取），立即判定無效並自動觸發遠端全量重撈自癒。
   - `StockAnalysisWorkspace.tsx` 右上角重新載入按鈕支援 `forceRefresh: true`，強制覆蓋本地毒害快取。
2. **三率同圖數值直觀化**：
   - `renderDualLines` 在每季雙柱頂端直接標註毛利率與營業利益率數值（綠色與藍色雙標籤）。
   - 圖表下方折疊提供「歷史各季數值明細對照表」，方便直接逐季逐年查閱。
3. **ROE / ROA 算式防呆**：
   - 移除 `eq || 1` 的除以 1 缺陷；若權益遺漏則由會計平衡補算，分母為 0 時安全鉗位回傳 0%，徹底杜絕 `134602400000%` 天文數字。
4. **真實流速動比率**：
   - 廢除 `totalAssets * 0.4 / (liab * 0.35)` 假公式。
   - 管線全面攝取 `CurrentAssets`（流動資產）與 `CurrentLiabilities`（流動負債）。
   - 流動比率 = `(流動資產 / 流動負債) * 100%`；速動比率 = `((流動資產 - 存貨) / 流動負債) * 100%`。
5. **盈餘再投資比率 (盈再率) 正規化**：
   - 資本支出 Capex 一律取絕對值正數。
   - 採過去 4 年 (16 季) 累積 Capex / 過去 4 年累積 NetIncome。
   - 若 4 年累計淨利虧損或為零，明確顯示 `虧損 N/A`，絕不可除以 1 爆出萬億百分比。
6. **動態每股淨值 (BVPS) 與利息保障倍數**：
   - 廢除寫死台泥股本 `7531181742`，改以動態股本或 `NetIncome / EPS` 反推流通股數，通用全市場。
   - 廢除寫死利息 5000 萬，改讀真實利息支出，無息時顯示 `>50x (無利息負擔)`。

---

## 3. 驗收標準 (Acceptance Criteria)

- [x] **AC 1 (導航收斂)**：頂部一級導航列無「股票健診」重疊分頁；訪問 `health` 自動導向 `analysis`。
- [x] **AC 2 (健診分流)**：「四大健診總覽」渲染 4 大卡片流；「21項量化指標」平鋪展開 21 項指標完整檢驗表，兩者切換有顯著不同功能呈現。
- [x] **AC 3 (公開股利)**：股利政策正確展示上市公司歷年真實每股配息（台泥近 5 年為 1.0、0.5、1.0、1.0、0.8 元），徹底杜絕 1000 元記帳偏差。
- [x] **AC 4 (財報負債與淨值)**：台泥 1101 每股淨值與負債結構圖正常顯示非零之億元與每股數值。
- [x] **AC 5 (總資產立體階梯)**：總資產長條圖起伏明顯，高低層次分明。
- [x] **AC 6 (零黑屏驗收)**：所有 45 項二級指標點選均有對應圖表、數值標籤與文字判讀說明，100% 無黑屏空白。
- [x] **AC 7 (測試與型別)**：全站單元測試 100% 綠燈，`npm run build` TypeScript 0 錯誤。
- [x] **AC 8 (三率數值圖面呈現)**：利潤比率圖表之柱頂完整展示各季毛利率與營業利益率數值，圖表下方附帶歷史季報數值明細對照表。
- [x] **AC 9 (ROE/ROA 數值校正)**：ROE 數值回歸正常百分比（台泥約 4.5% 年化），徹底杜絕千億百分比。
- [x] **AC 10 (財務結構比率正常)**：負債比率正常呈現 20 季走勢（台泥約 49%~50%），無全為零現象。
- [x] **AC 11 (真實流速動比率)**：流動比率（約 141%）與速動比率（約 121%）採用真實流動科目計算，杜絕假公式。
- [x] **AC 12 (盈再率虧損防呆)**：盈再率採用 4 年累積 Capex / 淨利，虧損期顯示「虧損 N/A」，排除萬億百分比。
