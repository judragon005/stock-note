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



