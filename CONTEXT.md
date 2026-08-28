# 股票紀錄與分析儀領域模型 (Stock Tracker Context)

本文件定義美股與台股交易紀錄及投資分析儀之核心通用語言與邊界概念。

## 核心術語 (Language)

### 交易與標的 (Trade & Instrument)

**Security (標的資產)**:
在金融市場中可交易之股票或 ETF，包含代碼 (Ticker/Symbol)、市場類別 (台股 TW / 美股 US) 與計價幣別 (TWD / USD)。
_Avoid_: Stock, Item, Product

**Trade Record (交易紀錄)**:
單次買進或賣出行為之不可變歷史紀錄，包含交易日期、交易類別 (Buy / Sell / Dividend)、成交股數、成交單價、手續費 (Fee) 與稅費 (Tax)。
_Avoid_: Order, Action, Log

**Lot (持倉批次)**:
單次買進所形成的持股份額單元，包含取得時間、原始買進價格與剩餘股數。
_Avoid_: Batch, Package

### 成本與損益 (Cost & Profit/Loss)

**Moving Weighted Average Cost (移動加權平均成本)**:
標的每次買進時，依據「(既有總成本 + 本次買進總成本) / (既有股數 + 本次買進股數)」動態重新計算之單位持有成本。
_Avoid_: Simple Average, Flat Cost

**Realized PnL (已實現損益)**:
賣出標的時，依據成交總額扣除對應持倉成本與交易稅費後結算之損益淨額。
_Avoid_: Closed Profit, Historic PnL

**Unrealized PnL (未實現損益)**:
當前持倉依據最新市價或參考市價與加權平均成本計算得出之浮動損益與報酬率。
_Avoid_: Floating Profit, Paper Gain

**Total Cost Basis (總投入本金 / 成本基準)**:
當前有效持倉的累計投入成本總和（包含買進手續費）。
_Avoid_: Principal, Capital

### 多幣別與資產總覽 (Multi-Currency & Portfolio)

**Native Currency (原始計價幣別)**:
標的在所屬市場交易的法定貨幣（台股為 TWD，美股為 USD）。
_Avoid_: Local Currency, Base Unit

**Portfolio (投資組合 / 資產池)**:
使用者所持有所有美股與台股持倉、歷史交易與現金流的匯總實體。
_Avoid_: Account, Wallet

### 股息與收益率 (Dividend & Yield)  *(新增於 V1.1)*

**Dividend (股息 / 配息)**:
公司或 ETF 依據持股記錄日所支付之現金配息，以 `TradeRecord.type = 'DIVIDEND'` 記帳，金額記於 `price * shares` 欄位，稅費記於 `tax`。
_Avoid_: Coupon, Distribution

**Total Dividends (累計股息)**:
特定標的所有 DIVIDEND 紀錄的未稅配息總和。儲存於 `HoldingPosition.totalDividends`。
_Avoid_: Income, Yield Amount

**Yield on Cost, YoC (成本殖利率)**:
以累計股息除以總投入成本基準計算之報酬率，公式為 `totalDividends / totalCostBasis`。
反映持有期間從原始成本角度所獲得的真實股息回報效率。
_Avoid_: Current Yield, Dividend Rate

### 視覺化與主題 (Visualization & Theme)  *(新增於 V1.1)*

**Treemap (資產樹狀圖)**:
以矩形面積比例呈現各標的市值佔比、以色彩深度呈現未實現損益率的互動式資產分佈圖。
實作採用 Squarified 演算法，面積精確對應折算後市值（含匯率），色彩映射範圍為 ±40%。
_Avoid_: Heatmap, Block Chart

**ColorThemeMode (漲跌色彩主題)**:
控制漲跌顏色邏輯的枚舉型別，分為 `'taiwan'`（紅漲綠跌）與 `'international'`（綠漲紅跌）兩種模式。
透過 `data-color-theme` HTML 屬性與 CSS 變數 (`--profit-color`, `--loss-color`) 實現全域主題切換，並持久化至 `localStorage`。
_Avoid_: Theme, Color Mode

### 費率計算 (Fee Calculation)  *(新增於 V1.1)*

**Broker Fee Discount Rate (券商手續費折數)**:
台股券商依電子下單協議提供之手續費優惠折扣比例，如 `0.28` 表示 2.8 折（原始費率 0.1425% 的 28%）。
系統支援 2.8折 / 5折 / 6折 / 不打折 / 自訂五種選項。

**Minimum Fee Threshold (最低手續費門檻)**:
台股單筆交易手續費的最低收費下限，預設為 **20 元**（可由使用者停用）。
由 `calculateTaiwanFee(price, shares, discountRate, minFee)` 統一處理。
_Avoid_: Base Fee, Floor Fee

### 公司行動與歷史基準日 (Corporate Actions & Date Resolution)  *(新增於 V1.2)*

**Date Holding Resolution (歷史基準日時序持股回溯)**:
透過 `getHoldingsAsOfDate(trades, targetDate, symbol)` 函式，僅篩選 `date <= targetDate` 且按日期升序重播買賣、分割與減資，精確求出除權息或減資基準日時點的有效持股股數。

**Stock Dividend (除權配股 / 股票股利)**:
公司將盈餘以股票形式發放給股東。股數增加，總成本基準不變，加權平均成本自然稀釋。

**Stock Split (股票分割 / 拆股)**:
美股常見之股權分割行動（如 1 拆 10）。股數乘以分割倍數 `ratio`，總成本基準不變，每股成本等比例下降。

**Capital Reduction (減資 / 虧損減資 / 現金減資)**:
公司銷除股份。現金減資退款記入 `cashAmount`，直接從持有成本基準扣減（`totalCostBasis = max(0, totalCostBasis - refund)`）並累計至 `totalCapitalReturned`；虧損減資則僅銷除股數，成本不退款。

### 券商級精度與多幣別格式化 (Broker-Grade Precision & Formatting)  *(新增於 V3.8)*

**Broker-Grade Precision (券商級精度收斂)**:
依據真實證券商與集保結算所慣例執行數值運算與顯示：
- 台股 (TWD)：除息發放與帳面金額一律**無條件捨去至整數 (`Math.floor`)**，標示為 `NT$ X,XXX`。
- 美股 (USD)：除息發放一律**四捨五入至分 (`Cents`, 小數點後 2 位)**，標示為 `$X.XX USD`，徹底消除浮點數毛邊。
- 美股碎股支援 (Fractional Shares)：美股股數支援小數點後最多 4 位顯示。
_Avoid_: Generic Rounding, Default String Conversion

**Capital Increase (現金增資 / 認股)**:
股東按認購價格加碼認購新股。增加持股股數，並將認購總價款加計至總成本基準。

### 特殊公司行動與純線上掃描 (Special Corporate Actions & Live Scanner)  *(新增於 V1.3)*

**Full Market Live Corporate Actions Scanner (全市場純線上即時公司行動掃描器)**:
廢除離線假資料庫，串接台灣證交所 (TWSE) 官方減資預告表 (`TWT48U_ALL`)、除權息預告表 (`TWT49U_ALL`) 與 Yahoo Finance API（含多重 CORS 代理池），涵蓋台股上市/上櫃/ETF/債券與美股全市場，自每檔標的「最早買進日」自動掃描待補登之除權息與減資事件。

**Stock Merger (換股合併 / 股份轉換)**:
被收購或合併公司原股份註銷（持股歸零），按換股比率轉為收購方之新股份（`targetSymbol`），並將原標的全部投入成本平移至目標標的成本基準。

**Preferred Stock Redemption (特別股贖回 / 到期收回)**:
發行公司按約定面額或收回價以現金收回特別股。持股歸零，贖回現金與原始成本結算已實現損益。

**Spin-off (企業分拆獨立上市)**:
母公司將旗下事業分拆為新獨立公司（`targetSymbol`）。母公司股數不變，成本依分拆比例（如 20%）拆出；新子公司以拆出之成本基準與獲配股數建立新持倉。

**Convertible Bond Conversion (可轉債換股)**:
投資人將可轉換公司債 (CB) 依約定轉換價格轉為普通股股份。以債券原始投入本金作為新普通股之持股成本基準。

**Tender Offer (公開收購 / 私有化下市)**:
收購方以特定價格公開收購股東手中持股。依收購價全額結算賣出並結算已實現損益。

**Taiwan Stock Share Precision Rule (台股整數股數與精度規則)**:
台股市場（上市、上櫃、興櫃）最小交易與持有單位為整數 1 股（零股亦為正整數），不允許存在小數點股數（Fractional Shares）。所有除權配股、股票分割與減資縮股在計算與呈現時一律強制四捨五入取整數，消除浮點數漂移。

### 即時與延遲報價系統 (Real-time & Delayed Market Quotes)  *(新增於 V1.4)*

**Realtime & Delayed Quotes Engine (多源免費即時與延遲報價引擎)**:
純前端整合 Yahoo Finance API (v8/v7 Chart API) 與台灣證交所 (TWSE) 官方 OpenAPI 盤後收盤價備援。透過多節點 CORS 代理池自動輪詢與指數退避，全自動獲取台股（上市 `.TW` / 上櫃 `.TWO` / ETF）與美股（NYSE / NASDAQ / AMEX）之最新成交價、前一交易日收盤價 (`previousClose`)、當日漲跌額與漲跌百分比。

**Market Session Detection & Auto Refresh (交易時段判定與智慧自動輪詢)**:
由 `usePriceAutoRefresh` 自動判定台股交易時段（週一至週五 09:00~13:30 台北時間）與美股交易時段（美東時間 09:30~16:00 / 台北時間 21:30~04:00 夏令）。開盤期間每 60 秒背景自動輪詢刷新；休市期間停止輪詢以節省頻寬與代理額度；進站自動發起全持股同步。

**Manual Price Lock Shield (自訂價格手動鎖定防禦機制)**:
使用者在持股表格手動編輯特定標的市價時，系統自動將該標的標記為「自訂鎖定 (🔒)」。自動輪詢時跳過鎖定標的，保護使用者自訂之壓力測試或試算價格不被覆蓋，並支援一鍵點擊解鎖以恢復全自動市場報價追蹤。

**Quote Status Badge & Fallback Cache (報價狀態徽章與持久化快取降級)**:
表格即時呈現 🟢 盤中即時/延遲、🟡 昨日收盤價、🔒 自訂鎖定、⚠️ 離線快取四大狀態徽章與當日漲跌幅色塊。當網路斷線或代理超時時，平滑退回 `localStorage` 本地最後有效報價，確保離線狀態下系統計算與視覺化 100% 穩定可用。

### 美金台幣匯率自動更新與平滑備援 (Auto USD/TWD Exchange Rate & Fallback)  *(新增於 V1.5)*

**Auto Exchange Rate Engine (美金台幣純前端自動匯率引擎)**:
透過 Yahoo Finance API (`USDTWD=X`) 與多節點 CORS 代理池自動抓取最新盤中匯率、前一日收盤價 (`chartPreviousClose`) 與漲跌幅度。與即時行情機制（進站同步、開盤 60 秒輪詢、手動重整）完全同步更新。

**Exchange Rate Fallback Cascade (匯率多層平滑降級備援機制)**:
當網路斷線或 API 異常時，系統自動按階層降級：盤中即時價 ➔ 前日收盤價 ➔ LocalStorage 本地歷史快取 ➔ 基準預設值 (32.5)，確保美股折合台幣總市值計算 100% 穩定且平滑無中斷。

### 智慧掃描進度可視化與斷點接續 (Scanner Progress & Resume Architecture)  *(新增於 V1.6)*

**Rate-Limited Concurrency Pool (受控並行池與頻控)**:
掃描引擎採用 Promise Worker Pool (`concurrency = 3`) 並行處理多檔個股查詢，並在批次請求間注入 60~100ms jitter 微延遲，大幅縮短掃描時間同時防範 TWSE OpenAPI 與 CORS 代理限流。

**AbortSignal Interruption & Graceful Pause (原生中斷與優雅暫停)**:
完整整合原生 `AbortController`，使用者點擊中止或關閉彈窗時立即終止連線，並完整保留當前已完成個股的比對結果。

**Resume & Targeted Rescan (斷點接續與指定個股掃描)**:
透過 `symbolsToScan` 參數與未完成個股集合，支援精準自中斷處續掃，避免重複掃描已完成標的。

### 虛擬時序動態配股與高精準公司行動 (Virtual Holdings Timeline & Accuracy)  *(新增於 V1.7)*

**Virtual Cumulative Holdings Timeline (虛擬時序動態持股推進器)**:
在遍歷多個歷史除權配股或分割事件時，系統動態維護 `virtualTrades` 時序副本。每當前次配股成功產生變動股數時，即時累積進時序基準中，確保後續年度之除權配股（如 2890 永豐金歷年除權）以精確的累計在倉股數為計算基數。

**Floor New Ratio Capital Reduction (台股集保整數換發減資算法)**:
台股減資換發新股依規定向下取整 (`Math.floor(sharesHeld * newRatio)`)，零股折算現金退款。縮減股數嚴格計算為 `sharesHeld - newShares`，徹底杜絕浮點數四捨五入誤差（如泰銘 9927 減資縮減精確扣減 2,829 股）。

**Pre-Ex-Date Resolution (除權息 T-1 基準日在倉判定)**:
依證券交易法規，除權息當日買進之股票不享有當期除權息權益。智慧掃描嚴格以除權息基準日前一日 $(T-1)$ 收盤持股為在倉股數計算基數。

**Zero-Holding Shield (零持股平倉安全守護)**:
凡當前持股已全數平倉（0 股）之標的，歷史股票分割與除權配股自動標記為已結清 (`isAlreadyRecorded = true`)，嚴禁重複補登，杜絕已賣光標的死灰復燃。

---

## 📋 官方標的詞庫 (Security Reference Glossary)

依據使用者指定之排序規則（照片一順序：ETF/指數基金 ➔ 個股代號 ➔ 美股標的）呈現，並經官方證券資料庫驗證：

| 序號 | 標的代號 (Symbol) | 官方正式全名 / 基金名稱 | 市場 / 幣別 | 最終在倉目標 |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **00403A** | **主動統一升級50** | TW / TWD | 10,000 股 |
| 2 | **0050** | **元大台灣50** | TW / TWD | 20,415 股 |
| 3 | **00636** | **國泰中國A50** | TW / TWD | 10,000 股 |
| 4 | **00878** | **國泰永續高股息** | TW / TWD | 60,000 股 |
| 5 | **00919** | **群益台灣精選高息** | TW / TWD | 81,000 股 |
| 6 | **00923** | **群益台ESG低碳50** | TW / TWD | 5,847 股 |
| 7 | **00924** | **復華S&P500成長** | TW / TWD | 5,000 股 |
| 8 | **009816** | **凱基台灣TOP50** | TW / TWD | 10,000 股 |
| 9 | **00981A** | **主動統一台股增長** | TW / TWD | 5,000 股 |
| 10 | **009826** | **貝萊德世界股票** | TW / TWD | 5,000 股 |
| 11 | **2327** | **國巨** | TW / TWD | 600 股 |
| 12 | **2330** | **台積電** | TW / TWD | 700 股 |
| 13 | **2481** | **強茂** | TW / TWD | 400 股 |
| 14 | **2755** | **揚秦** | TW / TWD | 1,000 股 |
| 15 | **2883** | **凱基金** | TW / TWD | 410 股 |
| 16 | **2886** | **兆豐金** | TW / TWD | 26,000 股 |
| 17 | **2890** | **永豐金** | TW / TWD | 31,000 股 |
| 18 | **3715** | **定穎投控** | TW / TWD | 100 股 |
| 19 | **8105** | **凌巨** | TW / TWD | 10,000 股 |
| 20 | **9927** | **泰銘** | TW / TWD | 10,000 股 |
| 21 | **VT** | **Vanguard全世界股票ETF** | US / USD | 80.1333 股 |

---

## 🏛️ 架構決策紀錄索引 (Architecture Decision Records)

- [ADR-0001: 核心架構與會計模型](docs/adr/0001-core-architecture-and-accounting-model.md)
- [ADR-0002: V1.1 Squarified Treemap 資產樹狀圖與全域色彩主題系統](docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)
- [ADR-0003: V1.2 公司行動事件流與基準日持股時態解析](docs/adr/0003-v1.2-corporate-actions-and-date-holding-resolution.md)
- [ADR-0004: V1.3 全市場純線上即時公司行動掃描器與 5 大特殊公司行動會計核心](docs/adr/0004-full-market-live-corporate-actions-and-special-events.md)
- [ADR-0005: V1.4 全市場即時與延遲多源報價引擎、交易時段智慧輪詢與自訂價格鎖定防禦架構](docs/adr/0005-realtime-and-delayed-market-quotes-system.md)
- [ADR-0006: V1.5 美金台幣 (USD/TWD) 匯率自動更新、行情同步輪詢與多層平滑備援架構](docs/adr/0006-auto-usd-twd-exchange-rate-and-fallback.md)
- [ADR-0007: V1.6 智慧掃描公司行動進度可視化、受控並行與斷點接續架構](docs/adr/0007-scanner-progress-and-resume-architecture.md)
- [ADR-0008: V1.7 虛擬時序動態配股與台股減資整數換發架構](docs/adr/0008-virtual-holdings-timeline-and-corporate-action-accuracy.md)
- [ADR-0009: V1.8 持倉列表自然排序與證交所除權除息端點校正](docs/adr/0009-holdings-natural-sorting-and-twse-endpoint-correction.md)
- [ADR-0010: V1.9 技術債與改善建議分級歸檔架構](docs/adr/0010-technical-debt-management-architecture.md)
- [ADR-0011: V2.0 雙軌會計口徑計算模型與官方標的數據校正架構](docs/adr/0011-dual-accounting-mode-and-official-symbols-alignment.md)
- [ADR-0012: V2.1 券商手續費折讓率自訂與在倉成本校準架構](docs/adr/0012-broker-fee-discount-and-cost-basis-alignment.md)
- [ADR-0013: V3.0 多券商帳戶管理體系與交易摩擦成本分析架構](docs/adr/0013-multi-broker-account-and-friction-cost-engine.md)
- [ADR-0014: V3.1 活頁本工作台架構與券商手續費整併收斂](docs/adr/0014-tabbed-workspace-and-broker-fee-consolidation.md)
- [ADR-0015: V3.2 公司行動雙軌資料源、受控限速與本地代理防禦架構](docs/adr/0015-corporate-action-dual-pipeline-and-rate-limiting.md)
- [ADR-0016: V3.3 整合式設定工作台與外部 API Key 管理架構](docs/adr/0016-settings-workspace-and-api-key-configuration.md)
- [ADR-0017: V3.4 摩擦成本與稅率精準計算引擎升級](docs/adr/0017-friction-cost-and-tax-precision-engine.md)
- [ADR-0018: V3.5 歷史帳本稅費智慧拆分修復與雙幣別摩擦計算架構](docs/adr/0018-tax-fee-auto-repair-and-currency-engine.md)
- [ADR-0019: V3.6 投資組合三態檢視與已平倉績效評估架構](docs/adr/0019-closed-positions-and-portfolio-overview-views.md)
- [ADR-0020: V3.7 股息摩擦稅負與雙市場預扣稅追蹤架構](docs/adr/0020-dividend-tax-and-withholding-tracking.md)
- [ADR-0021: V3.8 介面版面互換與券商級貨幣顯示精度架構](docs/adr/0021-layout-swap-and-broker-grade-currency-precision.md)
- [ADR-0023: V4.0 現金帳本、真實交割週期 (T+2/T+1) 與股票質押風控系統](docs/adr/0023-cash-ledger-and-loan-leverage-system.md)
- [ADR-0024: V4.1 TradeModal 券商帳戶智慧連動與跨市場歷史資料自動校正](docs/adr/0024-trade-modal-broker-account-sync-and-historical-reconciliation.md)
- [ADR-0025: V4.2 現金帳本明細自訂分類與歷史交易原地編輯](docs/adr/0025-cash-ledger-categories-and-trade-history-editing.md)
- [ADR-0026: V4.3 已交割現金餘額即時計算與股票質押全額結清](docs/adr/0026-settled-cash-balance-same-day-sorting-and-loan-payoff.md)
- [ADR-0027: V4.4 現金流水帳自然日期排序、股息紀錄持久化與單一市場 NAV 範圍隔離](docs/adr/0027-cash-ledger-sorting-dividend-persistence-and-scoped-nav.md)
- [ADR-0028: V4.5 美股銀行家捨入法 (Banker's Rounding) 與台美雙市場會計精度嚴格隔離](docs/adr/0028-bankers-rounding-and-dual-market-precision-system.md)
- [ADR-0029: V4.6 歷史資產淨值 (NAV) 折線圖即時市價保底與自動日 K 補齊系統](docs/adr/0029-historical-nav-realtime-price-fallback-and-auto-sync.md)
- [ADR-0030: V4.7 券商級在途資金 (Funds in Transit) 與三層可用性購買力會計模型](docs/adr/0030-in-transit-funds-and-buying-power-ledger.md)
- [ADR-0031: V4.8 Code Review 全量重構、在途交割日曆全自動化與時序卡片模組化](docs/adr/0031-code-review-refactoring-and-settlement-automation.md)
- [ADR-0032: V5.0 IndexedDB 底層儲存遷移、ACID 事務與時光機快照體系](docs/adr/0032-indexeddb-storage-and-time-machine-snapshots.md)
- [ADR-0043: V5.7.2 機構級量化風控指標卡片懸浮雙層診斷與即時解讀系統](docs/adr/0043-quant-metrics-interactive-diagnosis-and-tooltips.md)
- [ADR-0044: V5.7.3 全專案「慣用紅綠漲跌」色彩模式統一與 CSS 變數體系全面連動](docs/adr/0044-color-theme-mode-unification-and-full-project-css-sync.md)

### 全專案色彩主題與慣用紅綠漲跌體系 (Color Theme Mode & CSS Unification) *(新增於 V5.7.3)*
- **Data-Color-Theme CSS 變數體系**：全專案統一使用 `var(--gain-color)` 與 `var(--loss-color)` 作為唯一損益/漲跌顏色事實來源，徹底杜絕各元件內寫死 Hex 色碼。
  - `taiwan` (台股慣用)：`--gain-color: #ef4444` (紅漲), `--loss-color: #10b981` (綠跌)。
  - `international` (國際慣用)：`--gain-color: #10b981` (綠漲), `--loss-color: #ef4444` (紅跌)。
- **中性資產 vs. 動態損益層次**：總資產淨值 (NAV) 與歷史最高 (ATH) 維持中性主題亮色；當日漲跌、全期累計總損益、XIRR、個股損益與 Alpha 超額回報嚴格即時連動變色。

### 交易員盤中當日損益與精確保本價 (Today's PnL & Breakeven Price) *(新增於 V5.2)*
- **Today's PnL (當日損益)**：個股層級依 `shares * (currentPrice - previousClose)` 計算今日變動金額；整戶層級跨市場折算台幣即時彙整，並於首頁總覽卡片與持股表格即時渲染。
- **Breakeven Price (精確損益平衡保本價)**：計入證券交易稅（現股 0.3% / 股票 ETF 0.1% / 債券 0%）、券商手續費折讓率與低消 20 元，進行離散階梯取整 (Floor) 閉環逆推，保證出清淨所得 $\ge$ 總成本基準。
- **Excess Capital Reduction (減資超額退款)**：退款超過持倉成本時，成本歸零，超額退款自動計入 `realizedPnL`。

### XIRR 不定期現金流年化報酬率引擎 (XIRR Performance Engine) *(新增於 V5.1)*

**XIRR / Money-Weighted Rate of Return, MWRR (內部報酬率 / 資金加權報酬率)**:
針對非定期定額、波段加碼與現金股利等不規則時間序列現金流，以非線性折現方程 $\text{NPV}(r) = \sum \frac{C_i}{(1+r)^{\frac{d_i - d_0}{365}}} = 0$ 求解出之真實年化複合報酬率。能精準衡量個人在資金配置與時點選擇上的真實口袋報酬，徹底消除傳統 Simple ROI 與 CAGR 被加碼本金稀釋的重大盲點。

**Hybrid Newton-Raphson & Bisection Solver (牛頓-二分法混合求解引擎)**:
以一階導數牛頓法（50 次迭代，容差 $10^{-7}$）為首選，遇奇異點或震盪時平滑降級至二分逼近法（$[-0.9999, 10.0]$），確保 100% 收斂不崩潰。

**30-Day Adaptive Smoothing Guard (30 天智能平滑防護)**:
當首筆金流距今 $< 30$ 天時，自動停用年化次方外推，以絕對累積報酬率呈現並標記非年化，避免短線極端外推失真。

**Multi-Level Cash Flow Decomposition (多層級現金流聚合與透視)**:
支援整戶總體 XIRR、單一標的含息 XIRR 與週期 XIRR（1M/3M/1Y/YTD/ALL），並提供深色玻璃擬態之明細診斷彈窗。

### IndexedDB 底層儲存與時光機快照體系 (IndexedDB & Time-Machine Snapshots) *(新增於 V5.0)*

**StockTrackerDB (原生 0 依賴 IndexedDB 儲存引擎)**:
以純原生 Promise 驅動封裝之瀏覽器結構化資料庫（版本 `v1`），建立 9 大 Object Stores（`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `snapshots`, `settings`）。徹底解除 5MB 容量上限與主執行緒同步阻塞。

**Non-Destructive Dual-Check Migration (無損平滑雙重保險遷移)**:
系統啟動時自動偵測遷移狀態；初次升級時自動將 `localStorage` 既有資料無損搬移至 IndexedDB，並保留原 `localStorage` 資料作為冷備份，達成 100% 零遺失風險。

**Time-Machine Snapshot & Restore (時光機全量快照與一鍵回滾)**:
在執行重大操作（CSV 批量覆蓋/合併、清空重置）前自動建立全量時間點快照（`SystemSnapshot`），保留最新 10 份自動輪替淘汰，支援手動命名、加鎖保護與一鍵覆寫還原。

**Full Database JSON Backup & Restore (全庫資料庫 JSON 匯出與匯入)**:
將 IndexedDB 全量資料庫以標準結構化 JSON 檔案形式完整導出或匯入還原，實現跨裝置、跨瀏覽器之冷備份遷移。

### 三層資金可用性與在途交割會計模型 (Tri-State Cash & In-Transit Accounting) *(新增於 V4.7)*

**Settled Cash (實質可用現金)**:
帳戶中已經實質交割入帳的資金總額（$\text{settlementStatus} = \text{'SETTLED'}$ 且 $\text{effectiveDate} \le \text{today}$），代表隨時可申請出金或提領之安全資金。

**Funds in Transit / Pending Settlement (在途資金)**:
處於交割週期中（台股 T+2、美股 T+1、未發放現金股息）但尚未完成銀行實質劃撥的款項。細分為「在途應收款 (Pending Receivables)」與「在途應付款 (Pending Payables)」。

**Trading Buying Power (即時交易購買力)**:
投資人當下可用於委託下單之最大額度。遵循券商風控：股票賣出當下立即釋放購買力，買進當下立即扣除購買力；未發放股利或電匯在途不提前計入購買力。

**Settlement Calendar & Lifecycle (交割日曆與生命週期)**:
提供混合雙軌模式：支援台美股避開週末自動推算預計交割日，並提供彈窗自訂覆寫與時序看板一鍵核銷。

### 持倉排序規範 (Holdings Sort Standard) *(新增於 V1.8)*

**Holdings Multi-Tier Sort (持倉雙階自然排序)**:
持倉清單展示嚴格遵循「台股優先、美股置底；同市場內依代碼字母數字升冪 (Natural Alphanumeric Sort)」之排序準則，確保如 `00403A`、`0050`、`00981A`、`2330`、`9927`、`VT` 之穩定清晰閱覽體驗。

### 持倉三態檢視與勝率戰績 (Position Views & Win Rate) *(新增於 V3.6)*

**PositionFilter (持倉三態過濾器)**:
包含 `'ACTIVE'`（持倉中）、`'CLOSED'`（已平倉）與 `'ALL'`（全部總覽）三種檢視維度。

**Closed Positions Summary & Win Rate (已平倉戰績與勝率統計)**:
針對持有股數已為 0 之標的，統計其歷史已實現總損益、累計入帳股利、勝率 % (獲利標的數 / 總清倉標的數)、賺賠比與代表性贏家/輸家標的。

**Re-entry Action (再次買入快速鍵)**:
針對歷史已平倉標的，提供一鍵預填代碼、名稱與市場之快速建倉通道。

### 股息摩擦稅負追蹤 (Dividend Friction & Withholding Tax) *(新增於 V3.7)*

**Second-Generation NHI Premium (台股二代健保補充保費)**:
單筆台股現金股利達 NT$ 20,000 元（含）以上就源扣繳之 2.11% 法定補充保費累計。

**US Dividend Withholding Tax (美股 30% IRS 預扣稅)**:
非美稅務居民持有美股標的配息由美國國稅局就源預扣之 30% 稅額累計（支援原幣 USD 與折合 TWD 雙軌展示）。

**Dynamic Friction Cards (市場感知動態摩擦看板)**:
設定工作區頂部發光看板依所選市場（TW/US/ALL）動態呈現對應之二代健保或美股預扣稅指標卡片。

### 全歷史資產淨值與時間序列 (Historical NAV & Time Series) *(新增於 V3.9)*

**Total Net Asset Value, Total NAV (總資產淨值)**:
$$\text{總資產淨值 (Total NAV)} = \sum \text{各標的持股市值} + \sum \text{現金帳戶餘額} - \sum \text{借貸負債餘額}$$
真實反映投資組合在扣除槓桿負債後的個人真實淨資產。

**Net Invested Capital, Cost Basis (累計投入本金基準)**:
$$\text{累計投入本金 (Cost Basis)} = \sum \text{外部入金} - \sum \text{外部出金}$$
或在無獨立現金帳本時，依歷史買入成本動態計算之本金階梯基準。

**Historical Price Forward-Fill (歷史行情向前補齊)**:
遇週末、國定假日、休市日或外部 API 短暫缺漏時，自動以「上一交易日已知收盤價」無縫填充，確保時間序列折線圖平滑不中斷。

**Incremental Price Sync (歷史日 K 增量同步)**:
僅比對本地快取中未收錄之日期區間發送歷史數據請求，大幅降低 API Rate Limit 調用並支援離線秒開。

**Max Drawdown, MDD (最大回撤) & ATH (歷史最高淨值)**:
衡量特定週期內資產淨值自峰值（All-Time High）拉回之最大跌幅百分比，作為投資風險控制之關鍵量化指標。

### 現金帳本、交割結算與股票質押風控 (Cash Ledger & Loan Leverage) *(新增於 V4.0)*

**Settlement Cycle (真實交割結算週期)**:
金融市場交易扣款與入帳的時間規則：
- 台股 (TW)：**T+2 交易日**（自動跳過週六與週日）。
- 美股 (US)：**T+1 交易日**（依美國 SEC 2024 年 5 月 28 日最新規則實施，自動跳過週末）。
系統支援 `⏳ 待交割 (Pending)` 與 `✅ 已交割 (Settled)` 雙狀態追蹤。

**Account Balance Reconciliation (真實現金餘額校正)**:
當歷史買進扣款使現金帳本餘額為負數時，透過使用者輸入交割戶現在的真實可用現金，系統自動回推差額 `diff = targetBalance - currentBalance`，自動補登一筆日期為最早交易日之 `DEPOSIT` 初始本金流水，使全站淨資產 (NAV) 與庫存市值精確對齊。

**Accrued Loan Interest (借貸累積應計利息)**:
質押借款自借款起日或上次繳息日起算之動態累計利息：
$$\text{計息天數 } D = \lfloor (\text{Today} - \text{LastInterestDate}) / 86,400,000 \rfloor$$
$$\text{應計利息} = \text{本金} \times \left( \frac{\text{年利率}}{365} \right) \times D$$
$$\text{預估月息} = \text{本金} \times \left( \frac{\text{年利率}}{12} \right)$$
$$\text{本利和應還款總額} = \text{本金} + \text{應計利息}$$

**Pledge Fees Breakdown (股票質押三大規費)**:
台灣證券商股票質押借款常見規費結構：
1. **Transfer Fee (撥券費)**：集保劃撥處理費，每檔股票預設 NT$ 100。
2. **Pledge Registry Fee (設質登記費)**：質權設定規費，預設 NT$ 100。
3. **Handling Fee (開辦/手續費)**：券商開辦或徵信管理費，預設 NT$ 0。
系統支援自動加總並於建立時一鍵在現金帳本扣除手續費。

**Market Scope Isolation (市場範疇隔離計算)**:
當全站切換至特定市場（如 `US 美股`）時，系統自動隔離資產、現金與借貸負債範疇。美股市場不計入台幣股票質押借款，確保美股借貸負債為 $0、LTV 為 0%、NAV 精準等於美股持股市值加美金現金。

### 現金收支全量類別與歷史交易單筆手動編輯 (Cash Ledger Categories & Trade Editing) *(新增於 V4.2)*

**Full Cash Flow Categories (現金收支全量 13 種分類)**:
支援包含外部入出金、活存利息、現金股息 (`DIVIDEND_PAYOUT`)、股票買進交割扣款 (`STOCK_BUY`)、股票賣出交割入帳 (`STOCK_SELL`)、減資退款 (`CAPITAL_RETURN`)、稅費扣除 (`TAX`)、借貸撥款 (`LOAN_DISBURSEMENT`) 與借貸還本 (`LOAN_REPAYMENT`)，並在提交時自動依據性質校正正負符號。

**US Dividend 30% Tax Auto-Withholding (美股股息 30% 預扣稅自動淨額對齊)**:
美股配息依美國稅法針對外國投資人扣除 30% 預扣稅。自動對齊交割款時，若交易未明列稅額，系統自動依 30% 折算淨額入帳，完美對齊嘉信理財 App 實質入帳金額與 DRIP 碎股自動再投資。

**Single Trade Record Manual Editing (歷史交易單筆手動編輯)**:
歷史交易帳本每筆明細均提供「✏️ 編輯」功能，開啟彈窗後自動回填所有欄位，保存後保持原 `id` 與 `createdAt` 更新，並即時連動刷新現金帳本與資產淨值 (NAV)。

### 實質已交割可用現金、同日金流雙向排序與質押規費整併 (Settled Cash & Loan Payoff Harmony) *(新增於 V4.3)*

**Settled Cash Balance vs. Pending Settlement (實質已交割可用現金 vs. 在途待交割款)**:
- **Settled Cash Balance (實質已交割可用現金)**：僅累計 `date <= today` 且 `settlementStatus !== 'PENDING'` 之款項，杜絕未來尚未發放之股息或尚未扣除之 T+2/T+1 款項虛增交割戶餘額。
- **Pending Settlement (在途待交割款)**：在帳戶卡片以黃色標籤清晰標註，並計算 `projectedBalance`（預計在途交割後淨餘額）。

**Bidirectional Same-Day Flow Sorting (同日金流雙向動態時間軸排序)**:
- 在「新 ➔ 舊 (DESC)」模式下：後發生的再投資買進交割扣款（較新）排在上方，先發生的股息入帳（較舊）排在下方。
- 在「舊 ➔ 新 (ASC)」模式下：先發生的股息入帳（較舊）排在上方，後發生的買進扣款（較新）排在下方。

**Unified Loan Payoff with Pledge Fees (質押還款總額含設質三大規費)**:
$$\text{當前應還款總金額} = \text{未還借款本金} + \text{當前應計利息} + \text{設質三大規費（撥券＋設質＋手續費）}$$
並將設質三大規費完整整併於黑色卡片內部，層次分明且防範規費重複加總。

### 銀行家捨入法、雙市場精度隔離與即時市價保底 (Banker's Rounding, Dual Market Precision & Price Fallback) *(新增於 V4.4 - V4.6)*

**Banker's Rounding (銀行家捨入法 / Round Half to Even / 奇進偶捨)**:
符合 IEEE 754 與美國證券會計 (US GAAP / Charles Schwab) 標準。當小數精確處於中間點 `.5` 時，向最接近的「偶數 (Even)」捨入（例如 $11.15 × 30% = $3.345 ➔ $3.34），徹底消除多筆交易累積之向上統計偏差。

**Dual Market Precision Model (台美雙市場會計精度隔離架構)**:
- **美股 (USD)**：全面套用 `bankersRound(val, 2)`，保留 2 位小數 (Cents)。
- **台股 (TWD)**：嚴格維持台灣集保/券商慣例之整數無條件捨去 (`Math.floor`)，兩大市場會計精度徹底隔離，互不干擾。

**Historical NAV Real-Time Price Fallback (歷史淨資產即時市價保底與自動日 K 補齊)**:
在歷史資產淨值折線圖中，若缺少歷史日 K 線資料，引擎自動優先以當前最新即時市價（如 VT $160.99）作為最新基準與 Fallback 補值，確保折線圖頂部的淨資產與獲利金額 100% 精準吻合庫存持股市值，並在切換至「資產成長」分頁時於背景平滑自動補齊歷史日 K。

### 多批次沖銷會計與稅務最佳化體系 (Lot-based Accounting & Tax-Loss Harvesting) *(新增於 V5.3)*

**Tax Lot (獨立買進批次)**:
每一次獨立買進股票所產生的批次記錄，包含買入日期、股數、單價與手續費成本基準。

**Accounting Method (沖銷會計方法)**:
決定當投資人部分賣出股票時，系統優先扣除哪一筆買進批次以計算已實現損益與稅負的演算法規則。
- **MOVING_AVERAGE (移動加權平均法)**：台灣券商預設模式，將所有在庫批次成本池化為單一平均每股成本。
- **FIFO (先進先出法)**：優先賣出「買進日期最早」的批次。美國 IRS 官方預設報稅標準。
- **LIFO (後進先出法)**：優先賣出「買進日期最新」的批次。在通膨與上漲行情中延後舊部位之資本利得稅。
- **HIFO (最高成本先出法)**：優先賣出「每股成本最高」的批次。為 Tax-Loss Harvesting (節稅收割) 首選策略。
- **SPECIFIC_LOT (指定批次沖銷)**：允許投資人手動指定沖銷批次與股數。

**Tax-Loss Harvesting (稅務虧損收割 / 節稅沖銷)**:
藉由主動賣出處於帳面虧損（或高成本）的批次來實現資本損失，用以抵扣同年度其他投資獲利，合法減少應繳資本利得稅。

**Long-Term vs. Short-Term Capital Gain (長短期資本利得判定)**:
自買進成交日至賣出成交日自然日天數 $\ge 365$ 天判定為長期持有（享有優惠稅率）；$< 365$ 天判定為短期持有。

**Weighted Average Holding Days (移動平均法加權平均持有天數)**:
在移動平均法下，依賣出當下在庫在席所有買進批次的剩餘股數比例加權計算出的平均持有天數，並作為長短期資本利得判定的標準依據。

**Residual Balance Deduction (浮點數剩餘差額扣除法)**:
在對在庫多批次依比例扣減股數時，對最後一筆批次採用剩餘差額扣除，確保總扣除股數精確守恆，徹底杜絕 IEEE 754 浮點累積漂移與碎股殘留。

---

### 量化風控、總曝險與質押壓力測試 (Quantitative Risk, Leverage & Margin Stress) *(新增於 V5.4)*

**Gross Exposure (總資產曝險額)**:
當前所有持有股票與證券資產的市場總現值，代表暴露在市場價格波動下的總資本規模。

**Net Asset Value, NAV (帳戶淨資產)**:
總資產（股票現值 + 現金餘額 + 應收在途款）扣除總負債（質押借款 + 融資負債 + 應付在途款）後之真實投資淨身家。

**Net Leverage Ratio (淨槓桿率)**:
計算公式為 `(總股票市值 - 可用現金) / 淨資產 NAV`。衡量扣除防守現金後，帳戶真實承擔的市場槓桿倍數。`1.0x` 為無槓桿，`>1.0x` 代表融資或質押借款買股。四級燈號劃分：
- `CONSERVATIVE` (≤1.0x): 🟢 穩健無槓桿
- `MODERATE` (1.0x~1.3x): 🔵 溫和槓桿
- `ELEVATED` (1.3x~1.6x): 🟡 積極擴張
- `HIGH_RISK` (>1.6x 或 NAV≤0): 🔴 極度危險

**Collateral Maintenance Ratio (擔保品維持率)**:
計算公式為 `(擔保品股票總市值 / 質押借款總額) * 100%`。台灣法規規定跌破 130% 將觸發券商追繳通知 (Margin Call)。

**Max Drop Tolerance to Margin Call (斷頭最大耐受跌幅)**:
質押標的從當前價格計算，距離觸發 130% 斷頭追繳線所能承受的最大下跌百分比：
$$\text{Max Drop Tolerance} = 1 - \frac{1.30 \times \text{Total Loan}}{\text{Current Collateral Value}}$$

**Required Margin Call Cash (追繳補足現金款逆運算)**:
在特定壓力下跌情境下，若維持率低於安全或追繳目標時，系統精確反推需立即匯入的現金保證金金額：
$$\text{Required Cash} = \max\left(0, \text{Total Loan} \times \frac{\text{Target Ratio}}{100} - \text{Stressed Collateral Value}\right)$$

**Weighted Holding Days & Cycle (加權持股天數與策略週期)**:
依據各批次之買進成本加權計算持有天數，劃分為：
- `ULTRA_SHORT` (<7天): ⚡ 超短線
- `SHORT_TERM` (7~30天): 🚀 短線波段
- `MEDIUM_TERM` (31~180天): 📈 中期波段
- `LONG_TERM` (181~364天): 💎 長線存股
### Tooltip 邊界防溢出與對齊引擎 (Tooltip Boundary Overflow Prevention & Alignment Engine) *(新增於 V5.5.1)*

**Boundary Overflow Prevention (容器邊界防溢出)**:
在存在 `overflow: hidden` 或 `backdropFilter` 的深色玻璃卡片容器內，透過精確的方向 (`position`) 與對齊方式 (`align`) 幾何運算，防止氣泡向上或向右超出容器視窗邊界而遭截斷。

**Tooltip Alignment Matrix (提示氣泡多維對齊矩陣)**:
支援 `align="center" | "left" | "right"` 屬性：
- `position="bottom" && align="right"`：氣泡靠右定位於 `top: calc(100% + 8px), right: 0`，本體向左側寬闊區域展開，指示箭頭依 `8px` 內縮精準指向觸發圖示，徹底杜絕邊緣裁切。

### 法定國定假日休市日曆與精確交割結算引擎 (Statutory Holiday Calendar & Settlement Precision Engine) *(新增於 V5.6.0)*

**Market Holiday Calendar (市場法定休市日曆)**:
內建 2023～2030 年台股 (TWSE/TPEx) 與美股 (NYSE/NASDAQ/SIFMA) 完整休市日期常數表 (`TW_MARKET_HOLIDAYS` / `US_MARKET_HOLIDAYS`)。收錄春節農曆封關、國定紀念日、公務補班日證券休市規則，以及美股 10 大聯邦節日。

**Business Day Resolution (有效營業日推算)**:
透過 `isBusinessDay(dateStr, market)` 純函式，同時排斥「週末公休日」與「法定休市假日」，作為交割週期計算之原子單位。

**Settlement Calendar Precision (長假交割時態精確性)**:
升級 `calculateSettlementDate(tradeDateStr, market)`，在台股 T+2 與美股 T+1 交割計算中嚴謹以有效營業日累進。確保在春節封關（連續休市 7~11 天）或國定長假期間，在途款不提前結算為可用現金，徹底解決現金帳本時態失真。

---

### 交易計畫紀律、盤中風控觸價與大盤量化基準體系 (Trade Discipline, Risk Alerts & Quant Benchmark) *(新增於 V5.7.0 / V5.7.1)*

**Trade Plan (事前作戰計畫)**:
主動交易員在建倉前所設定的結構化交易假說，包含 `entryReason`（進場理由）、`stopLossPrice`（預設停損價）、`takeProfitPrice`（預設停利目標價）與 `plannedRiskRewardRatio`（預期風報比）。

**Trade Review (賽後紀律覆盤)**:
平倉結算後針對該筆交易執行成效之量化覆盤評鑑，包含 `isPlanFollowed`（是否遵守計畫）、`disciplineScore`（1~5 顆星紀律評分）、`mistakesMade`（犯錯分類標籤：追高、凹單、過早止盈、情緒重押、無計畫）與 `lessonsLearned`（心得筆記）。

**Risk Alert Status & Badge (盤中 5 大風控觸價狀態)**:
由 `evaluateRiskStatus(currentPrice, stopLossPrice, takeProfitPrice)` 動態判定之持股狀態：
- `STOP_LOSS_TRIGGERED`: 🚨 觸及停損 (現價跌破預設停損線，紅底呼吸閃爍)
- `TAKE_PROFIT_TRIGGERED`: 🎯 達標停利 (現價達到或超越目標價，綠底徽章)
- `NEAR_STOP_LOSS`: ⚠️ 逼近停損 (現價距離停損價 $\le 3\%$ 警戒緩衝區，橘黃底)
- `NEAR_TAKE_PROFIT`: 💡 逼近停利 (現價距離停利價 $\le 3\%$ 達標緩衝區，青藍底)
- `NORMAL`: 正常持倉

**Offline Benchmark Data Engine (100% 離線本地大盤基準數據庫)**:
內建台股 0050.TW 與美股 SPY 歷史日 K 收盤價常數庫 (`benchmarkConstants.ts`)，透過時間序列向前填充插值 (Forward-fill) 演算法與自身投資組合日期對齊，支援 100% 歸一化成長曲線對照與 50/50 股債平衡基準。零外部 API 依賴，確保金融隱私與秒開體驗。

**Jensen's Alpha (詹森阿爾法超額報酬)**:
衡量投資組合承擔市場 Beta 風險後，超越資本資產定價模型 (CAPM) 預期收益之超額年化報酬率：
$$\alpha = R_{p,\text{ann}} - [R_f + \beta (R_{b,\text{ann}} - R_f)]$$
其中無風險利率 $R_f = 1.5\%$。

**Beta & Correlation (貝塔係數與相關係數)**:
衡量投資組合相對於大盤基準波動敏感度之指標：
$$\beta = \frac{\text{Cov}(r_p, r_b)}{\text{Var}(r_b)}, \quad r = \frac{\text{Cov}(r_p, r_b)}{\sigma_p \sigma_b}$$

- [ADR-0041: V5.7.0 交易計畫紀律檢討、盤中風控觸價警示與大盤量化基準對比](docs/adr/0041-trade-discipline-risk-alerts-and-quant-benchmark.md)
- [ADR-0042: V5.7.1 當日異動事件置頂常駐與量化指標混合智能常駐](docs/adr/0042-permanent-quant-dashboard-and-event-layout.md)
- [ADR-0043: V5.7.2 機構級量化風控指標卡片雙層懸浮診斷與動態即時解讀系統](docs/adr/0043-quant-metrics-interactive-diagnosis-and-tooltips.md)
- [ADR-0044: V5.7.3 全專案「慣用紅綠漲跌」色彩模式統一與 CSS 變數體系全面連動](docs/adr/0044-color-theme-mode-unification-and-full-project-css-sync.md)
- [ADR-0045: V5.7.4 淨槓桿零負債現貨保護機制與被動收入各項利息獨立膠囊展示](docs/adr/0045-risk-leverage-zero-debt-fix-and-passive-income-badges.md)
- [ADR-0046: V5.8.0 零負債槓桿歸零、利息膠囊券商聚合與預扣稅分離、流水帳股息雙向同步全域連動](docs/adr/0046-zero-debt-leverage-zeroing-and-bidirectional-cash-trade-sync.md)

### 零負債槓桿歸零、利息聚合與雙向同步 (Zero-Debt Leverage Zeroing, Broker Interest Aggregation & Bidirectional Sync) *(新增於 V5.8.0)*

**Zero-Debt Leverage Zeroing (零負債槓桿率歸零 0.00x)**:
當帳戶無任何借貸/質押負債（`totalDebtTWD === 0`）時，無論現金為正或負，淨槓桿率與總槓桿率一律評定為 `0.00x`，徽章顯示「穩健無槓桿 (≤1.0x)」，徹底消除現貨投資人對 `0.97x` 的誤解。只有在帳戶存在實質借款負債時才進行金融槓桿計算。

**Broker-level Interest Aggregation & Tax Separation (利息依券商聚合與預扣稅分離)**:
透過 `normalizeInterestName` 智能去除月份與日期區間備註（例如 `(9/29-10/29)`），將同一券商帳戶之多筆利息合併為單一膠囊（例如 `💵 嘉信理財-現金利息 +$1.00 USD`）。同時將預扣稅清晰分離為「美股股息預扣」與「現金利息預扣」兩顆獨立膠囊。

**Bidirectional Cash-Trade Sync (現金流水帳 ➔ Trade 雙向同步)**:
在現金流水帳中直接 ✏️ 編輯自動連動之股息紀錄時，系統自動雙向回寫 `Trade` 原始紀錄，自動觸發 React 全域資料流即時重算總淨值 (NAV)、現金水位、被動收益卡片主數字與未實現損益。

### 淨槓桿零負債現貨保護與多維利息被動收入 (Zero-Debt Spot Protection & Multi-Interest Badges) *(新增於 V5.7.4)*

**Zero-Debt Spot Protection (零負債現貨保護機制)**:
當帳戶無任何借貸/質押負債（`loans` 總額為 0）時，即使因未在現金帳本補登入金流水導致現金暫時為負數，系統自動判定為自有資金現貨持有，淨槓桿固定輸出為 `1.00x` 並評定為 `穩健無槓桿 (CONSERVATIVE)`，徹底杜絕因負 NAV 誤判為 `99.99x 極度危險` 的邊界 Bug。

**Multi-Interest Badges Aggregation (各項利息收入獨立膠囊展示)**:
由 `aggregateInterestIncomeDetails(cashTransactions, market, fxRate)` 提供聚合能力，從現金帳本中提取 `INTEREST_INCOME` / `INTEREST`，依項目備註（如活存利息、借券收益、美債息）與幣別分組統計。在 SummaryCards 被動收入卡片底部以獨立 Cyan 色調膠囊（`💵 {name} +{symbol}{amount} {currency}`）個別展示，與減資退款、二代健保、美股預扣 30% 膠囊和諧分立呈現。


### 量化指標雙層懸浮診斷與動態解讀系統 (Quant Metrics Dynamic Diagnosis & Dual-Layer Tooltips) *(新增於 V5.7.2)*

**Dual-Layer Diagnosis Tooltip (雙層量化診斷懸浮氣泡)**:
- **上層（金融原理層）**：呈現指標完整全名、英文全稱、CAPM/統計金融定義、計算公式與基準常數說明（如無風險利率 1.5%）。
- **下層（動態即時診斷層）**：依據當前數值動態計算健康度評級 Badge（帶專屬色彩）、專業量化機構語氣診斷語句與 💡 具體操作策略建議。

**Metric Health Levels & Classification (5 大量化指標評級矩陣)**:
- **Alpha (詹森阿爾法)**：`🌟 卓越超額` ($\ge 5\%$)、`🟢 穩健超額` ($0 \sim 5\%$)、`🟡 略遜大盤` ($-5 \sim 0\%$)、`🔴 落後大盤` ($< -5\%$)。
- **Beta (貝塔係數)**：`🛡️ 防禦獨立型` ($< 0.5$)、`🟢 低度聯動` ($0.5 \sim 0.8$)、`🔵 大盤同步` ($0.8 \sim 1.2$)、`⚡ 敏銳進攻型` ($> 1.2$)。
- **Sharpe (夏普值)**：`🌟 極致卓越` ($\ge 2.0$)、`🟢 優良穩健` ($1.0 \sim 2.0$)、`🟡 回報偏弱` ($0.0 \sim 1.0$)、`🔴 需留意` ($< 0$)。
- **MDD (最大回撤)**：`🛡️ 風控極佳` ($\le 10\%$)、`🟡 正常回撤` ($10 \sim 20\%$)、`🟠 波動偏高` ($20 \sim 35\%$)、`🔴 風險警示` ($> 35\%$)。
- **Volatility (年化波動度)**：`🛡️ 低波防守` ($< 10\%$)、`🟢 中等平穩` ($10 \sim 20\%$)、`🟠 高波成長` ($20 \sim 35\%$)、`⚡ 極高波動` ($> 35\%$)。

**Auto-placement & Multi-device Support (邊界防溢出與多端互動)**:
- 卡片第一張（Alpha）靠左對齊 (`left: 0`)、中間三張（Beta/Sharpe/MDD）居中對齊 (`left: 50%`)、最後一張（Volatility）靠右對齊 (`right: 0`)，徹底杜絕超出視窗邊界。
- 桌面端 Hover 平滑浮現，行動端/平板支援 Tap 點擊切換與空白處關閉。



