# PRD #0041: 交易計畫紀律檢討、盤中風控觸價警示與大盤量化基準對比規格書 (Trade Discipline, Risk Alerts & Quant Benchmark)

- **版本**：v5.7.0
- **日期**：2026-08-28
- **狀態**：`PROPOSED`
- **關聯技術債**：
  - [docs/debts/0002-trade-plan-and-discipline-review.md](../debts/0002-trade-plan-and-discipline-review.md) (#0002 核心)
  - [docs/debts/0016-stop-loss-take-profit-alerts-and-risk-badges.md](../debts/0016-stop-loss-take-profit-alerts-and-risk-badges.md) (#0016 關聯一)
  - [docs/debts/0010-benchmark-comparison-and-quant-metrics.md](../debts/0010-benchmark-comparison-and-quant-metrics.md) (#0010 關聯二)
- **目標模組**：
  - `src/types/stock.ts` (型別擴充：TradePlan, TradeReview, RiskStatus, QuantMetrics)
  - `src/engine/riskAlertEngine.ts` & `src/engine/riskAlertEngine.test.ts` (新增：停損停利觸價判定與距離試算)
  - `src/engine/quantMetrics.ts` & `src/engine/quantMetrics.test.ts` (新增：Alpha, Beta, Sharpe, MDD, Volatility 量化計算)
  - `src/engine/benchmarkData.ts` & `src/engine/benchmarkData.test.ts` (新增：0050.TW / SPY 本地離線基準歷史常數與獲取器)
  - `src/components/TradeModal.tsx` (升級：交易計畫輸入面板)
  - `src/components/HoldingsTable.tsx` (升級：風控警示 Badge 與 Tooltip)
  - `src/components/ClosedPositionsSummary.tsx` (升級：賽後覆盤卡片與紀律執行率統計)
  - `src/components/PortfolioGrowthChart.tsx` (升級：大盤基準疊圖與量化風控指標卡片)

---

## 1. 業務價值與痛點分析 (Business Value & Problem Statement)

### 1.1 現行痛點
1. **記帳與交易心態脫鉤**：目前僅記錄交易數字（價格/股數/成本），無法追蹤事前進場假設與計畫（停損/停利/風報比），也無法在平倉後檢討是「遵守紀律」還是「情緒凹單/追高」。
2. **缺乏盤中即時風控提醒**：持股跌破預設停損或達到停利時，介面缺乏高辨識度的視覺觸價警示，容易因人性猶豫錯失出場時機。
3. **缺乏客觀量化大盤對比**：淨值成長曲線無法與台灣加權/0050 或美股 SPY 進行標準化 (100%) 疊圖，投資人無法得知自身投資是否產生正向超額報酬 (Alpha) 與風險調整後報酬 (Sharpe Ratio)。

### 1.2 系統目標
打造**「事前計畫 ➔ 盤中風控 ➔ 賽後覆盤 ➔ 客觀量化」**的主動交易管理閉環：
- **事前計畫**：買進建倉時可選填交易假說、停損價、停利價，自動計算預期風報比 (R:R Ratio)。
- **盤中風控**：持股表格動態計算離停損/停利距離百分比，觸價時即時呈現醒目標籤（🚨 觸及停損 / 🎯 達成停利 / ⚠️ 接近警戒）。
- **賽後覆盤**：平倉標的支援紀錄是否遵守計畫、犯錯分類（凹單、追高、過早止盈等）、學習心得與 1~5 星評分，並在儀表板統計整體紀律執行率。
- **客觀量化**：以本地資料庫提供 0050 與 SPY 歷史走勢疊圖，離線計算年化波動度、最大回撤 (MDD)、夏普值 (Sharpe Ratio)、Beta 係數與 Jensen's Alpha。

---

## 2. 資料結構與型別擴充規格 (Data Models Specification)

### 2.1 型別定義 (`src/types/stock.ts`)

```typescript
// 1. 交易計畫模型 (事前)
export interface TradePlan {
  entryReason?: string;             // 進場理由 / 交易假說 (如：突破箱頂、籌碼集中、跌深反彈)
  stopLossPrice?: number;           // 預設停損價
  takeProfitPrice?: number;         // 預設停利價
  plannedRiskRewardRatio?: number;  // 預期風報比 ((takeProfit - entry) / (entry - stopLoss))
}

// 2. 賽後覆盤模型 (事後)
export type TradeMistakeType = 
  | 'CHASE_HIGH'        // 追高追價
  | 'HOLD_LOSER'         // 凹單不肯停損
  | 'PREMATURE_PROFIT'  // 過早停利飛走
  | 'EMOTIONAL_SIZE'    // 情緒化重押
  | 'NO_PLAN'           // 盲目無計畫進場
  | 'OTHER';            // 其他

export interface TradeReview {
  isPlanFollowed: boolean;          // 是否遵守交易計畫
  mistakesMade?: TradeMistakeType[];// 犯錯行為清單
  lessonsLearned?: string;          // 覆盤心得 / 檢討筆記
  disciplineScore: number;          // 紀律評分 (1 ~ 5 星)
  reviewedAt: number;               // 覆盤時間戳記
}

// 3. 擴充 TradeRecord 與 HoldingPosition
export interface TradeRecord {
  // ...既有欄位
  plan?: TradePlan;
  review?: TradeReview;
}

export type RiskAlertStatus =
  | 'NORMAL'                 // 正常區間
  | 'NEAR_STOP_LOSS'         // 接近停損 (距離 <= 3%)
  | 'STOP_LOSS_TRIGGERED'    // 觸及/跌破停損 (🚨)
  | 'NEAR_TAKE_PROFIT'       // 接近停利 (距離 <= 3%)
  | 'TAKE_PROFIT_TRIGGERED'; // 觸及/超越停利 (🎯)

export interface HoldingRiskMetrics {
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskStatus: RiskAlertStatus;
  distanceToStopLossPercent?: number;   // 離停損價百分比 % (如 -2.5%)
  distanceToTakeProfitPercent?: number; // 離停利價百分比 % (如 +4.1%)
  plannedRiskRewardRatio?: number;
  entryReason?: string;
}

// 4. 量化指標模型
export interface QuantPerformanceMetrics {
  alpha: number;                  // 詹森阿爾法 Jensen's Alpha (% 或 小數)
  beta: number;                   // 貝塔係數 Beta
  sharpeRatio: number;            // 夏普值 Sharpe Ratio
  sortinoRatio?: number;          // 索提諾比 Sortino Ratio
  annualizedVolatility: number;   // 年化波動度 %
  benchmarkMaxDrawdown: number;   // 基準最大回撤 %
  portfolioMaxDrawdown: number;   // 投資組合最大回撤 %
  correlation: number;            // 與基準之相關係數 r
}
```

---

## 3. 計算引擎設計 (Calculation Engines Specification)

### 3.1 風控觸價計算引擎 (`src/engine/riskAlertEngine.ts`)

#### 核心計算邏輯
- **多單邏輯**（目前系統持倉為多頭現股）：
  - 若未設定 `stopLossPrice` 與 `takeProfitPrice` ➔ 回傳 `NORMAL`。
  - **停損判定**：
    - 若 `currentPrice <= stopLossPrice` ➔ `STOP_LOSS_TRIGGERED`
    - 若 `currentPrice > stopLossPrice` 且 `(currentPrice - stopLossPrice) / currentPrice <= 0.03` ➔ `NEAR_STOP_LOSS`
  - **停利判定**：
    - 若 `currentPrice >= takeProfitPrice` ➔ `TAKE_PROFIT_TRIGGERED`
    - 若 `currentPrice < takeProfitPrice` 且 `(takeProfitPrice - currentPrice) / currentPrice <= 0.03` ➔ `NEAR_TAKE_PROFIT`
- **距離百分比試算**：
  - `distanceToStopLossPercent = ((currentPrice - stopLossPrice) / currentPrice) * 100`
  - `distanceToTakeProfitPercent = ((takeProfitPrice - currentPrice) / currentPrice) * 100`

---

### 3.2 量化統計指標引擎 (`src/engine/quantMetrics.ts`)

#### 數學公式標準
1. **日報酬率序列**：
   $$r_{p,t} = \frac{\text{NAV}_t - \text{NAV}_{t-1}}{\text{NAV}_{t-1}}, \quad r_{b,t} = \frac{B_t - B_{t-1}}{B_{t-1}}$$
2. **年化波動度 ($\sigma_{\text{ann}}$)**：
   $$\sigma_{\text{ann}} = \text{std}(r_p) \times \sqrt{252}$$
3. **無風險利率 ($R_f$)**：預設為年化 $1.5\%$（台灣央行定存基準/美國短期利率折衷），日無風險利率 $r_f = \frac{R_f}{252}$。
4. **夏普值 (Sharpe Ratio)**：
   $$\text{Sharpe} = \frac{R_{p,\text{ann}} - R_f}{\sigma_{p,\text{ann}}}$$
5. **貝塔係數 ($\beta$)**：
   $$\beta = \frac{\text{Cov}(r_p, r_b)}{\text{Var}(r_b)}$$
6. **詹森阿爾法 ($\alpha$)**：
   $$\alpha = R_{p,\text{ann}} - [R_f + \beta (R_{b,\text{ann}} - R_f)]$$
7. **最大回撤 (MDD)**：
   $$\text{MDD} = \max_{t} \left( \frac{\text{Peak}_t - \text{NAV}_t}{\text{Peak}_t} \right)$$

---

### 3.3 本地基準數據模組 (`src/engine/benchmarkData.ts`)
- 內建 0050.TW (元大台灣50) 與 SPY (標普500) 之基準歷史價格數據。
- 支援與 `historicalNav.ts` 之每日時間戳記自動對齊 (Date Alignment) 與線性補值。
- 提供走勢歸一化函式（基準日統一設為 $100\%$）：
  $$\text{Normalized}_t = \frac{P_t}{P_0} \times 100$$

---

## 4. 使用者介面升級 (UI / UX Specification)

### 4.1 交易輸入彈窗 (`TradeModal.tsx`)
- 新增可折疊之「🎯 交易計畫與風控設定」卡片（僅在買進 `BUY` 時預設展開）。
- 包含：
  - 進場理由 / 交易假說（文字輸入）
  - 預設停損價（數字輸入，自動計算預估虧損金額與 %）
  - 預設停利價（數字輸入，自動計算預估獲利金額與 %）
  - 即時顯示預期風報酬比（如 `1 : 2.5`）。

### 4.2 持股清單表格 (`HoldingsTable.tsx`)
- 在個股代碼旁或現價旁顯示風控狀態標籤：
  - 🚨 `觸及停損`（紅底白字晶亮閃爍，Tooltip 顯示「已跌破停損價 $X (-Y%)」）
  - 🎯 `達標停利`（金綠底白字，Tooltip 顯示「已超越目標價 $X (+Y%)」）
  - ⚠️ `接近停損`（橘黃底黑字，Tooltip 顯示「距停損僅差 X%」）
- 支援在持股列直接點擊快速編輯/更新停損停利點。

### 4.3 已平倉紀律覆盤卡片 (`ClosedPositionsSummary.tsx`)
- 在展開已平倉標的時，提供「📝 賽後覆盤檢討」專屬面板：
  - 勾選：是否嚴格遵守交易計畫（是 / 否）。
  - 犯錯標籤選擇：追高、凹單、過早停利、情緒重押等。
  - 紀律星級評分：1 ~ 5 星 ⭐。
  - 心得筆記 textarea。
- 於已平倉總結儀表板新增「⭐ 全局紀律執行率（遵守計畫比例 %）」與「最高頻犯錯類型 TOP 3」。

### 4.4 淨值成長與大盤量化疊圖 (`PortfolioGrowthChart.tsx`)
- 圖表頂部新增基準切換 Toggle：`[ 無基準 | 0050 (台股) | SPY (美股) | 50/50 股債混和 ]`。
- 圖表主體以歸一化 (100) 顯示投資組合 vs. 大盤走勢對比。
- 圖表下方呈現 5 大量化指標看板：
  - 👑 **Alpha (超額報酬)**
  - ⚖️ **Beta (市場敏感度)**
  - ⚡ **Sharpe Ratio (夏普值)**
  - 📉 **Max Drawdown (最大回撤)**
  - 🌊 **Volatility (年化波動度)**

---

## 5. 驗證標準與測試計畫 (Verification & Test Plan)

1. **單元測試 (TDD 100% 覆蓋)**：
   - `riskAlertEngine.test.ts`：測試正常區間、接近停損、觸及停損、接近停利、達標停利之各種邊界情況。
   - `quantMetrics.test.ts`：以標準歷史數值驗證 Alpha, Beta, Sharpe, MDD 與年化波動度計算精確度。
   - `benchmarkData.test.ts`：測試基準數據對齊、缺漏日補值與歸一化運算。
2. **端到端流程驗證**：
   - 新增一筆帶有交易計畫之買進交易 ➔ 持股表格正確顯示風控狀態與距離。
   - 修改報價觸發停損/停利 ➔ 表格即時反應 🚨 / 🎯 標籤。
   - 賣出平倉 ➔ 賽後覆盤評分與心得正確保存至 IndexedDB 並反映在紀律執行率看板。
   - 開啟淨值成長圖表 ➔ 切換 0050 / SPY 基準疊圖與量化卡片正常呈現。
3. **無損構建驗證**：
   - 本地 `npm test` 全數 Passing。
   - 本地 `npm run build` TypeScript 0 錯誤。
