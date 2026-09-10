# 技術債 #0024: ETF 穿透式成分股透視 (Look-Through) 與產業因子集中度分析 (ETF Look-Through & Sector Concentration)

- **狀態**：`RESOLVED`（已於 v8.34.0 / ADR #0115 完整解決）
- **優先級**：`P2`
- **發現來源**：/grill-with-docs ETF 底層資產重疊與假性分散風險調研
- **建立日期**：2026-09-02
- **標籤**：`Architecture` · `Quant` · `ETF` · `Holdings` · `LookThrough` · `Risk` · `Treemap`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備完善的持倉表格（[src/components/HoldingsTable.tsx](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx)）與資產樹狀圖（[src/components/Treemap.tsx](file:///d:/APP/股票紀錄/src/components/Treemap.tsx)）：
1. **表層標的分散 vs. 底層實質過度集中 (False Diversification)**：
   - 使用者帳戶內常同時配置：個股（如 `2330 台積電`）、市值型 ETF（如 `0050 元大台灣50`、`00923 群益台ESG低碳50`、`00403A 主動統一升級50`）與全球 ETF（如 `VT`）。
   - 在既有持倉表格與 Treemap 中，這些標的被視為「獨立個體」。
   - **實質盲區**：台積電在 0050 佔比超過 50%，在 00923 佔比超過 30%，在 00403A 與 VT 亦有顯著權重。使用者以為自己分散投資在 5 檔標的，實際上個人淨資產對「台積電單一公司」或「台灣半導體產業」的穿透總曝險可能超過 65%~70%！
2. **缺乏產業與地理因子穿透分佈**：
   - 系統無法自動統計個人總資產在「科技資訊、金融保險、傳產原物料、生技醫療、公用事業、現金/債券」之實質產業權重分佈。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **ETF 前十大成分股權重庫維護 (ETF Holdings Registry)**：
   - 需建立核心台美 ETF（0050, 0056, 00878, 00919, 00923, 00924, 006208, 00713, VT, SPY, QQQ, VTI 等）之前十大/全成分股權重常數庫，並支援線上即時快取更新。
2. **穿透聚合演算法 (Look-Through Aggregator)**：
   - 對每檔持倉進行遞迴解構：
     $$\text{公司 } i \text{ 的真實總曝險} = \text{直接持股市值}_i + \sum_{k \in \text{ETFs}} \left( \text{ETF}_k \text{ 持股市值} \times w_{k, i} \right)$$
   - 計算佔整戶 NAV 的穿透百分比，並提供「直接持股 vs ETF 間接持有」的拆解視圖。
3. **過度集中警示閾值 (Concentration Alert Guardrails)**：
   - 當單一公司穿透曝險 $> 25\%$ 或單一產業穿透曝險 $> 60\%$ 時，標記黃色/紅色防禦性警示標籤。

### 暫緩理由 (Deferral Rationale)
1. 現有標的層級的 Treemap 與資產配置再平衡推薦器已能運作良好。
2. 穿透式分析屬於量化風控與高階資產配置透視維度，收錄於技術債中明確演算法與數據字典後，待下個專題週期實施。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. ETF 成分股與權重資料模型 (ETF Constituent Schema)

```typescript
export interface ETFConstituent {
  symbol: string;               // 底層股票代碼 (如 2330, AAPL, 2454)
  name: string;                 // 底層股票名稱 (如 台積電, 聯發科)
  weightPercent: number;        // 成分股佔該 ETF 權重 % (如 52.3%)
  sector: string;               // 產業分類 (如 資訊科技, 金融保險)
  country: string;              // 國家/地區 (如 TW, US)
}

export interface ETFHoldingsData {
  etfSymbol: string;
  asOfDate: string;             // 權重基準日
  constituents: ETFConstituent[];
}
```

### B. 穿透式真實總曝險資料結構 (Look-Through Aggregate)

```typescript
export interface LookThroughExposure {
  symbol: string;
  name: string;
  directMarketValue: number;    // 直接持股市值 (TWD)
  indirectMarketValue: number;  // 透過各 ETF 間接持股市值 (TWD)
  totalEffectiveValue: number;  // 實質總曝險金額 (TWD)
  portfolioWeightPercent: number;// 佔整戶 NAV 穿透百分比 %
  derivedFromETFs: {
    etfSymbol: string;
    indirectValue: number;
  }[];
  sector: string;
  isConcentrationAlert: boolean;// 是否超過單一標的集中度警示門檻 (如 >25%)
}
```

### C. 視覺化組件：穿透式雙層 Treemap 與產業甜甜圈圖

- **穿透式 Treemap**：點擊切換「標的視圖」或「底層公司穿透視圖」。
- **產業因子甜甜圈圖**：展示資訊科技、金融、非必須消費、通訊、醫療、現金之真實佔比。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 升級「資產分佈 / Treemap」圖表加入穿透式分析時。
2. 規劃「投資組合健康診斷與過度集中風險警報」功能時。
3. 使用者詢問「我手上的 ETF 和個股到底重疊了多少台積電/蘋果」時。
