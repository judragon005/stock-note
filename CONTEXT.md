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

### 持倉排序規範 (Holdings Sort Standard) *(新增於 V1.8)*

**Holdings Multi-Tier Sort (持倉雙階自然排序)**:
持倉清單展示嚴格遵循「台股優先、美股置底；同市場內依代碼字母數字升冪 (Natural Alphanumeric Sort)」之排序準則，確保如 `00403A`、`0050`、`00981A`、`2330`、`9927`、`VT` 之穩定清晰閱覽體驗。

### 技術債管理機制 (Technical Debt Registry) *(新增於 V1.9)*

**Technical Debt Registry (技術債索引看板)**:
位於 `docs/debts/` 之架構改善集中存放區，採編號獨立檔案與四段式結構管理未在當期 PR 即時修改之架構建議，區分 P1/P2/P3 優先級並定義明確觸發時機。









