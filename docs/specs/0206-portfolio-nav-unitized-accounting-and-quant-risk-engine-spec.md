# 0206 Spec: 資產成長與單位淨值會計及量化風控引擎重構規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0206
* **標題：** 資產成長與單位淨值會計及量化風控引擎重構 (Portfolio NAV Unitized Accounting and Quantitative Risk Engine Refactoring)
* **關聯 Issue：** #338
* **關聯架構決策：** [`docs/adr/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine.md`](file:///d:/APP/股票紀錄/docs/adr/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine.md)
* **規格狀態：** `APPROVED`
* **版本：** V1.0
* **建立日期：** 2026-10-28

---

## 2. 背景與問題陳述 (Problem Statement)

專案現有「資產成長與全歷史淨值 (NAV)」模組在經過金融軟體工程、華爾街 GIPS 會計標準與實戰操盤三個維度的穿透審查後，識別出以下重大缺陷：

1. **金融工程與計量公式嚴重失真**：
   - **時間除數錯位 (Days / 252)**：在 `quantMetrics.ts` 中，將日曆天序列長度（365天）誤除以 252 交易日，導致 1 整年的時間被判定為 1.45 年，年化複合成長率 (CAGR) 被憑空閹割 30% 以上，直接引發夏普比率 (Sharpe) 低迷至 0.40 的嚴重失真。
   - **違背 GIPS 會計準則 (出入金污染)**：現行系統拿總資產金額計算每日收益率，將外部加碼入金判定為當日暴賺、外部出金判定為暴跌，直接製造出虛假的最大回撤 (MDD) 與虛胖的波動度。
   - **非交易日 0% 波動度稀釋**：週末與節假日日收益率填 0 稀釋樣本方差，再套用 $\sqrt{252}$ 年化，造成嚴重的「假性低波衰減」。
   - **除息空窗期假凹洞**：未認列應收股利 (`receivableDividends`)，除息日股價自然下調但現金未匯入，導致 NAV 帳面市值在 6~8 月除息旺季出現長達近一個月的虛假下挫。
   - **信用交易會計漏洞**：融資賣出時未扣除持有期間的融資利息，質押借款未逐日計提利息，導致淨資產被帳面虛高。
2. **大盤基準數據斷頭與人工捏造常數**：
   - 美股 `US_SPY_BENCHMARK_HISTORY` 在 2025/2026 年為手動線性遞增假數字；台股加權指數與 0050 斷頭於 2026-09-07，近 50 天被 Forward-fill 填補為水平死線。
   - 專案已運行的本地 SQLite 湖倉 (`/api/market/history/`) 被完全架空，NAV 模組從未主動調用動態真實日 K。
3. **實戰投資者與操盤手必備工具缺失**：
   - 缺少直觀評估套牢深度與修復天數的**「水下回撤圖 (Underwater Chart)」**。
   - 缺少實時預警斷頭與防禦的**「當前回撤 (Current Drawdown)」**（目前只展示歷史最大 MDD）。
   - 缺少專注懲罰下行風險、不懲罰飆股向上衝刺的**「索提諾比率 (Sortino Ratio)」**。
   - 尺度割裂：將幾十元的 0050 強行放大到上千萬新台幣並疊在總資產金額圖上，尺度怪異。
4. **架構性巨石膨脹與管線脫節**：
   - `PortfolioGrowthChart.tsx` 膨脹至 1,236 行，混雜計算、資料對齊、座標投影與樣式。
   - 頂部單一帳戶篩選器 (`selectedAccountId`) 完全未與 NAV 序列計算連動。
   - 「透視金流」按鈕錯置在 MDD 卡片，且彈窗參數未連動當前選取之時間週期 (1M/1Y/ALL)。

---

## 3. 核心設計原則 (Core Design Principles)

* **KISS 原則 (Keep It Simple, Stupid)**：**堅決不引入任何外部重型圖表庫**（如 Chart.js, Recharts, ECharts），保留原專案極具優勢的高效能原生向量 SVG，零額外套件依賴。
* **華爾街 GIPS 會計準則 (GIPS Compliance)**：嚴格推行「單位淨值法 (Unit NAV / TWR)」，將外部出入金與真實投資績效徹底解耦。
* **本地湖倉優先 (Lakehouse-First SSOT)**：大盤日 K 全面直連本地 SQLite 湖倉 API，徹底清除所有靜態人造假常數。
* **防禦性開發與零回歸保證 (Zero Regression)**：所有修改保持公開介面向下相容，以 TDD 測試驅動確保數學校準 100% 綠燈。

---

## 4. 詳細功能與架構規格 (Functional Specifications)

本重構遵循使用者確認的「四階段推進」節奏實施：

```
Phase 1: 核心金融計量算法修正 (historicalNav.ts, quantMetrics.ts)
Phase 2: 基準大盤資料真實化 (benchmarkData.ts, lakehouse)
Phase 3: 雙模視圖與水下回撤圖 (PortfolioGrowthChart.tsx, NavSvgCanvas.tsx)
Phase 4: 看板指標補強與操作管線閉環 (Sortino, 當前回撤, 透視金流連動, 隱私遮罩)
```

### 4.1 Phase 1: 核心金融計量算法修正

#### 4.1.1 實作單位淨值法 (Unit NAV / TWR)
在 `src/engine/historicalNav.ts` 中重構逐日狀態機：
1. 初始基準設定：首日單位淨值 $\text{UnitNAV}_0 = 100.00$；初始份額 $\text{Units}_0 = \text{初始淨資產} / 100.00$。
2. 每日投資收益率計算（未計入當日外部出入金前）：
   $$R_t = \frac{\text{當日收盤持股市值} + \text{當日未出入金前現金餘額} - \text{當日負債} - \text{前日總資產}}{\text{前日總資產}}$$
3. 更新當日單位淨值：
   $$\text{UnitNAV}_t = \text{UnitNAV}_{t-1} \times (1 + R_t)$$
4. 處理當日淨外部出入金（增減份額，單位淨值維持不變）：
   $$\text{Units}_t = \text{Units}_{t-1} + \frac{\text{當日外部入金} - \text{當日外部出金}}{\text{UnitNAV}_t}$$
5. 在 `PortfolioDailySnapshot` 物件中新增 `unitNAV` 欄位。

#### 4.1.2 時間除數與交易日年化校準
在 `src/engine/quantMetrics.ts` 中：
1. **年數校準**：日曆天序列之年數計算改為：
   ```typescript
   const years = Math.max(days / 365.25, 1 / 365.25);
   ```
2. **波動度校準**：日收益率計算時，若該日為週末或全市場休市且無任何交易事件，不納入每日收益率樣本陣列，或年化系數與序列頻率嚴格匹配，杜絕 115 天非交易日填 0 造成的假性低波衰減。

#### 4.1.3 應收股利 (Receivable Dividends) 除息平滑補償
1. `calculateHistoricalNavSeries` 擴充支援 `receivableDividends?: ReceivableDividend[]` 參數。
2. 在除息日（Ex-Date）與發放日（Pay-Date）之間，每日總資產加入當期未入帳之應收股利金額：
   $$\text{TotalNAV}_t = \text{StockMarketValue}_t + \text{CashBalance}_t + \text{ReceivableDividend}_t - \text{LoanBalance}_t$$
3. 發放日現金入帳時自動沖銷應收股利，徹底撫平除息旺季的假性 MDD 與假跳水。

#### 4.1.4 信用交易融資利息扣除
融資賣出結算時（`MARGIN_SELL`），依據持股持有天數試算並自淨變現現金中扣除融資利息：
$$\text{FinancingInterest} = \text{DebtAmount} \times \text{MarginInterestRate} \times \frac{\text{HoldDays}}{365}$$
避免賣出平倉時利息被憑空抹去導致 NAV 虛高。

---

### 4.2 Phase 2: 基準大盤資料真實化與管線打通

1. **湖倉直連**：在 `src/engine/benchmarkData.ts` 中，將 `loadBenchmarkDailyPricesAsync` 與本機湖倉 API `/api/market/history/:symbol?limit=all` 深度綁定。
2. **清除人造假數據**：
   - 廢除 `benchmarkConstants.ts` 中 2025/2026 年手動填寫之 SPY 虛假常數。
   - 支援自動向本地湖倉快取提取台股加權報酬指數 (`TAIEX`)、元大台灣50 (`0050`)、標普500 (`SPY`) 之完整真實日 K。
3. **動態無風險利率 ($R_f$) 注入**：
   - 依照投資組合計價幣別（TWD 預設 1.8%，USD 預設 4.5% 或自宏觀戰情室動態讀取 FRED 3M 美債殖利率），取代寫死的 1.5%。

---

### 4.3 Phase 3: 雙模視圖與實戰水下回撤圖

在 `src/components/PortfolioGrowthChart.tsx` 中：
1. **雙模視圖一鍵切換**：
   - 提供切換開關：`[ 💰 資產金額 (AUM) ]` 與 `[ 📊 淨值走勢 (Unit NAV % 對照大盤) ]`。
   - **AUM 金額模式**：Y 軸顯示真實財富金額，繪製總資產淨值、累計本金、持股市值、現金與負債。
   - **Unit NAV 淨值對照模式**：投資組合 Unit NAV 與大盤基準起點皆歸一化為 $100\%$，直接對照 Alpha 剪刀差，徹底解決尺度失衡問題。
2. **水下回撤圖 (Underwater Chart)**：
   - 於折線圖下方提供折疊/展開之水下回撤面板。
   - 採用原生向量 SVG 繪製從 $0\%$ 軸線向下展開的紅色陰影回撤曲線，清晰標示歷次最大跌幅與修復天數。
3. **穿倉負淨值防禦**：
   - 移除 Y 軸刻度計算中之 `Math.max(0, ...)` 硬性截斷，允許在融資負淨值時正常繪製並標記破產紅線，杜絕 SVG 坐標溢出破裂。

---

### 4.4 Phase 4: 看板指標補強與操作管線閉環

1. **量化風控看板升級**：
   - 新增 **索提諾比率 (Sortino Ratio)**：只除以下行虧損波動度，不懲罰飆股向上衝刺。
   - 新增 **當前回撤 (Current Drawdown)**：在 MDD 卡片中並列展示「歷史最大 MDD」與「當前距新高水下深度」，即時預警停損。
2. **操作管線修復**：
   - 將「透視金流」按鈕移至「累計投入本金」卡片，並將當前篩選之日期區間傳遞給 `handleInspectGrowthXirr`，實現週期精確折現。
   - 打通頂部 `selectedAccountId` 篩選器連動，支援單一券商帳戶與全帳戶合併視圖。
3. **實戰隱私遮罩 (Incognito Mode)**：
   - 頂部工具列提供 `[ 👁️ 隱私遮罩 ]` 按鈕，點擊後所有千萬級金額替換為 `NT$**,***,***`，方便社群曬單與覆盤分享。

---

## 5. 資料結構與介面變更 (Data Models & Contracts)

### 5.1 `PortfolioDailySnapshot` 擴充 (`src/types/stock.ts`)
```typescript
export interface PortfolioDailySnapshot {
  date: string;
  totalNAV: number;            // 總資產淨值金額 (AUM)
  unitNAV: number;             // 單位淨值 (起點 100.00，不受出入金干擾) ★新增
  stockMarketValue: number;
  cashBalance: number;
  receivableDividends?: number;// 當日尚未入帳之應收股利資產 ★新增
  loanBalance: number;
  netCostBasis: number;
  cumulativeReturnPnL: number;
  cumulativeReturnPercent: number;
  dailyPnL: number;
  dailyReturnPercent: number;
  underwaterDrawdownPercent?: number; // 當日距歷史 ATH 之回撤百分比 ★新增
  events: string[];
}
```

### 5.2 `QuantPerformanceMetrics` 擴充 (`src/types/stock.ts`)
```typescript
export interface QuantPerformanceMetrics {
  hasBenchmark: boolean;
  alpha: number | null;
  beta: number | null;
  sharpeRatio: number;
  sortinoRatio?: number;             // 索提諾比率 (下行風險) ★新增
  currentDrawdownPercent?: number;   // 當前水下深度 ★新增
  portfolioMaxDrawdown: number;
  benchmarkMaxDrawdown: number | null;
  annualizedVolatility: number;
  downsideVolatility?: number;       // 下行波動度 ★新增
  correlation: number | null;
}
```

---

## 6. 測試縫隙與驗收標準 (Test Seams & Acceptance Criteria)

1. **單元測試縫隙 (`historicalNav.test.ts`)**：
   - 驗證當帳戶發生外部大額入金（如 100 萬加碼至 400 萬）時，當日 `unitNAV` 保持不變，單日報酬率為 0%，份額等比增發。
   - 驗證除息空窗期（Ex-Date 至 Pay-Date 之間）NAV 曲線平滑無假性跳水凹洞。
   - 驗證融資賣出時真實扣除融資利息。
2. **量化計量測試縫隙 (`quantMetrics.test.ts`)**：
   - 驗證日曆天長度 365 天時，年數計算為 1.0 年而非 1.45 年，CAGR 與 Sharpe 恢復真實水準。
   - 驗證 Sortino 比率對純向上暴漲之序列給予極高評分。
3. **系統驗收**：
   - `npm test` 100% 綠燈通過。
   - `npm run build` TypeScript 0 錯誤。
   - 本地 SQLite 湖倉即時串接，SPY 與 0050 走勢不中斷、不平線。
