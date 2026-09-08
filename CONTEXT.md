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

**Receivable Dividend (應收股利與除息平滑補償)** *(新增於 V6.1.0)*:
除息日 (Ex-Date) 股價開盤即下調除息金額，但現金需歷經 2~4 週發放日 (Pay-Date) 才入帳。系統在除息空窗期自動計算 `ReceivableDividend`，並於持倉未實現損益提供平滑補償視圖，徹底杜絕帳面假性跳水。
_Avoid_: Unpaid Dividend, Accrued Profit

**FX Gain/Loss Breakdown (美股外匯匯差與本體價差拆解)** *(新增於 V6.1.0)*:
將美股以台幣計價之總損益嚴格解耦為「股票本體價差 (Asset Gain)」與「美元匯率波動 (FX Gain/Loss)」，精確反映選股 Alpha 與外匯貢獻。
_Avoid_: Currency Mix, Mixed Gain

**Tax Compliance & Threshold Alert (稅階合規與二代健保/海外所得預警)** *(新增於 V6.1.0)*:
台股單筆現金股利達 NT$ 20,000 元時事前預警 2.11% 補充保費；美股統計當年度已實現價差與股息，提供 100 萬基本所得額申報與 750 萬最低稅負制 (AMT) 進度條。
_Avoid_: Tax Guess, Manual Audit

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
- [ADR-0059: V6.9.2 本地儲存檢測中心雙軌容錯韌性升級與 0 筆計數盲區修復](docs/adr/0059-local-storage-inspector-dual-track-resilience-and-zero-count-fix.md)
- [ADR-0065: V7.0.0 資產配置目標偏離 (Drift) 試算與再平衡推薦器](docs/specs/0065-target-allocation-drift-and-rebalancing-optimizer-spec.md)
- [ADR-0072: V7.4.0 樹狀圖納入借款與負債槓桿視覺化架構](docs/adr/0072-treemap-debt-and-leverage-visualization.md)
- [ADR-0073: V7.5.0 股票質押借款撥款金流同步、零本金斷頭誤判防禦與已結清歷史歸檔架構](docs/adr/0073-loan-disbursement-cash-sync-and-closed-pledge-archive.md)
- [ADR-0074: V7.5.1 歷史已結清借貸利息與官方規費明細拆解、借款天數與結清還款日追蹤架構](docs/adr/0074-settled-loan-cost-breakdown-and-payoff-date.md)
- [ADR-0075: V7.5.2 歷史已結清借貸規費明細計算校正與結清還款日手動維護架構](docs/adr/0075-settled-loan-fee-breakdown-bugfix-and-payoff-date-editor.md)
- [ADR-0076: V7.6.0 歷史現金股利入帳明細入帳日與除息日時序徹底分離與發放日校正](docs/adr/0076-dividend-log-view-pay-date-temporal-separation-and-sorting.md)
- [ADR-0077: V7.7.0 籌碼與聰明錢動態觀察儀（零基礎小白友善版、量價動能四象限泡泡圖與時序播放軌跡系統）](docs/adr/0077-smart-money-bubble-view-and-chip-flow-dynamics.md)
- [ADR-0088: V8.8.0 籌碼動態星圖市場篩選隔離與 Header 狀態雙向同步](docs/adr/0088-chips-workspace-market-filter-isolation-and-header-sync.md)

### 籌碼動態星圖市場篩選隔離與 Header 狀態雙向同步 (Chips Workspace Market Filter Isolation) *(新增於 V8.8.0)*
- **全市場純度保證 (Zero Cross-Market Contamination)**：
  - `US` 模式：輸出清單 100% 純美股標的（如 NVDA, AAPL, MSFT, META, TSLA 等全美股巨頭），嚴禁出現任何台股。
  - `TW` 模式：輸出清單 100% 純台股標的（如 2330, 2454, 0050 等三大法人焦點），嚴禁出現任何美股。
  - `ALL` 模式：台股焦點 Top 20 結合美股科技巨頭 Top 10，均衡反映全球資產與跨市場主力動向。
- **全視圖模式市場篩選器常駐 (Permanent Filter Visibility)**：
  - 市場篩選器（全部/台股/美股）在「我的在庫持倉」與「全市場法人焦點 Top 30」兩大模式下均常駐可見，杜絕模式切換導致按鈕隱藏之困擾。
- **雙向狀態連動機制 (Bi-directional State Synchronization)**：
  - 頂部導航列之 `currentMarket` 透過 Props 傳入 `ChipsWorkspace`。當全域市場切換時，工作區內即時連動切換。
  - 工作區內點擊市場標籤時，同步觸發 `onMarketChange` 更新頂部全域狀態，達成無縫雙向同步。

### 籌碼與聰明錢動態觀察儀 (Smart Money Flow & Bubble View) *(新增於 V7.7.0)*
- **零基礎四象限生活化定調 (Beginner-Friendly Quadrants)**：
  - 橫軸代表漲跌幅動能，縱軸代表聰明錢強度，將四象限賦予口語生活化情境：
    - `🔥 主力抬轎飆股區 (BREAKOUT)`：價漲且大機構大買。
    - `🛡️ 逢低撿便宜區 (ACCUMULATION)`：價跌但大機構逆勢悄悄吃貨。
    - `⚠️ 割韭菜警戒區 (DISTRIBUTION)`：價漲但大機構趁高倒貨。
    - `❄️ 冷凍提款區 (LIQUIDATION)`：價跌且大機構大舉出逃。
- **跨市場一手資料源對齊 (Cross-Market Data Pipeline)**：
  - 台股直連 TWSE 官方開放日報 (`fund/T86`) 單次取得全市場三大法人進出；美股以官方轉發日 K 線計算 Chaikin Money Flow (CMF 20 日佳慶資金流)，統一標準化為無量綱分數。
- **時序動態播放器與彗星尾巴 (Timeline Motion Player & Trails)**：
  - 支援播放/暫停/重播與日期滑桿，動態渲染過去 5~20 天泡泡平滑位移路徑與半透明彗星殘影。
- **結論先行懸浮診斷 (Plain-Language Diagnosis Tooltip)**：
  - 滑鼠懸浮第一眼呈現人類直白診斷結論，打破冰冷量化數字門檻。

### 歷史已結清借貸規費明細計算校正與結清還款日維護 (Settled Fee Fix & Payoff Date Editor) *(新增於 V7.5.2)*
- **三大規費明細單一事實來源 (SSOT)**：當借貸登記設質費為 0 時強制為 0，徹底杜絕被 `pledgeFee` 總額或未拆分流水污染導致規費重複翻倍。
- **結清還款日手動維護 (Closed Date Editor)**：`LoanModal` 支援在借貸結清本金為 0 時呈現日期選擇器，隨時檢視與校正真實結清還款日。

### 歷史已結清借貸成本透視與結清還款日追蹤架構 (Settled Loan Cost & Lifecycle) *(新增於 V7.5.1)*
- **合約結清時態與借款天數 (Payoff Date & Borrow Days)**：`LoanRecord` 擴充 `closedDate`，於還本歸零時自動寫入；卡片標註「借款起日 · 結清還款日 (歷時 XX 天)」，便於投資人對照券商對帳單。
- **已付借貸成本雙軌聚合 (Settled Loan Summary Engine)**：以 `calculateLoanSettledSummary` 純函數優先聚合關聯現金流水中之實際扣繳利息與規費，缺漏時平滑備援推算。
- **券商官方名詞標準化**：全面對齊集保結算所與主要券商正式名詞（「質押借款利息 / 融資利息」、「設質登記費」、「集保撥券費」、「開辦手續費」、「總借貸支出成本」）。

### 股票質押借款撥款同步與歷史結清歸檔架構 (Loan Disbursement & Settled Archive) *(新增於 V7.5.0)*
- **借貸撥款入帳自動連動 (Loan Disbursement Sync)**：建立借款時提供「自動於關聯帳戶記錄借款撥款入帳 (`LOAN_DISBURSEMENT`)」選項，以借款起日為生效日建立正數現金流，確保借貸成立與後續還款借貸平衡。
- **零借款本金斷頭誤判防禦 (Zero-Debt Safety Guard)**：當借款未還本金歸零 (`principal <= 0`) 時，維持率標記為 `SAFE` (維持率為 `Infinity`，介面顯示「無負債 (安全)」)，徹底阻斷斷頭警報與殘留規費。
- **進行中與已結清看板分流 (Active vs. Closed Workspace Split)**：即時風控看板僅渲染進行中借貸 (`principal > 0`)；已歸還完成之借貸自動收納於專屬「📜 歷史借貸與質押已結清紀錄」折疊清單中。
- **歷史借款缺漏一鍵平帳 (Historical Reconciliation)**：自動偵測「有還款紀錄但缺少當初借款入帳」之歷史借貸（包含 2026-07-28 之股票質押），提供一鍵平帳補登功能。

### 資產配置目標偏離 (Drift) 試算與再平衡推薦器 (Target Allocation & Rebalancing) *(新增於 V7.0.0)*
- **雙軌目標配置模型 (Target Allocation Config)**：支援「市場維度 (TW/US/Cash)」與「自訂個股維度 (Symbol-level)」策略設定，具備合計 100% 之防呆驗證與偏離容忍門檻 ($\pm 5\%$)。
- **偏離度量化與三色診斷 (Drift Badges)**：計算實際佔比與目標差距 ($P_{\text{actual}} - P_{\text{target}}$)，即時輸出 `🟢 正常平衡`、`🟡 輕度偏離`、`🔴 顯著失衡` 狀態。
- **雙模式再平衡演算法 (Rebalancing Engine)**：
  - **定期注水加碼 (Cash-in Only)**：依缺口比例優先加碼低配標的，只買不賣，杜絕摩擦成本與稅負。
  - **全量買賣再平衡 (Full Rebalancing)**：超配賣出、低配加碼，精確重置組合權重。
- **跨市場下單顆粒度適配**：台股自動換算「整張數 (1,000股) + 零股」，美股支援碎股小數點計算，並同步輸出原幣別與折合 TWD 建議下單金額。

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
計算公式為 `(總股票市值 - 可用現金) / 淨資產 ### Storage Inspector 快取統計指標解構與字典計數對齊 (Storage Inspector Reconciliation) *(新增於 V6.9.3)*

- **Corporate Action Cache Symbol Extraction & Event Flattening (公司行動快取標的提取與事件展平)**:
  - 解析 `STOCK_TRACKER_CA_CACHE_V1` 實體快取時，提取所有 symbol 鍵以計算真實涵蓋標的數（61 檔），並展平所有事件計算真實總筆數（183 筆），徹底消除 `0 檔 (61 筆)` 之結構性解析錯誤。
- **USD/TWD Historical FX Rate Points Accumulation (美元/台幣單一貨幣對歷史外匯數據點累加)**:
  - 將以日期為 Key 映射之歷史匯率結構正確識別為 `1 對 (USD/TWD)` 幣別對，並將總歷史天數正確累加為 `historicalFxDataPoints`（4,529 點），解決 `4529 對 (0 點)` 之顯示倒錯。
- **Stock Dictionary Cache Total Count Alignment (股票字典庫總收錄檔數全口徑對齊)**:
  - 在 `MarketCacheStats` 中新增 `stockDictionaryTotalCount`，快取檢視器卡片呈現包含內建官方與自訂同步增量在內之全量標的數（3,350 檔），與管理面板保持一致。與 SSOT 股息行事曆 (Ex-Date vs Pay-Date Temporal Separation & SSOT Dividend Calendar) *(新增於 V6.1.0)*

**Ex-Date vs Pay-Date Temporal Separation (除息日 vs 入帳發放日時序徹底分離)**:
- **除息基準日 ($Ex\text{-}Date$)**：股票除息跳水與應收股息債權成立之日。用於補償持倉未實現損益之除息假性虧損，但不計入可用現金。
- **發放入帳日 ($Pay\text{-}Date$)**：現金實質匯入交割戶之日。當且僅當 $\text{today} \ge \text{payDate}$ 時，才轉入已結算歷史明細並計入可用現金。

**SSOT Dividend Calendar & Linear Lifecycle (官方單一真實來源與線性生命週期)**:
- 官方公司行動日曆為唯一事實來源，依線性生命週期自動推進：
  - $\text{today} < \text{exDate}$ ➔ 📢 `UPCOMING_EX` (即將除息)
  - $\text{exDate} \le \text{today} < \text{payDate}$ ➔ ⚡ `PENDING_PAYMENT` (除息待入帳 / 平滑假性虧損)
  - $\text{today} \ge \text{payDate}$ ➔ ✅ `SETTLED` (已實質落袋)
- 徹底消除手動帳本舊日期對官方除息行事曆的交錯干擾與防重複誤殺。

**Corporate Action Adjusted Ex-Date Holdings (除息日在籍股數公司行動回溯)**:
- 依證券法規以除息日前一日收盤在籍持股為準：$\text{sharesHeld} = \text{getHoldingsAsOfDate}(trades, \text{prevDay}, symbol)$。
- 完整回溯累加所有歷史買賣、除權股票股利 (`STOCK_DIVIDEND`)、股票分割 (`STOCK_SPLIT`)、現金減資換發 (`CAPITAL_REDUCTION`) 與現增認購，杜絕除權配股補正後的股數缺損。

### 跨模組全域一致性與交叉核銷體系 (Cross-Module Ledger-Dividend-Portfolio Reconciliation) *(新增於 V6.3.0)*

- **融資自備款會計守恆 (Margin Buy 40% Down Payment)**：`MARGIN_BUY` 在現金帳本嚴格依 40% 自備款加手續費扣除，股票市值 100% 入資產，60% 融資金額入借貸負債，全週期 NAV 精確守恆。
- **除息在籍資格嚴格判定 (Strict Ex-Date Eligibility)**：移除除息日前持股為 0 時 fallback 至現有持股的漏洞，杜絕除息日後才買進者冒領股利。
- **全域 NAV 在途與應收守恆 (NAV Full Timeline In-Transit Smoothing)**：NAV 納入 $T\sim T+2$ 交易在途淨額與 $T_{ex} \sim T_{pay}$ 待入帳應收股息，徹底消除除權息旺季與交割時間差的淨值斷層。
- **XIRR 自適應 Mode B 探針 (Adaptive Mode B for Pure Trade History)**：無手動出入金時自適應以歷史交易實質投入成本求解年化 XIRR。
- **質押擔保品在庫動態限制 (Collateral Effective Shares Guard)**：以在庫實際持股數限制質押擔保品市值，賣出股票時擔保品自動核銷並即時觸發斷頭追繳警示。
- **減資 0 元成本保底 (Capital Reduction Zero-Cost Floor)**：現金減資超額退款時每股成本維持 $\ge 0$，未實現損益率永不發生正負號反轉。
- **台股 10 元跨行匯費內扣 (10 TWD Interbank Wire Fee)**：台股應收股息試算精確扣除 10 元跨行匯費與 2.11% 二代健保，與交割存摺 100% 吻合至個位數。

### 智慧掃描公司行動除息發放雙日期注入與在途隔離體系 (Smart Scan Dual-Date Injection & In-Transit Ledger Isolation) *(新增於 V6.4.0)*

- **Dual-Date Corporate Action Model (除權息雙日期模型)**：
  - `ScannedCorporateAction` 與 `RawCorporateEvent` 擴充 `payDate?: string`，完整承載「除息基準日 (`exDate`)」與「預估入帳發放日 (`payDate`)」。
  - 優先引用官方公告行事曆（2330、2886、00878、00923、9927 等），全市場動態掃描自動以交割週期精確估算（台股 +28 日、美股 +21 日）。
- **Ex-Date Stock Baseline Invariance (除息日在庫持股基準恆定性)**：
  - 嚴格以除息日前一日（$Ex\text{-}Date - 1\text{ day}$）收盤在籍持股計算應配股數與現金股息，除息日後的買賣交易完全不干擾配息權益計算。
- **Auto-Apply Dual-Date Injection (自動補登雙日期完整寫入)**：
  - 在 `CorporateActionScannerModal` 套用補登時，自動將 `exDate` 與 `payDate` 注入 `TradeRecord`，並在交易備註清晰標明入帳預估日。
- **In-Transit Ledger Isolation (現金帳本在途隔離與自動交割流轉)**：
  - 現金帳本自動交割同步以 `trade.payDate` 為唯一交割日，未到期款項標記為 `PENDING` 在途（不提前虛增可用現金餘額），發放日當天自動轉為 `SETTLED`。

### 本機持久化公司行動資料庫與多源交叉增量同步管線 (Local Corporate Actions DB & Multi-Tier Pipeline) *(新增於 V6.5.0)*

- **Local Corporate Actions DB (`corporateActions` Store)**：
  - 於 IndexedDB `StockTrackerDB` 建立專屬 Store，以 `${symbol}-${type}-${date}` 為主鍵，支援本機離線讀取與差異化增量 Upsert。
- **Three-Tier Multi-Source Pipeline (三層多源交叉驗證管線)**：
  - **Tier 1 (內建官方重大基準庫 SSOT)**：內建 9927 減資、2330、2886、00878、00923 等重大行動，保證 100% 離線可用。
  - **Tier 2 (臺灣官方 OpenAPI - 免 Key)**：串接 TWSE `TWT48U_ALL`（除權息預告）、`TWTAVU`/`TWTB4U`（減資恢復買賣）與 TPEx 官方端點。
  - **Tier 3 (深度歷史回填 - 選填免費 Key)**：在設定頁支援填入 **FinMind Token**（免費申請，每日 600 次額度），以 200ms 受控節流背景回填台股過去 10 年歷史減資與配息；美股支援選填 FMP / Finnhub Key 或 Yahoo 備援。
- **Sequential Capital Reduction Deducting Guarantee (減資時序前置扣減保證)**：
  - 歷史現金減資換發（`CAPITAL_REDUCTION`）在計算任何未來除息日前，強制按時序前置扣除縮減股數，杜絕以減資前舊股數計算配息造成虛胖高估。

### 本地數據與儲存空間總覽看板 (Local Storage Inspector & Data Transparency Hub) *(新增於 V6.6.0)*

- **Local Storage Inspector (本地數據與儲存總覽看板)**:
  - 於「系統設定」工作區提供完全透明的客戶端資料庫與快取檢測中心，即時呈現各資料表（ObjectStore）筆數、資料點、時間跨度與使用佔比。
- **Web Storage Quota & Health (儲存配額與引擎健康度)**:
  - 調用瀏覽器原生 `navigator.storage.estimate()` 動態取得已使用空間（Bytes/MB）、配額上限（Quota）與使用率百分比，並提供 IndexedDB (`StockTrackerDB v1`) 與 LocalStorage 正常運行狀態指示燈。
- **Tiered Asset Protection & Shield (階梯式分級資產保護與護盾)**:
  - **核心個人資產 (`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`)**：受到 `AUTO_BEFORE_RESET` 快照與確認機制保護，不可隨意抹除。
  - **市場行情快取 (`historicalPrices`, `historicalFx`, `priceMetadata`, `corporateActions`)**：支援單獨一鍵細粒度安全清空與立即重新拉取，絕不污染或誤傷任何個人帳務資料。
- **100% Client-Side Local-First Privacy (100% 本地離線隱私保證)**:
  - 明確宣告並保證所有財務紀錄、券商帳戶與 API 金鑰 100% 儲存在使用者本地瀏覽器環境，絕不傳輸至任何第三方私有伺服器。

### 在途資金交割時序排程單行條列化與分組小計 (Settlement Timeline Single-Row Layout & Group Subtotals) *(新增於 V6.7.0)*

- **Single-Row Settlement Item Layout (單行條列式交割項目排版)**:
  - 徹底取代多欄自適應 CSS Grid 佈局，將時序看板項目改為垂直單行排列（`flex-direction: column`），每筆項目完整橫向展開，徹底消除卡片寬度受壓導致的字元直立斷裂問題。
- **Multi-Dimensional Status Capsules (多維度時序與類別膠囊標籤)**:
  - **時序倒數膠囊**：依 `daysUntilSettlement` 標記 `今日到期`、`明日到期`、`N 天後`、`逾期 N 天`，輔以顏色語意。
  - **金流類別徽章**：依交易類型標記 `股票買進`（紅底）、`股票賣出`（綠底）、`現金股息`（綠底）、`利息收入`（藍底）、`資金存提` 等。
- **Timeline Group Subtotals (時序分組淨現金流小計)**:
  - 於各時序區塊（🔴 逾期 / ⚡ 今日 / 📅 明日 / 🗓️ 本週 / 🔮 未來）標題即時計算展示分組預估淨現金流（`小計: +NT$ ...`），便利快速評估短期資金缺口。

### 配股配息二代健保合併計算與時間軸分離架構 (Stock & Cash Dividend NHI Consolidation & Temporal Separation) *(新增於 V6.8.0)*

- **NHI Consolidation & Auto-Offset Engine (二代健保合併試算與代扣引擎)**:
  - 依台灣《健保補充保費辦法》，同一除權除息案之「現金股利毛額」與「股票股利面額（股數 $\times 10$ 元）」依法合併試算。單次給付達 NT$ 20,000 元課 2.11% 補充保費，並強制全額由現金股利代扣（永豐金 31,000 股配息 1.1 + 配股 0.2 ➔ 所得 NT$ 40,300、健保代扣 NT$ 850、實收現金 NT$ 33,250）。
- **Receivable Stock Smoothing (待入帳配股與持倉損益平滑)**:
  - 於除權息日 (Ex-Date) 至發放日期間，持倉平滑損益自動納入「待入帳配股市值（$\text{股數} \times \text{即時市價}$）」與「應收現金」，徹底消除除權空窗期之損益假摔。
- **Three-Stage Temporal Separation (三階段時間軸分離入帳)**:
  - `DIVIDEND` 於現金發放日（Cash Pay Date）入帳並連動現金帳戶流入；`STOCK_DIVIDEND` 於新股上市發放日（Stock Pay Date）正式計入在庫可賣股數。

### 智慧掃描公司行動精準度、二代健保合併扣繳與現金帳本實收連動 (Smart Scan Accuracy & NHI Ledger Sync) *(新增於 V6.9.0)*

- **Unrestricted Stock Dividend Scanning (解除配股過濾與除權精準捕獲)**:
  - 徹底移除線上 API 對 2890 永豐金等個股之硬編碼過濾，將 `isAlreadyRecorded` 改為精確比對行動類型與除權基準日（相差 $\le 7$ 天），確保除權股票股利 100% 納入待補登清單。
- **Consolidated NHI Tax Auto-Deduction in Smart Scan (智慧補登二代健保自動扣除與稅費存入)**:
  - 智慧掃描在產生待補登股息時，自動執行 `calculateConsolidatedTwNhiTax` 試算現金股利與配股面額合併二代健保，將扣繳金額精確記錄於 `tax` 欄位，實收金額存入 `cashAmount`。
- **Net Cash Payout Priority in Cash Ledger (現金帳本實收金額優先連動)**:
  - 現金帳本自動流水產生引擎優先以 `trade.cashAmount`（若已定義且 $>0$）或 `gross - tax` 入帳，確保現金帳本 100% 反映扣除二代健保補充保費後的實收資金（如永豐金入帳 +NT$ 33,250），杜絕資金虛增。
- **Sequential Capital Reduction Deducting Guarantee (減資時序前置扣減與在庫恆等性)**:
  - 現金減資（如 9927 泰銘 28.28% 減資）與後續買賣交易在除息日前依時序精確計算，基準日持股精確反映減資後與後續買進之真實庫存（10,000 股），發放日與退款金額精確對齊官方基準。

### 智慧掃描真實持股對齊、強制重掃狀態重置與精準配息比對 (Smart Scan Real Holding & Rescan Precision) *(新增於 V6.9.1)*

- **Real Holdings Alignment & Reduction Pre-Deduction Exclusion (真實持股基準日對齊與未入帳減資預扣排除)**:
  - 智慧掃描公司行動的基準日持股數（`sharesHeldOnDate`）嚴格依據使用者帳本真實歷史交易（`trades`）在 `exDate - 1`（Last Cum-Date）之收盤在籍股數計算。
  - 虛擬時序引擎僅對實質增加股數之除權配股（`STOCK_DIVIDEND`）與股票分割（`STOCK_SPLIT`）動態累加股數；徹底廢除對未入帳歷史減資（`CAPITAL_REDUCTION`）的預扣，杜絕 9927 泰銘等標的除息持股被誤縮為 7,972 股之失真。
- **Rescan Progress Reset & IndexedDB Cache Penetration (重掃進度條即時重置與 IndexedDB 快取穿透)**:
  - 點擊「強制清除快取重掃」時，立即中斷前次任務並將 `progress` 重設為 `{ current: 0, status: 'scanning' }`，並透過微任務排程刷新 React 載入動畫。
  - 當 `forceRefresh === true` 時，引擎強制跳過 IndexedDB 本機快取讀取，向線上金融端點發起全新連線並覆寫更新本機快取。
- **High-Precision Cash Dividend Matching (現金股利高精準比對與單季刪除補登)**:
  - 取消粗暴的 60 天同類型模糊判定，改為比對 `exDate`/`payDate`，或在 45 天內同時驗證每股配息單價與總金額。手動刪除特定季配息後，重掃 100% 能精確識別為「✨ 待補登」。
- **Statutory Ex-Dividend Date Trading Exclusion (證券法規除息日買進排除)**:
  - 嚴格遵守證券交易法規：除息日（Ex-Date）當天買進之部位不享有該次配息（股數為 0），避免產生重複獲利 (Double Dip) 財務計算錯誤。

### Storage Inspector 快取統計指標解構與字典計數對齊 (Storage Inspector Reconciliation) *(新增於 V6.9.3)*
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
- [ADR-0047: V5.9.0 嘉信理財對帳單像素級對齊、利息智能正規化與美股股息毛額雙筆記帳架構](docs/adr/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend.md)
- [ADR-0048: V6.0.0 官方台美股標的字典庫與智能代碼/名稱模糊搜尋引擎](docs/adr/0048-official-stock-dictionary-and-smart-autocomplete.md)
- [ADR-0049: V6.1.0 除息空窗期真實損益平滑補償、專屬股息紀錄視圖與外幣匯率損益獨立揭露系統](docs/adr/0049-ex-dividend-smoothing-dividend-log-and-fx-tax-system.md)
- [ADR-0050: V6.2.0 除息日與發放日時間軸分離入帳與 SSOT 除權息行事曆](docs/adr/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar.md)
- [ADR-0051: V6.3.0 跨模組股息帳本與持股稽核對帳系統](docs/adr/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation.md)
- [ADR-0052: V6.4.0 智慧掃描除息與發放日對齊及待入帳股息行事曆](docs/adr/0052-smart-scan-dividend-ex-date-pay-date-alignment-and-pending-ledger.md)
- [ADR-0053: V6.5.0 官方公司行動資料庫與減資發放日對齊流水線](docs/adr/0053-official-corporate-action-db-and-capital-reduction-pipeline.md)
- [ADR-0054: V6.6.0 LocalStorage 快取檢視器與資料透明度中心](docs/adr/0054-local-storage-inspector-and-data-transparency-hub.md)
- [ADR-0055: V6.7.0 交割時序排程單行緊湊佈局與時序分組小計](docs/adr/0055-settlement-timeline-single-row-layout-and-group-subtotals.md)
- [ADR-0056: V6.8.0 股票與現金股利二代健保合併扣繳與三階段時間軸分離入帳](docs/adr/0056-stock-cash-dividend-nhi-consolidation-and-temporal-separation.md)
- [ADR-0057: V6.9.0 智慧掃描公司行動精準度、二代健保合併扣繳與現金帳本實收連動](docs/adr/0057-smart-scan-corporate-action-accuracy-and-nhi-ledger-sync.md)
- [ADR-0058: V6.9.1 智慧掃描真實持股對齊、強制重掃狀態重置與精準配息比對](docs/adr/0058-smart-scan-real-holding-alignment-and-rescan-precision.md)
- [ADR-0059: V6.9.2 快取檢視器雙軌彈性適配與 0 筆計數顯示修復](docs/adr/0059-local-storage-inspector-dual-track-resilience-and-zero-count-fix.md)
- [ADR-0060: V6.9.3 Storage Inspector 快取統計指標解構與字典計數對齊](docs/adr/0060-storage-inspector-stat-mapping-and-dictionary-count-fix.md)
- [ADR-0061: V6.9.4 減資多源去重、虛擬時序動態扣減與交易帳本股息淨額對齊](docs/adr/0061-capital-reduction-deduplication-and-virtual-timeline-accuracy.md)
- [ADR-0062: V6.9.5 全域借款負債納入應計利息與規費及一鍵結清本利和](docs/adr/0062-total-debt-payoff-accrued-interest-and-fees-settlement.md)

### 嘉信理財對帳單像素級對齊與雙筆記帳架構 (Schwab Statement Pixel-Perfect Alignment & Dual-Entry Architecture) *(新增於 V5.9.0)*

**Dual-Entry Dividend & Tax Flow (美股股息毛額與預扣稅雙筆記帳)**:
美股現金股息入帳流水一律採用「稅前毛額 (Gross)」，精準還原嘉信理財官方 `DOI（毛股息入帳）` + `JRN（30% 預扣稅扣除）` 的標準金流模型，徹底消除毛淨額混淆與重複扣稅風險。

**Smart Interest Note Normalization (利息備註智能正規化)**:
升級 `normalizeInterestName`，全面支援中文全形逗號 `，`、半形逗號 `,`、冒號 `：`、各類破折號與日期區間正則過濾，確保跨月份同券商利息 100% 合併為單一膠囊。

**Auto-Reconciliation Engine (冪等式實績自動校正模組)**:
在系統初始化層自動對齊歷史 SGOV 買賣金額與 VT 股息發放日/金額，自動消除手動出金校正流水，達成交割戶現金餘額 `$224.79 USD` 的 100% 吻合。

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

### 官方股票名稱字典庫與智慧自動補齊系統 (Official Stock Dictionary & Smart Autocomplete System) *(新增於 V6.0.0)*

**Stock Dictionary Seed Data (全量靜態種子資料庫)**:
- **🇹🇼 台股官方清單**：收錄臺灣證券交易所 (TWSE) 上市股票、ETF、創新板及櫃買中心 (TPEx) 上櫃/興櫃標的代碼與繁體中文簡稱（如 `2330` ➔ `台積電`, `0050` ➔ `元大台灣50`, `6547` ➔ `高端疫苗` 等 2,000+ 檔）。
- **🇺🇸 美股精選繁中**：收錄 S&P 500、Nasdaq 100 指數成分股及主流 ETF 繁體中文簡稱（如 `NVDA` ➔ `輝達`, `AAPL` ➔ `蘋果`, `VOO` ➔ `Vanguard標普500 ETF`, `VT` ➔ `Vanguard全世界股票ETF` 等 500+ 檔）。

**Two-Way Smart Autocomplete (雙向智慧搜尋與表單自動代入)**:
- 在 `TradeModal` 標的代碼輸入框輸入代碼（如 `2330`、`NVDA`）或中文名稱關鍵字（如 `台積`、`蘋果`）時，即時於下拉清單檢索並展示候選標的。
- 精確命中代碼時自動帶入繁體中文官方名稱，同時尊重使用者手動修改與自訂名稱持久化。

**Global Name Resolution (全域一致名稱解析)**:
- 核心函式 `resolveOfficialSecurityName(symbol, fallbackName)` 整合自訂快取、靜態字典與 fallback 機制，在庫存列表、歷史紀錄、資產樹狀圖 (Treemap)、報表及 CSV 匯入全站一致呈現繁體中文官方名稱。

**TWSE / TPEx Open API Sync (官方 OpenAPI 一鍵同步)**:
- 串接臺灣證券交易所與櫃買中心官方 Open Data OpenAPI，於設定頁提供「一鍵同步官方最新清單」功能，並持久化快取至本地 IndexedDB / LocalStorage。

### 除息日與入帳發放日時序徹底分離與 SSOT 股息行事曆 (Ex-Date vs Pay-Date Temporal Separation & SSOT Dividend Calendar) *(新增於 V6.1.0)*

**Ex-Date vs Pay-Date Temporal Separation (除息日 vs 入帳發放日時序徹底分離)**:
- **除息基準日 ($Ex\text{-}Date$)**：股票除息跳水與應收股息債權成立之日。用於補償持倉未實現損益之除息假性虧損，但不計入可用現金。
- **發放入帳日 ($Pay\text{-}Date$)**：現金實質匯入交割戶之日。當且僅當 $\text{today} \ge \text{payDate}$ 時，才轉入已結算歷史明細並計入可用現金。

**SSOT Dividend Calendar & Linear Lifecycle (官方單一真實來源與線性生命週期)**:
- 官方公司行動日曆為唯一事實來源，依線性生命週期自動推進：
  - $\text{today} < \text{exDate}$ ➔ 📢 `UPCOMING_EX` (即將除息)
  - $\text{exDate} \le \text{today} < \text{payDate}$ ➔ ⚡ `PENDING_PAYMENT` (除息待入帳 / 平滑假性虧損)
  - $\text{today} \ge \text{payDate}$ ➔ ✅ `SETTLED` (已實質落袋)
- 徹底消除手動帳本舊日期對官方除息行事曆的交錯干擾與防重複誤殺。

**Corporate Action Adjusted Ex-Date Holdings (除息日在籍股數公司行動回溯)**:
- 依證券法規以除息日前一日收盤在籍持股為準：$\text{sharesHeld} = \text{getHoldingsAsOfDate}(trades, \text{prevDay}, symbol)$。
- 完整回溯累加所有歷史買賣、除權股票股利 (`STOCK_DIVIDEND`)、股票分割 (`STOCK_SPLIT`)、現金減資換發 (`CAPITAL_REDUCTION`) 與現增認購，杜絕除權配股補正後的股數缺損。

### 跨模組全域一致性與交叉核銷體系 (Cross-Module Ledger-Dividend-Portfolio Reconciliation) *(新增於 V6.3.0)*

- **融資自備款會計守恆 (Margin Buy 40% Down Payment)**：`MARGIN_BUY` 在現金帳本嚴格依 40% 自備款加手續費扣除，股票市值 100% 入資產，60% 融資金額入借貸負債，全週期 NAV 精確守恆。
- **除息在籍資格嚴格判定 (Strict Ex-Date Eligibility)**：移除除息日前持股為 0 時 fallback 至現有持股的漏洞，杜絕除息日後才買進者冒領股利。
- **全域 NAV 在途與應收守恆 (NAV Full Timeline In-Transit Smoothing)**：NAV 納入 $T\sim T+2$ 交易在途淨額與 $T_{ex} \sim T_{pay}$ 待入帳應收股息，徹底消除除權息旺季與交割時間差的淨值斷層。
- **XIRR 自適應 Mode B 探針 (Adaptive Mode B for Pure Trade History)**：無手動出入金時自適應以歷史交易實質投入成本求解年化 XIRR。
- **質押擔保品在庫動態限制 (Collateral Effective Shares Guard)**：以在庫實際持股數限制質押擔保品市值，賣出股票時擔保品自動核銷並即時觸發斷頭追繳警示。
- **減資 0 元成本保底 (Capital Reduction Zero-Cost Floor)**：現金減資超額退款時每股成本維持 $\ge 0$，未實現損益率永不發生正負號反轉。
- **台股 10 元跨行匯費內扣 (10 TWD Interbank Wire Fee)**：台股應收股息試算精確扣除 10 元跨行匯費與 2.11% 二代健保，與交割存摺 100% 吻合至個位數。

### 智慧掃描公司行動除息發放雙日期注入與在途隔離體系 (Smart Scan Dual-Date Injection & In-Transit Ledger Isolation) *(新增於 V6.4.0)*

- **Dual-Date Corporate Action Model (除權息雙日期模型)**：
  - `ScannedCorporateAction` 與 `RawCorporateEvent` 擴充 `payDate?: string`，完整承載「除息基準日 (`exDate`)」與「預估入帳發放日 (`payDate`)」。
  - 優先引用官方公告行事曆（2330、2886、00878、00923、9927 等），全市場動態掃描自動以交割週期精確估算（台股 +28 日、美股 +21 日）。
- **Ex-Date Stock Baseline Invariance (除息日在庫持股基準恆定性)**：
  - 嚴格以除息日前一日（$Ex\text{-}Date - 1\text{ day}$）收盤在籍持股計算應配股數與現金股息，除息日後的買賣交易完全不干擾配息權益計算。
- **Auto-Apply Dual-Date Injection (自動補登雙日期完整寫入)**：
  - 在 `CorporateActionScannerModal` 套用補登時，自動將 `exDate` 與 `payDate` 注入 `TradeRecord`，並在交易備註清晰標明入帳預估日。
- **In-Transit Ledger Isolation (現金帳本在途隔離與自動交割流轉)**：
  - 現金帳本自動交割同步以 `trade.payDate` 為唯一交割日，未到期款項標記為 `PENDING` 在途（不提前虛增可用現金餘額），發放日當天自動轉為 `SETTLED`。

### 本機持久化公司行動資料庫與多源交叉增量同步管線 (Local Corporate Actions DB & Multi-Tier Pipeline) *(新增於 V6.5.0)*

- **Local Corporate Actions DB (`corporateActions` Store)**：
  - 於 IndexedDB `StockTrackerDB` 建立專屬 Store，以 `${symbol}-${type}-${date}` 為主鍵，支援本機離線讀取與差異化增量 Upsert。
- **Three-Tier Multi-Source Pipeline (三層多源交叉驗證管線)**：
  - **Tier 1 (內建官方重大基準庫 SSOT)**：內建 9927 減資、2330、2886、00878、00923 等重大行動，保證 100% 離線可用。
  - **Tier 2 (臺灣官方 OpenAPI - 免 Key)**：串接 TWSE `TWT48U_ALL`（除權息預告）、`TWTAVU`/`TWTB4U`（減資恢復買賣）與 TPEx 官方端點。
  - **Tier 3 (深度歷史回填 - 選填免費 Key)**：在設定頁支援填入 **FinMind Token**（免費申請，每日 600 次額度），以 200ms 受控節流背景回填台股過去 10 年歷史減資與配息；美股支援選填 FMP / Finnhub Key 或 Yahoo 備援。
- **Sequential Capital Reduction Deducting Guarantee (減資時序前置扣減保證)**：
  - 歷史現金減資換發（`CAPITAL_REDUCTION`）在計算任何未來除息日前，強制按時序前置扣除縮減股數，杜絕以減資前舊股數計算配息造成虛胖高估。

### 本地數據與儲存空間總覽看板 (Local Storage Inspector & Data Transparency Hub) *(新增於 V6.6.0)*

- **Local Storage Inspector (本地數據與儲存總覽看板)**:
  - 於「系統設定」工作區提供完全透明的客戶端資料庫與快取檢測中心，即時呈現各資料表（ObjectStore）筆數、資料點、時間跨度與使用佔比。
- **Web Storage Quota & Health (儲存配額與引擎健康度)**:
  - 調用瀏覽器原生 `navigator.storage.estimate()` 動態取得已使用空間（Bytes/MB）、配額上限（Quota）與使用率百分比，並提供 IndexedDB (`StockTrackerDB v1`) 與 LocalStorage 正常運行狀態指示燈。
- **Tiered Asset Protection & Shield (階梯式分級資產保護與護盾)**:
  - **核心個人資產 (`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`)**：受到 `AUTO_BEFORE_RESET` 快照與確認機制保護，不可隨意抹除。
  - **市場行情快取 (`historicalPrices`, `historicalFx`, `priceMetadata`, `corporateActions`)**：支援單獨一鍵細粒度安全清空與立即重新拉取，絕不污染或誤傷任何個人帳務資料。
- **100% Client-Side Local-First Privacy (100% 本地離線隱私保證)**:
  - 明確宣告並保證所有財務紀錄、券商帳戶與 API 金鑰 100% 儲存在使用者本地瀏覽器環境，絕不傳輸至任何第三方私有伺服器。

### 在途資金交割時序排程單行條列化與分組小計 (Settlement Timeline Single-Row Layout & Group Subtotals) *(新增於 V6.7.0)*

- **Single-Row Settlement Item Layout (單行條列式交割項目排版)**:
  - 徹底取代多欄自適應 CSS Grid 佈局，將時序看板項目改為垂直單行排列（`flex-direction: column`），每筆項目完整橫向展開，徹底消除卡片寬度受壓導致的字元直立斷裂問題。
- **Multi-Dimensional Status Capsules (多維度時序與類別膠囊標籤)**:
  - **時序倒數膠囊**：依 `daysUntilSettlement` 標記 `今日到期`、`明日到期`、`N 天後`、`逾期 N 天`，輔以顏色語意。
  - **金流類別徽章**：依交易類型標記 `股票買進`（紅底）、`股票賣出`（綠底）、`現金股息`（綠底）、`利息收入`（藍底）、`資金存提` 等。
- **Timeline Group Subtotals (時序分組淨現金流小計)**:
  - 於各時序區塊（🔴 逾期 / ⚡ 今日 / 📅 明日 / 🗓️ 本週 / 🔮 未來）標題即時計算展示分組預估淨現金流（`小計: +NT$ ...`），便利快速評估短期資金缺口。

### 配股配息二代健保合併計算與時間軸分離架構 (Stock & Cash Dividend NHI Consolidation & Temporal Separation) *(新增於 V6.8.0)*

- **NHI Consolidation & Auto-Offset Engine (二代健保合併試算與代扣引擎)**:
  - 依台灣《健保補充保費辦法》，同一除權除息案之「現金股利毛額」與「股票股利面額（股數 $\times 10$ 元）」依法合併試算。單次給付達 NT$ 20,000 元課 2.11% 補充保費，並強制全額由現金股利代扣（永豐金 31,000 股配息 1.1 + 配股 0.2 ➔ 所得 NT$ 40,300、健保代扣 NT$ 850、實收現金 NT$ 33,250）。
- **Receivable Stock Smoothing (待入帳配股與持倉損益平滑)**:
  - 於除權息日 (Ex-Date) 至發放日期間，持倉平滑損益自動納入「待入帳配股市值（$\text{股數} \times \text{即時市價}$）」與「應收現金」，徹底消除除權空窗期之損益假摔。
- **Three-Stage Temporal Separation (三階段時間軸分離入帳)**:
  - `DIVIDEND` 於現金發放日（Cash Pay Date）入帳並連動現金帳戶流入；`STOCK_DIVIDEND` 於新股上市發放日（Stock Pay Date）正式計入在庫可賣股數。

### 智慧掃描公司行動精準度、二代健保合併扣繳與現金帳本實收連動 (Smart Scan Accuracy & NHI Ledger Sync) *(新增於 V6.9.0)*

- **Unrestricted Stock Dividend Scanning (解除配股過濾與除權精準捕獲)**:
  - 徹底移除線上 API 對 2890 永豐金等個股之硬編碼過濾，將 `isAlreadyRecorded` 改為精確比對行動類型與除權基準日（相差 $\le 7$ 天），確保除權股票股利 100% 納入待補登清單。
- **Consolidated NHI Tax Auto-Deduction in Smart Scan (智慧補登二代健保自動扣除與稅費存入)**:
  - 智慧掃描在產生待補登股息時，自動執行 `calculateConsolidatedTwNhiTax` 試算現金股利與配股面額合併二代健保，將扣繳金額精確記錄於 `tax` 欄位，實收金額存入 `cashAmount`。
- **Net Cash Payout Priority in Cash Ledger (現金帳本實收金額優先連動)**:
  - 現金帳本自動流水產生引擎優先以 `trade.cashAmount`（若已定義且 $>0$）或 `gross - tax` 入帳，確保現金帳本 100% 反映扣除二代健保補充保費後的實收資金（如永豐金入帳 +NT$ 33,250），杜絕資金虛增。
- **Sequential Capital Reduction Deducting Guarantee (減資時序前置扣減與在庫恆等性)**:
  - 現金減資（如 9927 泰銘 28.28% 減資）與後續買賣交易在除息日前依時序精確計算，基準日持股精確反映減資後與後續買進之真實庫存（10,000 股），發放日與退款金額精確對齊官方基準。

### 智慧掃描真實持股對齊、強制重掃狀態重置與精準配息比對 (Smart Scan Real Holding & Rescan Precision) *(新增於 V6.9.1)*

- **Real Holdings Alignment & Reduction Pre-Deduction Exclusion (真實持股基準日對齊與未入帳減資預扣排除)**:
  - 智慧掃描公司行動的基準日持股數（`sharesHeldOnDate`）嚴格依據使用者帳本真實歷史交易（`trades`）在 `exDate - 1`（Last Cum-Date）之收盤在籍股數計算。
  - 虛擬時序引擎僅對實質增加股數之除權配股（`STOCK_DIVIDEND`）與股票分割（`STOCK_SPLIT`）動態累加股數；徹底廢除對未入帳歷史減資（`CAPITAL_REDUCTION`）的預扣，杜絕 9927 泰銘等標的除息持股被誤縮為 7,972 股之失真。
- **Rescan Progress Reset & IndexedDB Cache Penetration (重掃進度條即時重置與 IndexedDB 快取穿透)**:
  - 點擊「強制清除快取重掃」時，立即中斷前次任務並將 `progress` 重設為 `{ current: 0, status: 'scanning' }`，並透過微任務排程刷新 React 載入動畫。
  - 當 `forceRefresh === true` 時，引擎強制跳過 IndexedDB 本機快取讀取，向線上金融端點發起全新連線並覆寫更新本機快取。
- **High-Precision Cash Dividend Matching (現金股利高精準比對與單季刪除補登)**:
  - 取消粗暴的 60 天同類型模糊判定，改為比對 `exDate`/`payDate`，或在 45 天內同時驗證每股配息單價與總金額。手動刪除特定季配息後，重掃 100% 能精確識別為「✨ 待補登」。
- **Statutory Ex-Dividend Date Trading Exclusion (證券法規除息日買進排除)**:
  - 嚴格遵守證券交易法規：除息日（Ex-Date）當天買進之部位不享有該次配息（股數為 0），避免產生重複獲利 (Double Dip) 財務計算錯誤。

### Storage Inspector 快取統計指標解構與字典計數對齊 (Storage Inspector Reconciliation) *(新增於 V6.9.3)*

- **Corporate Action Cache Symbol Extraction & Event Flattening (公司行動快取標的提取與事件展平)**:
  - 解析 `STOCK_TRACKER_CA_CACHE_V1` 實體快取時，提取所有 symbol 鍵以計算真實涵蓋標的數（61 檔），並展平所有事件計算真實總筆數（183 筆），徹底消除 `0 檔 (61 筆)` 之結構性解析錯誤。
- **USD/TWD Historical FX Rate Points Accumulation (美元/台幣單一貨幣對歷史外匯數據點累加)**:
  - 將以日期為 Key 映射之歷史匯率結構正確識別為 `1 對 (USD/TWD)` 幣別對，並將總歷史天數正確累加為 `historicalFxDataPoints`（4,529 點），解決 `4529 對 (0 點)` 之顯示倒錯。
- **Stock Dictionary Cache Total Count Alignment (股票字典庫總收錄檔數全口徑對齊)**:
  - 在 `MarketCacheStats` 中新增 `stockDictionaryTotalCount`，快取檢視器卡片呈現包含內建官方與自訂同步增量在內之全量標的數（3,350 檔），與管理面板保持一致。

### 減資多源去重、虛擬時序動態扣減與交易帳本股息淨額對齊 (Capital Reduction Deduplication & Virtual Timeline Accuracy) *(新增於 V6.9.4)*

- **Multi-Source Capital Reduction Window Deduplication (多資料源減資區間合併去重)**:
  - 在 `fetchLiveCorporateEvents` 整合 Yahoo Finance（反向分割）與 TWSE（官方減資）時，以 $\le 90$ 天為時間視窗進行去重合併，優先採用官方精準基準日與每股退款金額；在 `isAlreadyRecorded` 中建立相近日期減資重複補登攔截防護。
- **Virtual Trades Dynamic Reduction Subtraction (虛擬時序交易池動態扣減減資股數)**:
  - 在 `scanCorporateActions` 內部，對於未入帳之減資事件自動生成 `{ type: 'CAPITAL_REDUCTION', shares: estimatedShares }` 推入 `virtualTrades`，確保後續配息回溯計算基準日持股時（如 9927 泰銘）動態扣減減資股數，徹底杜絕配息股數誤算。
- **Trade History Dividend Payout Net Alignment (歷史交易帳本股息淨額對齊與防重複扣稅)**:
  - `TradeHistoryTable` 呈現台股現金股利時，若已明確設定實收金額 `cashAmount`，直接取用 `cashAmount` 呈現結算金額，杜絕二次扣減二代健保稅費，使歷史交易帳本與台股現金流水帳 100% 吻合。
- **Official 6-Decimal Capital Reduction Precision (官方 6 位精準減資比率對齊)**:
  - 官方備援庫全面對齊集保 6 位精準減資比率（如 9927 泰銘 `0.2828051`），依集保換發新股無條件捨去規則，確保 10,000 股減資精準換發 7,171 股、銷除 2,829 股，消除 1 股浮點截斷誤差。

### 全域借款負債納入應計利息與規費及一鍵結清本利和 (Total Debt Payoff & Accrued Interest Settlement) *(新增於 V6.9.5)*

- **Total Debt SSOT Payoff Amount Alignment (全域借款負債本利和與規費對齊)**:
  - 升級 `calculateOverallLeverageMetrics` 與 `calculatePortfolioExposure`，每筆借款負債統一以 `calculateLoanInterestAndPayoff(loan, asOfDate).totalPayoffAmount`（本金 + 應計未付利息 + 設質三大規費）計算折合台幣總額。
  - 全域淨資產 $\text{NAV} = \text{股市總值} + \text{可用現金(含在途)} - \text{總借款負債}$，精準反映清償後真實淨資產，消除負債低估問題。
- **One-Click Full Payoff & Structured Breakdown Modal (借貸卡片一鍵結清與結構化明細彈窗)**:
  - 於 `CashLedgerWorkspace` 各筆借貸卡片新增「⚡ 一鍵結清」按鈕，彈窗清晰展示償還本金、計息天數與應計利息、設質三大規費細項（撥券/設質/手續費）與應付總額。
- **Split Cash Transactions Automation (現金帳本精準自動拆分記帳)**:
  - 執行一鍵結清確認後，系統自動依明細寫入獨立現金帳本流水：
    - `LOAN_REPAYMENT` (借貸還本)：扣除本金 `principal`
    - `FINANCING_FEE` (融資利息)：扣除利息 `accruedInterest`
    - `WIRE_FEE` (電匯/規費)：扣除設質規費總額 `pledgeFees`
  - 同步將借款未還本金歸零，更新結息日為當日，保持損益與稅務扣抵之可稽核性。

### 增強型 CSV 欄位對齊映射與逐行預覽匯入器 (Enhanced CSV Column Mapping & Row Preview Importer) *(新增於 V6.9.6)*

- **Broker Fingerprint Registry (券商表頭指紋辨識庫)**:
  - 內建國泰證券、富邦證券、永豐大戶投、元大證券、Firstrade、Charles Schwab、IB 等主流券商特徵庫，上傳 CSV 時自動匹配最佳範本並帶入欄位映射。
- **Financial-Grade CSV Sanitizer (金融級 CSV 資料清洗與容錯引擎)**:
  - `csvSanitizer.ts` 支援民國年 (`113/05/20`)、美式 (`05/20/2024`)、純數字 (`20240520`) 標準化。
  - 自動清洗貨幣符號 (`$`, `NT$`)、千分位逗號 (`,`) 與會計負數括號 `(1,000)`。
  - 智慧識別台美券商各類交易動作（買進/賣出/除權息/減資/拆股）並調用股票字典補全代碼與標的名稱。
- **Trade Fingerprint & Smart Deduplication (交易指紋智慧去重模型)**:
  - 以 `date_market_symbol_type_shares_price` 複合鍵計算交易特徵指紋，精確標記 `NEW`、`DUPLICATE`、`INVALID`。
  - 提供「智慧追加去重（推薦）」、「全量快照覆蓋」與「強制全數追加」三種入庫策略，並在全量覆蓋前自動建立時光機快照防呆。

### 除息公告背景自動同步、雙看板垂直拆分與配股配息合併健保扣除 (Background CA Sync & Consolidated NHI Tax) *(新增於 V6.9.7)*

- **Background Corporate Actions Preload Sync (背景靜默自動預載同步)**:
  - 在 `App.tsx` 啟動持股載入後，系統自動於背景發起 `handleSyncCorporateActions(false)`，利用 24H 本地快取與 150ms 節流延遲保護金融端點，無需手動進入「股利日誌」分頁，且介面保留手動強制同步按鈕。
- **Dual Corporate Actions Kanban Board Separation (雙看板獨立垂直拆分與排版占位)**:
  - 將原看板垂直拆分為「⚡ 除息待入帳行事曆 (`status !== 'UPCOMING_EX'`)」與「📢 即將除息公告看板 (`status === 'UPCOMING_EX'`)」兩組獨立 Glass Card。
  - 當無待入帳或無即將除息項目時，各自展示專屬空狀態占位提示卡片，確保版面結構穩定不塌縮。
- **Consolidated Stock & Cash Dividend NHI Tax SSOT (配股配息合併健保扣繳單一事實來源)**:
  - 在 `taxComplianceEngine.ts` 封裝 `resolveEffectiveDividendTaxAndNet`，依法將股票股利面額（每股 NT$10）併入單次給付申報所得計算 2.11% 二代健保，且保費自現金股利代扣。
  - 歷史明細表（`DividendLogView`）、待入帳計算引擎（`receivableDividendEngine`）、報表統計（`dividendAggregator`）與現金帳本自動連動流水（`cashLedgerEngine`）全面採用此 SSOT。
  - **2890 永豐金（持股 31,000 股現金 34,100 元 + 620 股配股面額 6,200 元）**：
    - 股利明細「扣繳稅款/健保」顯示 `-NT$ 850`，實領淨額顯示 `33,250 TWD`。
    - 現金帳本自動連動 `DIVIDEND_PAYOUT` 入帳流水金額精準記錄為 **`+NT$ 33,250`**。

### 資產配置目標偏離度試算與再平衡推薦器 (Target Allocation Drift & Rebalancing Optimizer) *(新增於 V7.0.0)*

- **Target Allocation Model (目標資產配置模型)**:
  - 支援市場大類 (`MARKET`: 'TW' | 'US' | 'CASH') 與個股標的 (`SYMBOL`) 雙軌自訂權重策略，內建「核心市場配置 (台股 40%、美股 40%、現金 20%)」與 $\pm 5\%$ 容忍區間。
- **Dual Rebalance Engine (雙模式再平衡決策引擎)**:
  - `CASH_IN`（定期注水加碼模式）：只買不賣，將新增注水現金依缺口權重分配至低配標的。
  - `FULL_REBALANCE`（全量買賣重置模式）：精確計算超配賣出金額與低配買入金額。
  - 適配台股整張 (1,000 股) 與盤中零股、美股碎股小數點，並估算摩擦成本。

### 樹狀圖納入現金部位與總資產權重統一架構 (Treemap Cash Position & Unified Weight Architecture) *(新增於 V7.1.0)*

- **Unified Total Asset Denominator (全資產分母統一)**:
  - 總資產公式統一為 $\text{TotalAssets} = \sum (\text{StockValue}_{\text{TWD}}) + \max(0, \text{CashBalance}_{\text{TWD}})$。
  - 樹狀圖 (Treemap)、權重清單 (Bars) 與頂部市場分佈條統一以此為分母計算佔比。
- **Dynamic Cash Node Injection (動態現金節點注入與語意分離)**:
  - 當現金餘額 $> 0$ 時自動注入 `CASH_TWD` 節點，採用中性深灰藍石板色（`hsla(215, 25%, 27%, 0.85)` / `#334155`）與板岩灰邊框（`#64748b`），損益固定標示 `0.0%`。
- **3-Way Market Allocation Progress Bar (三段式市場分佈進度條)**:
  - 整合 `🇹🇼 台股 XX.X%` (`#3b82f6`)、`🇺🇸 美股 XX.X%` (`#8b5cf6`)、`💵 現金 XX.X%` (`#10b981`)，提供全景資產配置透視。

### 持股技術指標警示膠囊與智慧操作建議引擎 (Holding Technical Signal Capsules & Action Advisor) *(新增於 V7.2.0)*

- **Technical Signal Capsules (技術與籌碼警示膠囊)**:
  - 專門針對當前持股列提供多維度、多色彩的即時標籤體系：
    - 🟢 偏多/強勢（如 `9日K大幅拉升`、`半年線之上`、`MACD黃金交叉`、`創週新高`）
    - 🔴 偏空/破位（如 `5日線之下`、`月線之下`、`季線之下`、`創單週新低`）
    - 🟡 量價/指標異動（如 `昨日量能注意`、`量縮窒息注意`、`MACD注意`）
    - 🟣 均線結構（如 `均線多頭排列`、`均線糾結`）
- **Deterministic Action Directive Matrix (確定性專家操作建議矩陣)**:
  - 依據訊號加權計分輸出四字定調（如 `【強勢續抱】`、`【逢高減碼】`、`【超跌留意】`、`【盤整觀望】`）與 1~2 句紀律性操作指南。
- **Offline-First Quant Calculation (離線優先量化運算)**:
  - 純前端基於歷史日 K 線計算 MA(5/20/60/120/240)、KD(9,3,3)、MACD(12,26,9)、成交量均量比與極值高低點，零額外 API 成本與零延遲。
- **Moving Average Bias (均線乖離率 Bias %)** *(新增於 V7.2.1)*:
  - 即時計算現價相對 20MA（月線）與 60MA（季線）之偏離幅度，當 $\text{Bias}_{20} \ge +8\%$ 標記短線過熱戒備，當 $\text{Bias}_{20} \le -6\%$ 標記負乖離超跌反彈機會。
- **Multi-Timeframe Confluence (多週期共振結構)** *(新增於 V7.2.1)*:
  - 結合短期（5MA）與長期（60MA）均線方向，自動判定「長空短多 (反彈減碼)」或「長多短空 (拉回止跌)」。
- **Structured Directive Tooltip (結構化定調資訊卡片)** *(新增於 V7.2.1)*:
  - 採 `align="left"` 徹底防截斷排版，分層呈現【四字定調 + 量化得分】➔【操作指南內文】➔【風控紀律標註】。

### 視覺設計系統與金融終端語言 (Design System & Visual Language) *(新增於 V7.3.0)*

**Modern Glassmorphism (現代深色玻璃擬態)**:
以 `--bg-primary: #080c14` 極深底色搭配半透明毛玻璃卡片（`backdrop-filter: blur(16px)`）、微漸變光暈與細緻邊框構成之現代專業金融介面。

**Segmented Pill Switcher (膠囊切換器)**:
將市場（ALL / TW / US）、會計口徑（券商核帳 / 總報酬）、持倉狀態（持倉中 / 已平倉 / 全部）與時間範圍收斂為流暢之膠囊按鈕群組，選中時具備發光漸變高光。

**Financial Tabular Typography (等寬金融排版)**:
全站金額、股數、報酬率與 XIRR 一律採用 `JetBrains Mono` 等寬字型與 `tabular-nums`，確保縱向數據快速掃描時無水平抖動。

**Live Pulse Indicator (即時心跳光點)**:
盤中即時狀態、連線狀態與健康指標採用 CSS 呼吸漸變光點（`pulse-dot-green`），提供即時性操作回饋。

### 漲跌配色切換與提示語意 (Symmetric Color Theme Toggle) *(新增於 V7.3.3)*

**Symmetric Color Theme Label (對稱色彩模式標籤)**:
頂部工具列切換按鈕一律完整呈現漲跌雙色球與標籤文字（台股模式為 `🔴 紅漲 🟢 綠跌`，國際/美股模式為 `🟢 綠漲 🔴 紅跌`），消除單色標籤造成的認知衝突。

**Dynamic Contextual Tooltip (動態情境式切換提示)**:
當滑鼠懸浮於調色盤按鈕時，動態展示雙行「目前生效模式」與「點擊切換目標」，提供透明且可預期的操作回饋。

### 樹狀圖納入借款與負債槓桿視覺化架構 (Treemap Debt & Leverage Visualization Architecture) *(新增於 V7.4.0)*

- **Capital Employed Positive Geometry (資本來源正幾何模型)**:
  - 樹狀圖維持以總資產 $\text{TotalAssets} = \sum \text{StockValue} + \max(0, \text{CashBalance})$ 為分母，當存在未結清借款（$\text{totalDebt} > 0$）時，以正數面積動態注入 `DEBT_TWD` 借款節點，直觀呈現負債相對總資產之槓桿份量。
- **Amber Warning Visual Semantics (琥珀警示視覺語意)**:
  - 借款節點採用專屬高對比琥珀金配色（`hsla(38, 92%, 50%, 0.85)` / `#f59e0b`）與深琥珀外框，標註負債金額與年化借款利率，與持股漲跌（紅/綠）及現金（深灰藍）形成明確視覺三態。
- **Auxiliary LTV Indicator Capsule (獨立 LTV 槓桿負債比膠囊)**:
  - 頂部市場進度條維持「台股 / 美股 / 現金」三段純資產百分比；右側比例欄位動態注入 `🏦 負債比 LTV: XX.X%` 琥珀色膠囊，零借款時自動隱藏。
- **Hierarchical Debt Contract Inspection (借貸合約階層式透視 Tooltip)**:
  - 懸浮於借款區塊時，彈出多層次結構化 Tooltip，羅列各筆借款名稱、類別（質押/融資/信貸）、本金、利率與擔保品狀況。


### 歷史現金股利入帳日與除息日時序分離架構 (Dividend Log View Temporal Separation) *(新增於 V7.6.0)*

- **Ex-Date vs Pay-Date Temporal Separation (除息日與入帳發放日時序徹底分離)**:
  - **除息日 (Ex-Date)**：債權成立與假性虧損平滑日。系統內部以 TradeRecord.date 或 TradeRecord.exDate 標示除息基準日。
  - **發放日 (Pay-Date)**：資金實質到帳日 (TradeRecord.payDate)。歷史現金股利入帳明細表第一欄主視覺醒目顯示實際入帳日，副視覺灰字標註除息基準日。
  - **入帳日倒序排列 (Effective Pay-Date Descending Sort)**：歷史明細表排序依據由原先之 date 改為優先依 effectivePayDate 由新到舊倒序排列，若發放日相同則依除息基準日排序。
  - **永豐金 (2890) 官方入帳日校正**：將 2890 現金股利預估/官方發放日基準校正為 2026-08-24。

### 籌碼與聰明錢動態觀察儀 (Smart Money Flow & Bubble View Architecture) *(新增於 V7.7.0)*

- **Beginner-Friendly Four-Quadrant Model (零基礎小白友善四象限動態模型)**:
  - 橫軸（X 軸）：個股實質漲跌動能 ($-100 \sim +100$)。
  - 縱軸（Y 軸）：大機構聰明錢進出強度評分 ($-100 \sim +100$)。
  - 四大生活化定調象限：
    - **🔥 主力抬轎飆股區 (右上 Breakout)**：大機構合力買進、股價強勢推升。
    - **🛡️ 逢低撿便宜區 (左上 Accumulation)**：股價回檔但大機構逆勢偷偷吃貨。
    - **⚠️ 割韭菜警戒區 (右下 Distribution)**：股價看似上漲但大機構逢高倒貨出逃。
    - **❄️ 冷凍提款區 (左下 Liquidation)**：股價下跌且大機構大舉提款撤退。
- **Cross-Market Official Data Pipeline (跨市場官方一手籌碼資料管線)**:
  - **台股 (TW)**：直連 TWSE 官方開放日報 `fund/T86`，單次拉取三大法人買賣超，搭配交易日自動回推與 IndexedDB 快取。
  - **美股 (US)**：採用 Chaikin Money Flow (CMF 20 日佳慶資金流向指標)，以官方日 K 向量化評估主力吸籌與出貨強度。
- **Timeline Motion Player & Trails (時序動態回放與彗星尾巴)**:
  - 提供播放、暫停、倍速與時序滑桿，以半透明虛線動態描繪個股過去多日的四象限資金位移軌跡。

### 泡泡圖自適應縮放、2D 防碰撞排斥與聚光燈佈局系統 *(新增於 V7.8.0)*

- **Adaptive Power-Law Scaling (自適應相對冪次縮放)**:
  - 廢除靜態寫死上限，自動取當前全清單中買賣超最大值 $|\text{flow}|_{\max}$ 與漲跌幅最大值 $|\Delta P|_{\max}$ 為基準動態歸一化。
  - 採用 $0.65$ 次方平滑曲線，將坐標限制於 $[-75, +75]$ 區間內，上下左右保留至少 25% 呼吸安全區，徹底根除貼壁現象。
- **2D Circle Collision Relaxation Engine (2D 圓形防碰撞排斥純函數演算法)**:
  - 純原生數學 8 輪物理放鬆迭代，檢測兩圓距離 $\text{dist} < r_1 + r_2 + 4\text{px}$，沿連心線方向平滑推開。
  - **Quadrant Invariant Guard (象限守恆守門員)**：推擠時加入中軸安全邊界約束（$X=0$ 與 $Y=0$），泡泡絕對不跨越中軸進入其他象限，保持多空分類 100% 精準。
- **SVG DOM Spotlight Ordering (DOM 頂層繪製排序與滑鼠聚光燈模式)**:
  - 滑鼠懸浮或選中泡泡時，自動排序至 SVG DOM 末尾渲染，保證最頂層顯示；其餘泡泡透明度降至 $0.25$，達成極致視覺聚焦。

### 籌碼時序動態播放、美股 CMF 日 K 管線與本地歷史增量庫 *(新增於 V7.9.0)*

- **Dynamic Temporal Playback Binding (時序動態位移綁定與漸進尾巴)**:
  - 泡泡渲染實體依 `currentDateIndex` 即時提取對應 `b.trail[currentDateIndex]` 坐標並經過防碰撞佈局，配合 CSS 0.4s 平滑移動；彗星尾巴隨時間前進漸進展開 `slice(0, index + 1)`，徹底修復播放器假跑 Bug。
- **US 20-Day Daily Candles CMF Pipeline (美股 20 日量價 Candles 注入管線)**:
  - 為美股標的注入具備實質量價結構之日 K 棒（高低開收量），使 Chaikin Money Flow 演算法真實反應機構吸籌與出貨動能，擺脫 Y=0 死線。
- **US Focus Top 30 Universe (美股機構焦點 Top 30 宇宙)**:
  - 全市場模式切換至美股時，完整支援 NVDA, AAPL, MSFT, TSLA, PLTR, TSM 等 30 檔高流動性代表股之四象限籌碼星圖。
- **Local Incremental Chips Ingestion Engine (本地歷史籌碼增量持久化引擎)**:
  - 由近到遠比對 IndexedDB `TWSE_T86_CHIPS_{YYYYMMDD}`，僅對缺少之交易日發起輕量拉取，以時間換資料，在本地累積專屬真實籌碼庫。

### 聰明錢二維空間正交排斥散度、時序影格圖卡同步與機構共振決策系統 *(新增於 V8.0.0)*

- **2D Orthogonal Spatial Dispersion (二維空間正交排斥散度)**:
  - 在物理放鬆迭代中，若相鄰重疊泡泡在 Y 軸上高度極度接近 ($|\Delta y| < 6$)，演算法主動注入垂直正交微擾動 $dy = \text{orthoSign} \times \max(6, \text{minDist} \times 0.45)$，打破水平單向推擠造成的「一字排開烤肉串」視覺問題，自然展開為二維蜂巢狀錯落。
  - 同時將泡泡半徑上限自適應收斂於 `16px ~ 36px`，避免極端巨型泡泡遮蔽視線。
- **Small-Bubble Top-Layer Ordering (小球優先頂層繪製)**:
  - SVG 渲染時，將非 active 泡泡依半徑降序排序（大球先畫於底層，小球後畫於頂層），確保交疊邊界中小球 100% 位於頂層，滑鼠移上去時能精確拾取與 Hover，徹底消滅「大球吞小球」的訊息遺漏。
- **Temporal Frame Sync Tooltip (時序影格同步圖卡)**:
  - 透過 `getTemporalBubbleFrameData(bubble, dateIndex, dateStr)`，當時間軸前進時，Tooltip 懸浮浮窗中的日期標籤（如 `📅 2026-09-03`）、當日實質漲跌幅、動態四象限標籤與生活化診斷結論隨影格即時跳動，杜絕數值鎖死在最新一天的靜態假象。
- **Institutional Synergy Decision Model (機構共振決策模型)**:
  - 專業券商與經理人視角之籌碼力道辨析：
    - **🚀 DUAL_BUY (土洋合買抬轎)**：外資與投信多頭強烈共振，籌碼鎖定力道最為堅固。
    - **⚡ TUG_OF_WAR (土洋對作激戰)**：外資買投信賣（或外資賣投信買），盤面激烈換手，多空分歧巨大，嚴禁因代數加總為零而誤判為「進出平衡」。
    - **💣 DUAL_SELL (土洋同步調節)**：法人雙向大舉提款，短線賣壓沉重。
    - **NEUTRAL (中立平穩)**：無顯著機構共振。
  - 在圖卡中以獨立徽章醒目呈現，白話診斷明確揭示主力多空對決與換手實況。

### TPEx 櫃買三大法人管線、圖卡對角智慧避讓與雙向正交蜂巢排斥 *(新增於 V8.1.0)*

- **TPEx Institutional Daily Report Pipeline (櫃買中心上櫃三大法人日報雙軌管線)**:
  - 透過 `parseTpexInstitutionalReport` 解析櫃買中心官方日報，將 `8299 群聯` 等上櫃股票股數轉換為張數。
  - 增量抓取時並行請求 TWSE 與 TPEx 並合併聯集，徹底解決上櫃標的數據為 0 的資料盲區。
- **Smart Diagonal Pinning Tooltip (圖卡象限對角智慧避讓)**:
  - 透過 `calculateTooltipPlacement(cx, cy, width, height)`，依據目標泡泡坐標動態對角定位（左半側停靠右側、下半部停靠頂部），徹底消滅浮窗遮蔽目標泡泡的自蓋盲區，100% 露出泡泡本體。
- **Bidirectional Orthogonal Dispersion (雙向正交蜂巢排斥)**:
  - 在 `resolveBubbleCollisions` 中同時支援水平串與垂直串排斥：$|\Delta y| < 6$ 時注入垂直正交力，$|\Delta x| < 6$ 時注入水平正交力，徹底消除債券/反向 ETF 垂直串成一列的糖葫蘆現象。
- **Zero-Volume Neutral Guard (法人零量能中立保護診斷)**:
  - 當三大法人買賣超為 0 張時，標籤顯示為「散戶/量縮偏弱區」，文案說明三大法人進出平緩，杜絕驚悚矛盾詞彙。

### TPEx 櫃買三大法人 24 欄解析器升級、V3 快取換代與畫布點擊取消選取 *(新增於 V8.2.0)*

- **Official 24-Column TPEx Parser (官方 24 欄日報標準解析器)**:
  - 修正資料提取路徑為 `rawData.tables?.[0]?.data`，相容 `data` 與 `aaData`。
  - 精確解析外資及陸資合計 `row[8..10]`、投信 `row[11..13]`、自營商合計 `row[20..22]` 與三大法人合計 `row[23]`，並以除以 1,000 四捨五入換算為張數，8299 群聯展現實質法人數據，徹底消除虛假 0 張。
- **V3 Cache Invalidation & Isolation (三大法人日報 V3 快取換代與污染隔離)**:
  - 快取鍵名前綴升級為 `TWSE_TPEX_CHIPS_V3_`，自動淘汰與作廢過去殘缺的舊快取，確保全市場上市櫃股票均獲取最新雙軌籌碼。
- **Canvas Blank Click Unselect & Stop-Propagation (畫布空白點擊取消選取與事件冒泡隔離)**:
  - 主 SVG 畫布區域及其 `<svg>` 元素綁定 `setSelectedBubble(null)`，點擊任何畫布空白處即可清空選取。
  - 標的泡泡節點 `<g>` 加入 `e.stopPropagation()`，防止選取泡泡時事件冒泡觸發畫布取消事件。
- **Pinned PointerEvents & Close Button (浮窗固定指針穿透配置與 ✕ 快捷關閉按鈕)**:
  - `calculateTooltipPlacement` 支援 `isPinned` 參數：未固定 (Hover) 時 `pointerEvents: 'none'`，固定模式時 `pointerEvents: 'auto'`。
  - 浮窗內點擊加入 `e.stopPropagation()` 避免誤觸關閉，右上角提供顯著「✕」按鈕，賦予直覺的關閉體驗。

### 證交所 TWSE 本地代理管線接入與時序影格三大法人張數動態跳動 *(新增於 V8.3.0)*

- **TWSE Proxy Pipeline (證交所官方網域 Vite 本地代理路由接入)**:
  - 在 `vite.config.ts` 增設 `/api/twse-www` 反向代理對準 `https://www.twse.com.tw`，並於 `src/engine/priceFetcher.ts` 接入 `targetUrl.startsWith('https://www.twse.com.tw')` 路由轉換。
  - 徹底根除前端瀏覽器 CORS 政策阻擋，上市（TWSE）與上櫃（TPEx）雙軌日報全面透過本地代理高速穩定拉取，徹底解決上市股票法人張數為 0 的痛點。
- **Temporal Institutional Shares Sync (時序影格三大法人張數動態跳動)**:
  - 擴充 `SmartMoneyBubbleData.trail` 與 `SmartMoneyInputItem.historicalDailyFlows` 型別：納入各日 `foreignNetShares`、`trustNetShares`、`dealerNetShares`、`cmf`。
  - `ChipsWorkspace.tsx` 生成時序位移點時注入動態推算之各日法人數據。
  - `getTemporalBubbleFrameData` 從當前影格動態抽取出該日法人張數與 CMF，並傳入當日實質淨流向金額以重新評估生活化診斷。
  - `SmartMoneyBubbleChart.tsx` 中 `formatInstitutionalDetailText` 改為接收當前影格資料，隨時間軸推進（T-4 ➔ T-3 ➔ T-2 ➔ T-1 ➔ T）即時跳動更新，徹底消滅張數鎖死在最後一天的靜態假象。

### TWSE 全市場覆蓋健全檢查、V4 快取換代、美股 CMF 診斷隔離與時序象限動態連動 *(新增於 V8.4.0)*

- **TWSE Market Coverage Guard & Sentinel (全市場覆蓋健全檢查與上市哨兵)**:
  - 透過 `isMarketCoverageValid` 以 `2330 台積電` 作為上市資料健康哨兵。若讀取快取發現缺少 2330，代表先前僅有上櫃資料回傳，判定為殘缺快取並拒絕使用，強制重新拉取全市場日報。
  - 同時升級 IndexedDB 快取前綴為 `TWSE_TPEX_CHIPS_V4_`，徹底作廢過去被殘缺日報污染的舊快取。
- **US CMF Isolated Diagnosis & Anti-Hallucination Guard (美股 CMF 專屬診斷與三大法人字眼絕對隔離)**:
  - `getBeginnerDiagnosis` 擴充 `market?: MarketType` 與 `cmf?: number` 參數。
  - 美股 (US) 標的絕對阻斷任何「三大法人」、「外資」、「投信」、「自營商」字眼，依據 CMF 數值（吸籌 >+0.15、出貨 <-0.15、觀望中立 ±0.15）與漲跌幅輸出大白話生活化說明。
- **US Dynamic CMF Temporal Trajectory (美股量價時序軌跡 CMF 注入)**:
  - 在 `ChipsWorkspace` 持倉模式中，美股先生成量價日 K 棒並計算基礎 CMF，並於 5 日時序軌跡注入各日 `cmf` 與 `netFlowAmount`（`cmf * volume * price`），使 VT 等美股標的在時序播放時呈現真實的機構資金推升位移。
- **Reactive Temporal Quadrant Indicator Cards (頂部四象限指標卡即時響應動態連動)**:
  - 頂部「🔥 主力抬轎區、🛡️ 逢低撿便宜區、⚠️ 割韭菜警戒區、❄️ 冷凍提款區」統計卡，綁定 `currentFrameCounts`，依據 `currentDateIndex` 滑桿位置即時重算當日影格中各標的所處之四象限檔數，徹底消除時序切換時指標數字凍結在最新一天的脫鉤現象。
### 動態影格象限色彩同步、象限邊界守門員與時序籌碼一致性 *(新增於 V8.5.0)*

- **Dynamic Frame Quadrant Coloring (動態影格象限色彩同步)**:
  - 徹底解決第三象限（左下角「❄️ 冷凍提款區」）氣泡呈現黃色之錯亂問題：`SmartMoneyBubbleChart.tsx` 中 `placedBubbles` 依據當前影格坐標即時重新換算 `dynQuadrant`，且 `getBubbleFillColor` 與 `getBubbleStrokeColor` 支援 `overrideQuadrant` 傳入當日真實象限。
  - 只要泡泡坐標落於第三象限（$x < 0, y < 0$），顏色 100% 強制為冰霜冷灰藍色 (`rgba(100, 116, 139, 0.4)` / `#94a3b8`)，**絕對杜絕出現黃色**。
- **Strict Quadrant Boundary Guard (象限邊界零軸守門員)**:
  - 修正 `smartMoneyEngine.ts` 中象限邊界判定：嚴格限定 $x < 0$ 且 $y > 0$（實質法人大買）才歸入第二象限 `ACCUMULATION`（逢低吸籌黃色）；$y \le 0$（零法人動作或倒貨）且 $x < 0$ 嚴格歸入 `LIQUIDATION`（冷凍提款區，灰色），消滅零籌碼動作被誤判為吸籌黃色的根本病根。
- **Temporal Neutral Fallback (時序流向缺損平滑中立降級)**:
  - 修正 `ChipsWorkspace.tsx` 中 `baseFlow`：當外部籌碼數據缺損時，設為 `0` 而非 `(todaysPnLPercent)/5`，避免在法人數據尚未加載時將下跌股票偽造為大舉倒貨負向位移。

### 象限色彩動態連動使用者習慣燈號與籌碼資料本地化增量補足 *(新增於 V8.6.0)*

- **Adaptive Color Theme Quadrant Sync (象限顏色動態連動使用者燈號習慣)**:
  - 透過 `getQuadrantWatermarkColors(colorTheme)` 與 `getChipsQuadrantCardStyles(colorTheme)`，將四象限浮水印 SVG 文字及頂部統計指標卡片全面連動使用者的色彩心智模式。
  - 當設定為「🟢 綠漲 🔴 紅跌」(`international`) 時：
    - 「🔥 主力抬轎飆股區」全面切換為多頭代表綠色 (`#10b981` / `#34d399`)。
    - 「⚠️ 割韭菜警戒區」全面切換為危險/空頭代表紅色 (`#ef4444` / `#f87171`)。
  - 當設定為「🔴 紅漲 🟢 綠跌」(`taiwan`) 時：
    - 「🔥 主力抬轎飆股區」為紅色，「⚠️ 割韭菜警戒區」為綠色。
- **Local Incremental Chips Hydration (籌碼資料本地化儲存背景增量補足 - 時間換空間)**:
  - 頁面掛載時優先以 IndexedDB 既有日報完成毫秒級首屏渲染，背景非同步發起 `fetchRecentTwseReports(5)` 漸進向後探尋並沉澱最近 5 個交易日之 TWSE + TPEx 全市場法人日報至本地 IndexedDB。
  - 透過 `buildHoldingHistoricalFlows` 輔助函式，當本地已沉澱歷史日報時，時序播放器各影格（T-4 ~ T）100% 精準對齊真實歷史日報的外資、投信、自營商買賣超張數與量化分數，未補齊前平滑降級為係數模擬。
  - 頂部資訊列增設本地歷史籌碼增量儲存狀態徽章，明確回饋使用者「時間換空間」的本地日報沉澱天數與狀態。

### 籌碼動態星圖市場篩選隔離與 Header 狀態雙向同步 *(新增於 V8.8.0)*

- **Market Focus Isolation (市場標的嚴格隔離輸出)**:
  - 抽離純函數 `filterMarketFocusList`：在「全市場法人焦點 Top 30」模式下，`US` 模式保證輸出純美股 Top 25 標的，零台股混雜；`TW` 模式保證輸出純台股 Top 30 標的，零美股混雜；`ALL` 模式則由台股焦點 Top 20 與美股巨頭 Top 10 均衡呈現。
- **Bidirectional Header Sync (頂部市場切換雙向連動)**:
  - `<ChipsWorkspace>` 與頂部 `<Header>` 之 `currentMarket` 建立雙向狀態綁定，解決跨視圖切換市場狀態脫鉤痛點，並解鎖工作區內市場切換按鈕於所有模式常駐可見。

### 台股加權指數 Benchmark 全歷史日線與全市場股票字典補全 *(新增於 V8.9.0)*

- **TAIEX Official Benchmark (台股加權指數官方大盤基準)**:
  - 在 `BenchmarkType` 正式擴充 `'TAIEX'`，並於 `benchmarkConstants.ts` 引入 `TW_TAIEX_BENCHMARK_HISTORY`（收錄自 2020 年至今完整每日加權指數日線收盤價），同時補齊 `0050` 每日收盤點位。
  - `PortfolioGrowthChart.tsx` 擴充支援加權指數基準切換按鈕與歸一化時間序列對齊，使夏普值、Beta 係數、詹森阿爾法 (Alpha) 計算具備真實市場日線精度。
- **Full Market Stock Dictionary Sync (全市場 2,280+ 檔股票字典離線補全)**:
  - 整合外部官方全市場數據庫，透過 `isValidTaiwanSecurity` 嚴格過濾短期權證與可轉債，將 `src/data/stockDictionary.ts` 台股標的全面擴充至 2,285 檔（含新興主動型 ETF 如 00400A、00403A，債券 ETF 與中小型上櫃股票）。
  - 達成 100% 離線繁體中文名稱解析，零依賴外部 OpenAPI 網路同步。

### 客戶端 API 速率限制與 429 熔斷防禦架構 *(新增於 V8.9.0 / ADR #0090)*

- **Token Bucket Rate Limiting (網域獨立權杖桶速率節流)**:
  - 核心模組 `ClientRequestScheduler` (`src/engine/rateLimiter.ts`) 針對外部金融 API 實施網域獨立平滑節流（Yahoo Finance 最大 5 突發/每秒補 3，TWSE/TPEx 最大 3 突發/每秒補 2），防止並發請求衝垮外部伺服器。
- **Concurrency Pool (連線並發槽位限制)**:
  - 限制單一網域或全域同時間在線的 HTTP 請求數上限（預設 2~3），防止大量非同步請求佔滿瀏覽器同源連線池並導致主執行緒卡頓。
- **Circuit Breaker & 429 Backoff (HTTP 429 自動熔斷與指數退避冷卻)**:
  - 當外部 API 回傳 `HTTP 429 Too Many Requests` 或 `503` 時，自動觸發熔斷器進入 30 秒冷卻期，在冷卻期內自動阻斷或排隊延遲向該網域的新請求，並內建指數退避與隨機抖動 (Jitter)，徹底阻絕連環轟炸導致 IP 被封鎖數小時的系統性癱瘓風險。
- **Zero-Disruption Proxy Adapter (無痛代理中介層整合)**:
  - 深度整合於 `fetchWithCORSProxy`，自 URL 自動解析真實目標主機名稱，既有報價抓取、歷史價格同步與公司行動掃描模組零改動即刻獲得全域速率防護。

### 本地全量歷史技術指標庫與肌肉書僮量化體系 *(新增於 V8.10.0 / ADR #0091)*

- **Darvas Box Theory (肌肉書僮箱子戰術與三日法則)**:
  - 連續 3 日未創新高確認有效箱頂阻力，連續 3 日未創新低確認有效箱底支撐。依據當前收盤點位即時判定 `BREAKOUT_UP` (強勢突破)、`BREAKOUT_DOWN` (弱勢跌破) 或 `INSIDE_BOX` (箱內盤整)。
- **MA Deduction & Time-Telescope (均線扣抵望遠鏡與底穿上假跌破)**:
  - 精確計算 5 日與 20 日（生命線）扣抵價格，提前 1~3 天推導均線翻揚 (`UP`) 或下彎 (`DOWN`) 拐點。
  - 盤中跌破支撐但收盤強勢收復且下影線 $\ge 50\%$ 振幅時，自動標記為「底穿上 (Bottom Penetration Rebound)」主力獵殺反轉型態。
- **Bollinger Squeeze (布林通道極致壓縮)**:
  - 動態計量帶寬 $\text{BW} = \frac{\text{Upper} - \text{Lower}}{\text{Mid}} \times 100\%$，當 $\text{BW} \le 8\%$ 時標記為極致壓縮狀態，預警主力蓄勢變盤。
- **ATR Trailing Defense (ATR 動態移動防守價)**:
  - 依據 14 日真實波動區間 (ATR)，計算 $\text{波段最高價} - 2.5 \times \text{ATR}_{14}$，為短線波段提供客觀量化防守停損線。
- **Trust-to-Net-Volume Ratio (投量比與當沖水分過濾)**:
  - 公式 $\frac{\text{投信買超張數}}{\max(1, \text{成交量} - \text{當沖量})} \times 100\%$，過濾短線虛胖量能，洞察投信主力真實鎖碼強度。
- **Historical OHLCV & Indicators Store (全量日 K 與指標本地持久化)**:
  - IndexedDB 升級至版本 3，新增 `historicalOhlcv` 與 `technicalIndicators` 物件庫，實現掛牌以來全量數據離線秒開與增量回補。

### 雙重動能與跨資產趨勢輪動評分架構 *(新增於 V8.11.0 / ADR #0092)*

- **12-1M Weighted Momentum (長短週期加權動能評分)**:
  - 核心計算模型採用 Gary Antonacci 雙重動能與學術實證的 12-1M 複合動能架構：
    $$\text{Score} = 0.5 \times R_{12M} + 0.3 \times R_{6M} + 0.2 \times R_{3M}$$
  - 當設定 `skipRecentMonth = true` 時，以 $T-21$ 交易日為計算終點，剔除最近一個月的短期均值回歸雜訊，捕捉穩健的中期結構性趨勢。
- **Relative Momentum Leaderboard (相對動能跨資產強弱排序)**:
  - 在指定資產池中依加權綜合動能分數由高至低排列，精確定位表現最亮眼的領頭羊標的。
- **Absolute Momentum Safe Haven (絕對動能過濾與現金避風港狀態機)**:
  - 檢驗動能榜首標的之年化報酬是否高於無風險利率（預設 4% 或台美短債基準）。
  - 若榜首標的未能超越無風險報酬或全池資產動能均為負，系統自動判定進入防禦避險狀態 (`safeHavenActive = true`)，並建議退守至預設避風港標的（如 BIL / SGOV / 00712B / 現金）。
- **Predefined Strategic Universes (三大策略資產池)**:
  - 系統預先載入「全球巨觀 ETF 核心輪動 (SPY / QQQ / TLT / GLD)」、「台股高息與市值版塊輪動 (0050 / 0056 / 00713 / 00919 / 006208)」與「美股美債對沖輪動」，支援投資人進行多層次宏觀資產配置決策。
