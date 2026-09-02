# 需求規格說明書 (PRD #0049)：除息應收股息平滑補償、專屬股息日誌日曆視圖與外匯損益拆解/稅階預警系統

## 1. 執行摘要 (Executive Summary)

本規格書針對專案三大核心技術債進行一體化架構整合：
1. **主核心 [技術債 #0014](file:///d:/APP/股票紀錄/docs/debts/0014-ex-dividend-receivable-smoothing-and-drop-compensation.md)**：除息日至發放日應收股息平滑機制與假性虧損補償。
2. **關聯一 [技術債 #0004](file:///d:/APP/股票紀錄/docs/debts/0004-dedicated-dividend-log-view.md)**：專屬股息日誌與年度配息視圖（含月度現金流柱狀圖、年度配息成長、股息行事曆與單檔貢獻榜）。
3. **關聯二 [技術債 #0011](file:///d:/APP/股票紀錄/docs/debts/0011-fx-gain-loss-breakdown-and-tax-bracket-alert.md)**：外匯損益獨立拆解（解耦美股本體價差與 FX 匯差）與台股二代健保 (2.11%)/美股海外所得 (100萬/750萬) 稅階衝擊預警。

透過這套「高階股息現金流與稅務匯差全景系統」，投資人能徹底解決除息跳水導致的帳面失真、一覽全年度被動現金流成長趨勢、清楚掌握美股報酬之匯差貢獻，並在交易與除息前獲得即時稅務合規預警。

---

## 2. 背景與痛點剖析 (Problem Statements)

### 2.1 痛點一：除權息空窗期的「假性虧損 (Paper Drop)」(#0014)
* **現象**：除息日 (Ex-Date) 當天，市場報價直接向下修正每股配息金額（例如 100 元降為 95 元），而現金股利需等 3~4 週後的發放日 (Pay-Date) 才會撥入帳戶。
* **衝擊**：在此 1 個月的空窗期內，持股表格與總覽儀表板的未實現損益會出現「除息假性虧損」，帳面市值看似蒸發，但實質上投資人享有即將收取的確定性現金流。

### 2.2 痛點二：缺乏專屬股息現金流工作台 (#0004)
* **現象**：現金股利記錄混合在千百筆買賣交易歷史流水帳中。
* **衝擊**：存股族與退休現金流導向投資人無法直觀掌握「各月份被動現金流分佈」、「年度股利成長率 (YoY)」、「單檔標的累積配息貢獻」及「即將除息/即將發放的股利行事曆」。

### 2.3 痛點三：美股 Alpha 與匯率 FX 混淆，且缺乏事前稅務預警 (#0011)
* **現象 1（匯差混淆）**：美股標的以 TWD 計價的總損益由「股價變動」與「USD/TWD 匯率波動」共同決定，缺乏獨立拆解，無法評估真實選股能力與匯率避險效益。
* **現象 2（二代健保盲區）**：台股單筆現金股利達 NT$ 20,000 元以上時，撥款時券商會強制扣取 2.11% 補充保費。投資人在除息前缺乏單筆門檻警報與拆單試算。
* **現象 3（海外所得稅階盲區）**：投資人美股當年度已實現利得若達 100 萬台幣需申報基本所得額、達 750 萬台幣可能觸發 20% 最低稅負制 (AMT)，目前缺乏年度累積進度條。

---

## 3. 架構設計與第一性原理 (Architecture & First Principles)

```mermaid
flowchart TD
    subgraph 數據與歷史交易層 (Data Tier)
        TR[歷史交易帳本 TradeRecord]
        CA[公司行動掃描器 ScannedCorporateAction]
        PQ[即時市場報價 PriceQuote & 即時匯率]
    end

    subgraph 核心計算引擎層 (Engine Tier)
        RDE["應收股利平滑引擎 (receivableDividendEngine.ts)<br/>- 偵測 exDate <= today < payDate<br/>- 計算應收股息與平滑損益"]
        FXE["外匯損益解耦引擎 (fxBreakdown.ts)<br/>- 拆解美股本體價差損益 (TWD)<br/>- 拆解外匯匯差損益 (FX Gain/Loss)"]
        TXE["稅務合規預警引擎 (taxComplianceEngine.ts)<br/>- 台股單筆 >= 20,000 觸發 2.11% 二代健保<br/>- 美股海外所得 100萬 / 750萬 進度條"]
        DCE["股息數據彙整器 (dividendAggregator.ts)<br/>- 月度柱狀統計 (1~12月)<br/>- 年度股利成長 YoY<br/>- 個股貢獻排行與 DRIP 統計"]
        
        TR & CA & PQ --> RDE
        TR & PQ --> FXE
        TR & CA --> TXE
        TR & CA --> DCE
    end

    subgraph 應用與互動視圖層 (Presentation Tier)
        TAB["WorkspaceTabs 活頁工作台<br/>- 新增 💰 股利日誌 Tab"]
        V1["DividendLogView 股利日誌專區<br/>- 月度/年度現金流圖表<br/>- 股息行事曆 (即將除息/發放)<br/>- 股利流水明細 (含稅費穿透)"]
        V2["HoldingsTable 持倉表增強<br/>- 雙軌切換 (牌面市價 vs 平滑含息)<br/>- 美股標的 FX 匯差/本體損益 Tooltip"]
        V3["FrictionCenterModal 摩擦中心增強<br/>- 二代健保與海外所得稅階進度條"]
        
        RDE & DCE --> V1
        RDE & FXE --> V2
        TXE --> V3
        DCE --> TAB
    end
```

---

## 4. 詳細數據結構契約 (Data Contracts & Types)

### 4.1 股利分析與應收股利型別 (`src/types/dividend.ts`)

```typescript
import { MarketType, Currency, TradeType } from './stock';

/**
 * 應收股利明細 (除息日至發放日之間)
 */
export interface ReceivableDividend {
  id: string;
  symbol: string;
  name: string;
  market: MarketType;
  currency: Currency;
  exDate: string;             // 除息日 (YYYY-MM-DD)
  payDate: string;            // 預計發放日 (YYYY-MM-DD)
  sharesHeldOnExDate: number; // 除息基準日持有股數
  cashDividendPerShare: number; // 每股現金股利
  estimatedGrossDividend: number; // 預估應發總額
  estimatedTaxOrFee: number;  // 預估預扣稅 (美股 30%) 或二代健保 (台股 2.11%)
  estimatedNetDividend: number; // 預估實領股息 (原生幣別)
  estimatedNetDividendInTWD: number; // 折合台幣實領金額
  status: 'PENDING_PAYMENT' | 'RECEIVED' | 'OVERDUE';
}

/**
 * 美股外匯損益拆解結果
 */
export interface FxBreakdownResult {
  symbol: string;
  currency: Currency;
  totalCostUSD: number;       // 原始美元投入成本
  currentMarketValueUSD: number; // 最新美元市值
  costFxRate: number;         // 買進加權平均匯率
  currentFxRate: number;      // 最新即時匯率
  
  // 雙軸損益拆解 (折合 TWD)
  assetGainTWD: number;       // 股票本體價差損益 = (現價USD - 均價USD) * 股數 * 現時匯率
  assetGainPercent: number;   // 股票本體報酬率 %
  fxGainTWD: number;          // 外匯匯差損益 = 原始美元成本 * (現時匯率 - 買進匯率)
  fxGainPercent: number;      // 外匯匯率波動率 %
  totalGainTWD: number;       // 總損益 = assetGainTWD + fxGainTWD
  totalGainPercent: number;   // 總報酬率 %
}

/**
 * 稅階合規預警狀態
 */
export interface TaxComplianceStatus {
  // 台股二代健保預警 (單筆 >= 20,000 元)
  twNhiAlerts: {
    symbol: string;
    name: string;
    exDate: string;
    payDate: string;
    grossDividendTWD: number;
    triggersNhi: boolean;
    nhiFeeTWD: number; // 2.11%
    thresholdAmount: number; // 20,000
    suggestion?: string; // 例如：「單筆達門檻，將扣除 2.11% 補充保費」
  }[];
  
  // 美股海外所得稅階進度 (當年度)
  usOverseasIncome: {
    taxYear: number;
    realizedCapitalGainsTWD: number; // 當年度美股已實現價差
    overseasDividendsTWD: number;    // 當年度美股已領股息
    totalOverseasIncomeTWD: number;  // 當年度海外所得合計
    filingThresholdTWD: number;      // 申報門檻 (1,000,000 TWD)
    amtExemptionTWD: number;         // 基本所得額免稅額 (7,500,000 TWD)
    isFilingRequired: boolean;       // 是否達 100 萬申報門檻
    isAmtExceeded: boolean;          // 是否逾 750 萬免稅額
    filingProgressPercent: number;   // 距離 100 萬進度 % (0~100)
    amtProgressPercent: number;      // 距離 750 萬進度 % (0~100)
  };
}

/**
 * 股利日誌月度與年度統計彙整
 */
export interface DividendSummaryReport {
  totalHistoricalDividendsTWD: number; // 全歷史累計領取股息 (TWD)
  currentYearDividendsTWD: number;     // 當年度累計領取股息 (TWD)
  previousYearDividendsTWD: number;    // 去年同期累計 (TWD)
  yoyGrowthPercent: number;            // 年度成長率 %
  trailing12mDividendsTWD: number;     // 近 12 個月現金流合計
  monthlyDistribution: {
    monthKey: string;                  // YYYY-MM
    monthLabel: string;                // "2026/08" 或 "8月"
    grossTWD: number;
    netTWD: number;
    taxTWD: number;
    count: number;
  }[];
  topDividendContributors: {
    symbol: string;
    name: string;
    market: MarketType;
    totalDividendsTWD: number;
    percentageOfTotal: number;
  }[];
  upcomingDividends: ReceivableDividend[]; // 即將除息與即將發放行事曆
}
```

---

## 5. 驗收標準 (Acceptance Criteria)

### 5.1 除息應收股息平滑機制 (#0014)
- [ ] **G1 (除息平滑補償計算)**：當持倉標的介於除息日至發放日之間 (`exDate <= today < payDate`) 且未登錄入帳時，系統自動識別為 `ReceivableDividend`，其應發金額為 `sharesHeld * cashDividendPerShare`。
- [ ] **G2 (持倉平滑損益視圖)**：在持倉清單中，未實現損益提供平滑 Tooltip 與切換選項，清楚標註「含待入帳應收股利：+$X,XXX」，消除除息後的假性跳水跌幅。
- [ ] **G3 (發放自動銷除)**：當使用者或系統補登入帳交易 (`TradeRecord.type = 'DIVIDEND'`) 或日期超過發放日已結算時，該筆應收狀態自動歸檔銷除，不重複計算。

### 5.2 專屬股息日誌與日曆視圖 (#0004)
- [ ] **G4 (工作台 Tab 擴充)**：[WorkspaceTabs.tsx](file:///d:/APP/股票紀錄/src/components/WorkspaceTabs.tsx) 成功新增 `dividend` 活頁籤，呈現累計實領總額 Badge。
- [ ] **G5 (月度柱狀圖與 YoY 成長)**：提供 1~12 月與跨年度切換的現金流圖表，清晰可見每月入帳被動收入、總扣繳稅費與實領淨額。
- [ ] **G6 (股息行事曆與貢獻榜)**：提供即將除息與即將發放時間軸清單，並依標的股息貢獻金額列出 Top 排行榜。

### 5.3 外匯損益拆解與稅階合規預警 (#0011)
- [ ] **G7 (美股外匯與本體損益精確解耦)**：
  - 本體損益公式：$\text{shares} \times (\text{currentPriceUSD} - \text{avgCostUSD}) \times \text{currentFxRate}$
  - 匯差損益公式：$\text{totalCostUSD} \times (\text{currentFxRate} - \text{costFxRate})$
  - 兩者合計必須 100% 精確吻合持倉總未實現損益 (TWD)。
- [ ] **G8 (二代健保 2.11% 預警)**：若除息日持股試算單筆現金股利 $\ge \text{NT\$} 20,000$，在股息日曆與摩擦中心明確標註黃色警戒標籤與扣費預估。
- [ ] **G9 (海外所得申報與 AMT 進度條)**：統計當年度美股已實現價差與已領股息合計，呈現距離 100 萬申報門檻與 750 萬最低稅負制的動態進度條。

---

## 6. 影響評估與防禦性策略 (Defensive Architecture)

1. **會計真實性與權威隔離**：
   - 應收股利僅為「展示與平滑層」之統計運算，嚴禁在未收到現金前直接修改正式現金帳本或資產總淨值 (NAV)，避免虛增現金。
2. **極致離線與平滑降級**：
   - 若特定標的僅有除息日而無官方發放日資訊，系統自動依台股平均週期以 `exDate + 28 天` 作為預設發放日，並允許使用者隨時手動微調。
3. **無破壞向後相容**：
   - 既有 `HoldingPosition` 與 `PortfolioSummary` 保持結構穩定，新增之指標均為 Optional 欄位或純函式獨立導出，確保既有單元測試 100% 通過。
