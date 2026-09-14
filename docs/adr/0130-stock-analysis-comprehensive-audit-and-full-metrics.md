# ADR 0130: 個股分析全量指標補齊、公開市場歷年股利串接與實盤體驗優化 (Stock Analysis Comprehensive Audit & Full Metrics Pipeline)

## 狀態 (Status)
已接受 (Accepted) - 2026-09-14

## 背景與問題陳述 (Context & Problem Statement)
在實盤操作驗收過程中，使用者指出個股深度分析工作區存在 5 大致命缺陷與實盤體驗落差：
1. **導航列認知混淆**：頂部一級導航列同時出現「個股分析」與「股票健診」，重疊且未收斂。
2. **健診二級選單切換失效**：左側「四大健診總覽」與「21項量化指標」點選無差異，未展現 21 項細部量化標準。
3. **財報負債與權益歸零**：台泥 (1101) 等標的因 FinMind 科目名稱別名差異，每股淨值與負債/權益數值全部為 0，且本機殘留殘缺快取。
4. **歷年股利誤讀個人記帳**：財報之「股利政策」誤讀使用者本地個人 `trades` 記帳資料（如僅顯示 2025 年 1000 元），而非公開市場上市公司歷年真實每股配息。
5. **總資產長條圖等高失真**：因缺乏動態 Baseline 浮動底線，4500 億至 6200 億之總資產柱狀圖在絕對零點下呈現齊平無起伏。
6. **23 個二級指標未串接黑屏**：營業費用率拆解、業外佔比、ROE/ROA 走勢、河流圖、借款結構等指標未實作 JSX 分支，點選呈現空白。

## 決策內容 (Decision)

1. **頂部一級導航徹底收斂與相容重定向**:
   - 自 `WorkspaceTabs.tsx` 中移除 `health` 分頁籤，由 `analysis`（個股分析）作為單一真理來源 (SSOT)。
   - 在 `App.tsx` 加入相容重定向路由，訪問舊網址 `activeTab === 'health'` 自動無痛映射至 `StockAnalysisWorkspace`。

2. **股票健診「21項量化指標」平鋪檢驗表**:
   - 二級導航切換至 `health_radar` 時，直接平鋪展開全量 21 項量化指標檢驗清單。
   - 完整展示指標名稱、通過狀態（綠勾/紅叉）、門檻條件、實測值與特許豁免（如金融股豁免存貨週轉），免開彈窗一覽無遺。

3. **FinMind 財報真實科目對齊與自癒平衡**:
   - 在 `src/engine/taiwanFinancialPipeline.ts` 中補齊真實別名：`Liabilities`、`Equity` / `EquityAttributableToOwnersOfParent`、`ShorttermBorrowings`、`LongtermBorrowings`。
   - 導入會計恆等式自癒平衡（$Assets = Liabilities + Equity$）。
   - 在 `financialReportService.ts` 之 `isFinancialRecordsCacheValid` 判定殘缺舊快取（有資產但權益與負債為 0）失效並自動遠端重撈自癒。

4. **公開市場上市公司歷年股利專屬服務 (`src/engine/dividendService.ts`)**:
   - 建立獨立的歷年股利抓取管線，串接 FinMind `TaiwanStockDividend` 資料集。
   - 精確解析現金股利（盈餘分配 + 法定公積）與股票股利，支援民國年容錯校準。
   - 導入 24 小時 TTL 與 `MAX_CACHE_ENTRIES = 100` 容量上限守衛（FIFO 淘汰），防止記憶體無限膨脹。
   - 個股分析加載時直接注入 `companyDividends`，徹底拔除讀取個人帳本 trades 之偏差。

5. **圖表高度動態 Baseline 浮動底線機制**:
   - 在 `AnalysisMetricView.tsx` 導入自適應動態底線縮放（$\text{baseMin} = \min \times 0.85$）。
   - 將 4500 億至 6200 億之總資產等數據之階梯起伏以 15%~100% 比例立體放大，使資產擴張趨勢一目了然。

6. **補齊 45 項二級指標視覺化**:
   - 費用率拆解 (`opex_breakdown`)、業外佔比 (`non_op_ratio`)、ROE/ROA 雙走勢 (`roe_roa`)、週轉能力 (`turnover_capability`)、現金股利發放率 (`dividend_payout`)。
   - 資本結構 (`capital_structure`)、利息保障倍數 (`interest_coverage`)、現金流量安全 (`cashflow_safety`)、盈餘再投資比率 (`reinvestment_rate`)。
   - 四大年增率 YoY 柱狀圖 (`gross_profit_growth`、`operating_profit_growth`、`net_income_growth`、`eps_growth`)。
   - 本益比/淨值比/殖利率河流圖 (`pe_river`、`pb_river`、`dividend_river`) 與軌道通道。
   - 長短期借款結構 (`debt_structure`)、現金轉換循環 CCC (`cash_conversion`) 與重大事件日曆。

## 成果與效益 (Consequences)
- **正面影響**:
  - 全站 93 個單元測試檔、909 項測試 100% 綠燈通過。
  - TypeScript 零錯誤，`npm run build` 成功完成生產環境打包。
  - 徹底解決個股分析頁面的 5 大痛點與 23 個黑屏子頁面，全量 45 項指標皆具備流暢數據展示與深色玻璃質感視覺。
  - 公開市場股利與個人記帳數據嚴格隔離，財務會計數據具備自癒防護。
