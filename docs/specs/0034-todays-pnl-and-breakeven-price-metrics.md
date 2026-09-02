# 需求規格說明書：交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) 體系

- **規格編號**：`0034`
- **對應技術債**：[#0015 交易員盤中當日損益與精確損益平衡保本價](file:///d:/APP/股票紀錄/docs/debts/0015-trader-today-pnl-and-breakeven-price-metrics.md) · [#0013 現金減資超額退款與碎股精度](file:///d:/APP/股票紀錄/docs/debts/0013-capital-reduction-excess-cash-accounting-and-precision.md)
- **狀態**：`READY_FOR_REVIEW`
- **優先級**：`P1`
- **領域標籤**：`Trader` · `Metrics` · `Holdings` · `Accounting` · `Precision` · `UI`

---

## 1. 問題陳述 (Problem Statement)

目前股票紀錄系統在持股列表與頂部總覽中，已提供「累計未實現損益」、「已實現損益」與「XIRR 年化報酬率」，但針對投資人盤中動態盯盤與出場決策時，存在以下關鍵痛點：

### 1.1 缺乏「今日總損益 (Today's PnL)」盤中動態看板
- 系統的報價引擎 (`priceFetcher.ts`) 雖然已抓取並快取每檔標的的「昨日收盤價 (`previousClose`)」與「漲跌幅 (`changePercent`)」，但並未在**整戶總覽卡片**與**持股清單**中計算「今天到底賺賠多少錢（實體金額）」。
- 投資人進入 App 時無法一眼看出當日市場波動對自身總資產造成的淨增減金額（例如「今日 +NT$18,500 (+1.25%)」），大幅降低了即時盯盤的實用性。

### 1.2 「損益平衡保本價 (Breakeven Price)」需心算且常失準
- 投資人欲出場賣出持股以求「完全不賺不賠、保本解套」時，平均買進成本（Avg Cost）並不能代表真正的保本價。
- 因為賣出時券商會扣除**賣出手續費**（受券商折讓率與最低低消 20 元影響）以及政府收取的**證券交易稅**（現股 0.3%、股票 ETF 0.1%、債券 ETF 0%）。
- 投資人必須手動按計算機逆推，或往往因為忽略手續費與稅金而在平手出場時產生隱形虧損。

### 1.3 現金減資退款邊界吞噬與碎股浮點數精度微幅漂移 (技術債 #0013)
- 既有 `src/engine/calculator.ts` 在現金減資退款大於庫存成本時，使用 `Math.max(0, cost - refund)`，導致超額退款現金被吞噬、整戶總損益短少。
- 美股 0.0001 碎股運算缺乏萬分位強制收斂防線。

---

## 2. 解決方案 (Solution Overview)

本規格遵循 KISS 原則與第一性原理，建置**「交易員盤中當日損益與精確損益平衡保本價體系」**：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        雙核心量化與交易員指標引擎                      │
├────────────────────────────────────┬───────────────────────────────────┤
│    1. 盤中當日損益 (Today's PnL)   │   2. 精確損益平衡保本價 (Breakeven)│
│  - 個股當日盈虧金額與百分比        │  - 代數精確逆推 (含稅、費、折讓)   │
│  - 整戶/台美分市場當日動態盈虧彙總  │  - 支援台股/美股/ETF/債券差額補償 │
│  - 跨幣別匯率即時折算               │  - 持股列表與明細即時標記          │
└────────────────────────────────────┴───────────────────────────────────┘
```

1. **核心計算引擎擴充 (`src/engine/calculator.ts`)**：
   - 擴充 `HoldingPosition` 結構，注入 `todaysPnL`、`todaysPnLPercent`、`todaysChange`、`breakevenPrice`。
   - 擴充 `PortfolioSummary` 與 `MarketSummarySlice`，彙整 `todayPnL` 與 `todayPnLPercent`。
   - 提供專屬保本價精確求解器 `calculateBreakevenPrice(shares, totalCostBasis, market, symbol, account)`。
   - 內建修復現金減資超額退款轉列已實現損益與美股碎股精度收斂。
2. **頂部總覽看板全新「今日損益卡片」 (`SummaryCards.tsx`)**：
   - 首頁頂部總覽新增/整合「今日損益 (Today's PnL)」獨立資訊卡（或於總市值卡片動態展示今日變化）。
   - 呈現今日波動總金額、漲跌百分比與紅綠動態主題色。
3. **持股表格交易員欄位 (`HoldingsTable.tsx`)**：
   - 現有市價欄位整合「今日損益金額 (Today's PnL)」與「漲跌幅」。
   - 成本均價旁新增「保本價 (Breakeven)」標註或獨立欄位切換，讓投資人清晰得知出場價格門檻。

---

## 3. 使用者故事 (User Stories)

1. **作為每日盤中看盤的投資人**，我希望在首頁總覽一目了然看見「今天全戶總共賺/賠多少金額與百分比」，不必自己逐檔加總。
2. **作為準備獲利了結或停損解套的交易員**，我希望在持股清單中直接看到每檔股票計入所有賣出手續費與證交稅後的「精確保本單價」，精確掌控掛單出場時機。
3. **作為擁有多家券商不同手續費折讓的投資人**，我希望保本價能精準依據該持股綁定的「券商帳戶折讓率（如國泰 2.8 折、永豐 2 折）」與「最低手續費門檻」自動推算。
4. **作為台股 ETF 與債券 ETF 投資人**，我希望保本價計算能自動識別股票型 ETF (0.1% 稅) 與債券型 ETF (0% 免稅)，提供 100% 稅務真實的保本價。
5. **作為美股投資人**，我希望美股持股以 USD 計算今日損益與保本價，而在全市場視圖時能自動依即時匯率折算台幣計入全戶今日損益。
6. **作為遇到現金減資退款高於持股成本的存股族**，我希望超過成本的退款能自動轉列為「已實現利得」，確保總損益不失真。

---

## 4. 數學公式與演算法規範 (Mathematical Specification)

### 4.1 當日損益 (Today's PnL)

#### (1) 個股層級 (Security Level)
給定持有股數 $S$、當前市價 $P_{\text{curr}}$、昨日收盤價 $P_{\text{prev}}$：
- **今日每股價差**：$\Delta P = P_{\text{curr}} - P_{\text{prev}}$
- **今日漲跌幅 (%)**：
  $$\text{changePercent} = \begin{cases} \frac{\Delta P}{P_{\text{prev}}} \times 100\%, & \text{若 } P_{\text{prev}} > 0 \\ 0\%, & \text{若無昨收價} \end{cases}$$
- **今日持股市值損益金額**：
  $$\text{todaysPnL} = S \times (P_{\text{curr}} - P_{\text{prev}})$$

#### (2) 整戶層級 (Portfolio Level)
- **整戶今日損益金額 ($TWD$)**：
  $$\text{todayPnL}_{\text{TWD}} = \sum_{i \in \text{TW}} \text{todaysPnL}_i + \sum_{j \in \text{US}} (\text{todaysPnL}_j \times \text{Rate}_{\text{USD/TWD}})$$
- **整戶今日基準總市值 (昨收總市值)**：
  $$\text{prevTotalMarketValue} = \text{currentTotalGrossMarketValue} - \text{todayPnL}$$
- **整戶今日漲跌百分比**：
  $$\text{todayPnLPercent} = \begin{cases} \frac{\text{todayPnL}}{\text{prevTotalMarketValue}} \times 100\%, & \text{若 } \text{prevTotalMarketValue} > 0 \\ 0\%, & \text{其他} \end{cases}$$

---

### 4.2 精確損益平衡保本價 (Breakeven Price Solver)

#### (1) 定義與目標函數
保本價 $P_{\text{be}}$ 定義為：**以單價 $P_{\text{be}}$ 將庫存股數 $S$ 全數賣出，扣除預估賣出證交稅與預估賣出手續費後的「淨變現金額 (Net Proceeds)」，恰好等於當前持倉的總投入成本 $\text{totalCostBasis}$**。

$$\text{Net Proceeds}(P_{\text{be}}) = \text{grossMarketValue}(P_{\text{be}}) - \text{Tax}(P_{\text{be}}) - \text{Fee}(P_{\text{be}}) \ge \text{totalCostBasis}$$

#### (2) 稅率與費率參數
- **證交稅率 $t$**：
  - 美股：$t = 0$
  - 台股債券 ETF (代碼以 `B` 結尾)：$t = 0$
  - 台股股票 ETF (代碼以 `00` 開頭)：$t = 0.001$
  - 台股一般現股：$t = 0.003$
- **手續費率 $f$ 與最低低消 $M$**：
  - 台股標準公定費率 $0.001425$，折讓後實質費率 $f = 0.001425 \times \text{discountRate}$
  - 券商低消 $M = \text{account.minFee} \ (\text{預設 } 20 \text{ 元})$
  - 美股免手續費帳戶：$f = 0, M = 0$
  - 美股複委託帳戶：$f = \text{account.feeRate} \times \text{account.discountRate}, M = \text{account.minFee}$

#### (3) 封閉解與階梯補償演算法 (Discrete Step Compensation)

1. **基本連續解 (Continuous Analytical Solution)**：
   若不觸發低消門檻（成交金額夠大時）：
   $$P_{\text{base}} = \frac{\text{totalCostBasis}}{S \times (1 - t - f)}$$
2. **低消觸發解 (Minimum Fee Triggered Solution)**：
   若 $\text{grossMarketValue} \times f < M$（例如零股或小額成交），手續費固定為 $M$：
   $$P_{\text{minFee}} = \frac{\text{totalCostBasis} + M}{S \times (1 - t)}$$
3. **離散整數精確校準 (Discrete Rounding Verification)**：
   因台股實務上交割計費為無條件捨去 $\text{Floor}$，保本價公式採取封閉初猜值後進行微步驗證：
   ```typescript
   export function calculateBreakevenPrice(
     shares: number,
     totalCostBasis: number,
     market: MarketType,
     symbol: string,
     account?: BrokerAccount
   ): number {
     if (shares <= 0 || totalCostBasis <= 0) return 0;
     
     // 1. 美股零手續費
     if (market === 'US' && (!account || account.usFeeType !== 'SUB_BROKERAGE')) {
       return totalCostBasis / shares;
     }

     // 2. 台股與複委託精確計算
     const isTW = market === 'TW';
     const cleanSym = symbol.trim().toUpperCase();
     const isBond = isTW && cleanSym.endsWith('B');
     const isETF = isTW && cleanSym.startsWith('00');
     const taxRate = isBond ? 0 : isETF ? 0.001 : isTW ? 0.003 : 0;

     const feeRate = (account?.feeRate ?? 0.001425) * (account?.discountRate ?? 1.0);
     const minFee = account?.minFee ?? (isTW ? 20 : 0);

     // 初步連續估計
     let pEst = totalCostBasis / (shares * (1 - taxRate - feeRate));
     
     // 若計算出的手續費小於低消，改採低消公式
     if (shares * pEst * feeRate < minFee) {
       pEst = (totalCostBasis + minFee) / (shares * (1 - taxRate));
     }

     // 向上微調以確保 Floor 捨去後 NetProceeds >= totalCostBasis
     // 台股精確至小數點後 2 位 (或美股 4 位)
     const decimals = isTW ? 2 : 4;
     const factor = Math.pow(10, decimals);
     let finalPrice = Math.ceil(pEst * factor) / factor;

     // 雙重驗證閉環
     const gross = finalPrice * shares;
     const estTax = Math.floor(gross * taxRate);
     const estFee = Math.max(minFee, Math.floor(gross * feeRate));
     if (gross - estTax - estFee < totalCostBasis) {
       finalPrice = Math.ceil((finalPrice + 1 / factor) * factor) / factor;
     }

     return finalPrice;
   }
   ```

---

## 5. 資料模型變更 (Schema & Type Changes)

### 5.1 `src/types/stock.ts`

```typescript
export interface HoldingPosition {
  // ... 現有欄位保持相容 ...
  todaysPnL?: number;          // 今日損益金額 (未實現價差波動，原生幣別)
  todaysPnLPercent?: number;   // 今日漲跌百分比 %
  todaysChange?: number;       // 今日每股單價變動額 (currentPrice - previousClose)
  breakevenPrice?: number;     // 精確損益平衡保本價 (含稅、費、折讓)
}

export interface MarketSummarySlice {
  // ... 現有欄位保持相容 ...
  todayPnL?: number;           // 今日損益總額
  todayPnLPercent?: number;    // 今日總損益百分比 %
}
```

---

## 6. 使用者介面設計 (UI/UX Design)

### 6.1 `SummaryCards.tsx` (首頁總覽卡片)
1. **新增「今日損益 (Today's PnL)」指標區塊**：
   - 於「未實現損益」卡片內或獨立頂部醒目區域，展示：
     - 今日損益總額：`+NT$ 12,850` 或 `-NT$ 4,200`
     - 今日百分比：`+1.35%`
     - 輔助說明：`基於今日開盤後市價相較昨日收盤價之波動`
   - 色彩主題：依據使用者選定之 `ColorThemeMode`（台灣紅漲綠跌 / 國際綠漲紅跌）呈現動態漸層背景與色彩。

### 6.2 `HoldingsTable.tsx` (持股清單表格)
1. **市價與今日行情欄位**：
   - 目前單價下方除了顯示 `+15.0 (+1.52%)` 漲跌幅外，增列「今日損益：`+NT$15,000`」。
2. **成本均價與保本價 (Breakeven Badge)**：
   - 在「平均成本 (Avg Cost)」旁或下方以精緻 Badge 顯示「保本價 `NT$ 102.35`」。
   - 滑鼠懸停 (Tooltip) 顯示完整稅費解構：「計入賣出證交稅 0.3% (-NT$307) 與券商手續費 2.8折 (-NT$41)，賣出大於此單價方為真實獲利」。

---

## 7. 驗證矩陣與測試規範 (TDD Test Suite)

在 `src/engine/calculator.test.ts` 新增專業測試集：

1. **Test 1: 今日損益 (Today's PnL) 計算精確性**
   - 持有 1,000 股台積電，昨收 1,000 元，現價 1,020 元 $\implies$ `todaysPnL = 20,000`，`todaysPnLPercent = 2.0%`。
2. **Test 2: 台股現股保本價 (含 0.3% 稅與手續費折讓)**
   - 買進 1,000 股台積電 1,000 元，成本基準 1,001,425 元。
   - 驗證以計算出之 `breakevenPrice` 賣出，所得淨變現額 $\ge 1,001,425$ 元。
3. **Test 3: 台股 ETF (0.1% 稅) 與債券 ETF (0% 稅) 保本價差異**
   - 驗證 0050 (0.1% 稅) 與 00679B (0% 稅) 在相同成本下，債券 ETF 保本價明顯低於股票 ETF。
4. **Test 4: 台股低消 20 元零股保本價階梯補償**
   - 買進 10 股 50 元股票 (成本 520 元含低消 20 元)，驗證保本價正確計入賣出時的 20 元低消。
5. **Test 5: 美股零手續費保本價**
   - 買進 10 股 AAPL 200 美元，驗證美股保本價精確等於 200.00 美元。
6. **Test 6: 現金減資超額退款轉列已實現損益 (技術債 #0013)**
   - 成本基準 2,000 元，減資退款 3,000 元 $\implies$ 成本歸零，已實現損益增加 1,000 元。
7. **Test 7: 整戶跨市場今日損益匯率折算**
   - 台股賺 10,000 TWD，美股賺 100 USD (匯率 32.0) $\implies$ 整戶今日損益 = 13,200 TWD。

---

## 8. 審查確認清單 (Checklist for Approval)

- [ ] 核心公式定義是否符合您的期望？
- [ ] UI 呈現方式（總覽卡片與表格保本價 Badge）是否清晰美觀？
- [ ] 規格是否已完整涵蓋所有邊界條件？
