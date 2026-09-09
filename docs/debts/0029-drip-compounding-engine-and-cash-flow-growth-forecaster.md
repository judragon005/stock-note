# 技術債 #0029: DRIP 股利再投資與被動現金流複利滾雪球預測器 (DRIP Compounding Engine & Cash Flow Growth Forecaster)

- **狀態**：`RESOLVED` (已於 v8.31.0 ADR #0112 完整解決)
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 股利再投資複利效應與長期現金流預測調研
- **建立日期**：2026-09-02
- **標籤**：`Dividend` · `DRIP` · `Compounding` · `FIRE` · `Forecasting` · `Quant`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備專屬股息日誌（[src/components/DividendTracker.tsx](file:///d:/APP/股票紀錄/src/components/DividendTracker.tsx)）與應收股息平滑機制（[src/engine/receivableDividendEngine.ts](file:///d:/APP/股票紀錄/src/engine/receivableDividendEngine.ts)）：
1. **股利沉澱 vs. 股利自動再投資 (Dividend Cashout vs. DRIP Compounding)**：
   - 目前配息入帳後，預設直接進入現金帳本（Cash Ledger）。
   - **實質盲區**：長期存股與高股息/指數投資人（如持有 0050、0056、00878、00919、SCHD、VYM、VOO）的核心增長動力在於「股息自動再買進（DRIP）所產生的指數型複利滾雪球效應」。現有介面無法直觀呈現「若每次股息皆全數再投資，10 年後總市值與每年被動現金流會增加多少倍」。
2. **缺乏被動收入里程碑覆蓋率預測**：
   - 投資人難以推算在目前的資產規模與歷史股息年複合成長率（Dividend Growth Rate, DGR）下，被動現金流何時能覆蓋月支出（如每月 3 萬、5 萬、10 萬生活費）。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **DRIP 複利滾雪球多軌模擬演算法 (Multi-Scenario DRIP Simulator)**：
   - 對比兩種核心情境在未來 5 年、10 年、20 年的資產與股利分歧曲線：
     - **情境 A（股息提領 / Cash Out）**：股利不再投入，持股數固定，僅隨歷史股價成長與股利有機增長。
     - **情境 B（DRIP 股息再投資）**：每次除息/發放日將稅後股利全數以當日市價買進碎股，持股數隨時間呈指數級放大。
2. **持倉加權股息年複合成長率 (Portfolio Dividend Growth Rate, DGR)**：
   - 自動提取每檔持倉過去 3 年 / 5 年的配息數據，計算各自的 DGR：
     $$\text{DGR}_{5Y} = \left( \frac{\text{Dividend}_{Y}}{\text{Dividend}_{Y-5}} \right)^{1/5} - 1$$
   - 加權計算整戶投資組合的綜合被動收入成長速率。
3. **被動收入自由度里程碑 (Passive Income Milestones & Target Timeline)**：
   - 結合使用者自訂的生活開銷門檻，繪製「被動現金流超越基礎生活費 (Level 1) ➔ 寬裕生活費 (Level 2) ➔ 財務自由 (FIRE)」的達成預估年份。
4. **DRIP 交易一鍵入帳支援**：
   - 解析美股券商（IB、Firstrade）因 DRIP 產生帶有碎股小數點的買進紀錄，一鍵生成 `DIVIDEND` 與聯動 `BUY` 雙分錄。

### 暫緩理由 (Deferral Rationale)
1. 現有除息日誌與應收股利平滑引擎已能完整滿足當前年度的現金流統計與稅階警示。
2. DRIP 複利模擬屬於長期財務規劃與 FIRE 視覺化進階工具，收錄於技術債中待股利專區大升級時實作。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. DRIP 模擬預測模型 (DRIP Forecast Schema)

```typescript
export interface DRIPProjectionPoint {
  year: number;
  age?: number;
  // 情境 A: 股息提領
  cashOutPortfolioValue: number;
  cashOutAnnualDividend: number;
  // 情境 B: 股息再投資 (DRIP)
  dripPortfolioValue: number;
  dripAnnualDividend: number;
  dripTotalShares: Record<string, number>;
  // 差距與複利倍數
  compoundingMultiplier: number;  // (dripPortfolioValue / cashOutPortfolioValue)
}

export interface PassiveIncomeMilestone {
  monthlyTargetTWD: number;       // 月被動收入目標 (如 50,000)
  targetName: string;             // 例如 "基本生活費覆蓋"
  estimatedYearCashOut: number;   // 提領模式達成年份
  estimatedYearDRIP: number;      // DRIP 模式達成年份 (通常大幅提前)
  yearsSaved: number;             // DRIP 替使用者提早達成的年數
}
```

### B. 核心模擬演算法實作思路

```typescript
// src/engine/dripCompoundingEngine.ts
export function simulateDRIPGrowth(
  currentHoldings: HoldingPosition[],
  years: number = 20,
  assumedCapitalAppreciationRate: number = 0.05,
  monthlyAdditionalDCA: number = 0
): {
  timeline: DRIPProjectionPoint[];
  milestones: PassiveIncomeMilestone[];
} {
  // 1. 取得各標的當前市值、殖利率與歷史 DGR
  // 2. 逐年滾動計算持股數（含除息再買進）與市值增長
  // 3. 輸出兩種情境對比曲線與里程碑時間表
}
```

---

## 4. 觸發處理時機 (Trigger Conditions)

1. 當使用者進入「股息日誌」頁籤，想要探索長期存股複利效益與滾雪球試算時。
2. 與技術債 `#0022 蒙地卡羅退休提領 (FIRE) 模擬器` 聯動，作為被動收入成長曲線之輸入引擎。
