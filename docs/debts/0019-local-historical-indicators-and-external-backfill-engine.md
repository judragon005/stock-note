# 技術債 #0019: 本地全量歷史技術指標庫與免費外部資源自動回補引擎 (Local Historical Indicators & External Backfill Engine)

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 深度調研（整合「肌肉書僮」短線波段量化指標體系）
- **建立日期**：2026-09-02
- **標籤**：`Architecture` · `Quant` · `Indicators` · `MuscleBooker` · `Storage` · `BackgroundWorker`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前專案的歷史數據主要聚焦於**收盤價**的增量同步與淨值計算：
1. **收盤價快取**：[src/engine/historicalPriceFetcher.ts](file:///d:/APP/股票紀錄/src/engine/historicalPriceFetcher.ts) 透過 Yahoo Finance API 抓取歷史每日收盤價，並以 `Record<string, number>` 存入 IndexedDB 的 `historicalPrices` 庫。
2. **缺乏完整 OHLCV 與深層技術指標**：
   - 目前尚未在本地儲存完整日 K 線四價（開高低收 Open/High/Low/Close）與成交量（Volume）。
   - 均線與量化指標大多為即時或單日衍生（如 [src/engine/quantMetrics.ts](file:///d:/APP/股票紀錄/src/engine/quantMetrics.ts) 計算 Alpha/Beta/Sharpe/MDD，[src/engine/holdingPeriodEngine.ts](file:///d:/APP/股票紀錄/src/engine/holdingPeriodEngine.ts) 計算持有天數），尚未在本地持久化完整的歷史指標時序數列。
3. **缺乏「肌肉書僮」短線波段與籌碼量化實戰指標**：
   - 包含：**箱子戰術（三日法則箱頂/箱底）**、**均線扣抵值預判（時空望遠鏡）**、**底穿上假跌破偵測**、**布林通道極致壓縮 (Squeeze)**、**ATR 動態移動防守價**、**RS 相對強度 (3日/10日)**、**11天動能波段週期**、**投量比（過濾當沖水分）**、**買賣家數差（籌碼集中度）**與**單一分點成交占比**等關鍵實戰指標。
4. **標的新增機制**：當使用者匯入新交易或新增標的時，目前僅按需請求歷史收盤價以填補 NAV 缺口，尚未具備全自動拉取「上市以來完整歷史日 K + 離線全指標計算 + 本地持久化」的一體化背景流水線。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **重度運算與網路資源衝突**：
   - 若在開啟圖表或分析頁面時才即時抓取並計算 10~20 年歷史日 K 的所有技術指標，會造成主線程掉幀（UI Lag），且頻繁請求外部 API 容易觸發 Yahoo Finance 或代理伺服器的 `429 Too Many Requests` 限流。
2. **「以時間換取空間」的架構需求**：
   - 外部免費資源（Yahoo Finance Chart API / TWSE 官方 Open Data / FinMind 免費層）雖無資料成本，但存在 QPS 限制與突發斷流風險。
   - 必須透過「背景排程隊列 (Background Queue) + 令牌桶限流器 (Token Bucket Rate Limiter) + 斷點續傳 (Checkpointing)」，在使用者瀏覽或閒置時，以低頻率平滑拉取完整歷史 OHLCV，並在本地一次性運算完成技術指標後寫入 IndexedDB。
3. **儲存結構設計**：
   - 完整 10 年台美股日 K（約 2,500 根）包含全部指標數列，單檔股票若未經精簡存儲約需 300KB ~ 600KB；若投資組合包含 30~50 檔標的，總容量約 15MB~30MB。需設計結構化、按日期切片或時序壓縮的 IndexedDB Store，避免檢索單日數據時全量反序列化。

### 暫緩理由 (Deferral Rationale)
1. 現行 v7.0 版本的核心資產記帳、多帳戶、分批沖銷與 NAV 淨值回溯功能運作穩定。
2. 本項為未來「深度技術分析圖表 (K-Line Chart)」、「肌肉書僮短線波段健檢儀表板」、「量化策略回測 (Backtesting)」鋪路的底層基建，需有完整的架構方案與資料庫 Schema 升級計畫後再正式實作。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

### A. 外部免費數據抓取策略（以時間換取空間）

| 數據類別 | 免費資料來源 (官方/開源) | 獲取策略與端點 |
| :--- | :--- | :--- |
| **全量歷史日 K 線 (OHLCV)** | **Yahoo Finance Chart API** (v8) | `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1=0&period2={now}&interval=1d`<br>支援全球市場（台股、美股、外匯），一次性拉取上市至今（10~20年）全部日 K、成交量及除權息還原價（`adjclose`）。 |
| **三大法人買賣超** | **證交所 TWSE Open Data** / **FinMind** | TWSE 官方 `https://www.twse.com.tw/rwd/zh/fund/T86` 或 FinMind `TaiwanStockInstitutionalInvestorsBuySell`（每日收盤後增量同步）。 |
| **當日沖銷成交量** | **證交所 TWSE Open Data** | TWSE 官方 `https://www.twse.com.tw/rwd/zh/dayTrading/BFT41U`（用於計算「投量比」，扣除當沖水分）。 |
| **融資融券餘額** | **證交所 TWSE Open Data** / **FinMind** | TWSE `MI_MARGN` 或 FinMind `TaiwanStockMarginPurchaseShortSale`（用於融資被監控警示）。 |
| **發行股數與週轉率** | **證交所 TWSE Open Data** | TWSE `BWIBBU`（取得最新發行股數，計算投本比、外本比與日週轉率）。 |

* **排程隊列與節流器 (Token Bucket Rate Limiter)**：
  - 佇列優先級：`HIGH` (使用者當前檢視標的) > `NORMAL` (持有中標的) > `LOW` (已平倉/自選歷史標的)。
  - 請求間隔：控制於 800ms ~ 1500ms 每次請求，並內建指數退避與隨機抖動 (Exponential Backoff with Jitter)。
  - 增量同步機制：本地已存在歷史 K 線時，僅抓取 `max(cachedDate) + 1` 至今日的新 K 線，計算指標時使用最新 N 根進行增量滾動遞推，無需重算歷史。

---

### B. 本地儲存架構 (IndexedDB Schema Upgrade)

資料庫版本自 `DB_VERSION = 2` 升級至 `3`，新增兩個專屬 Object Stores：

#### 1. `historicalOhlcv`（日 K 線原始數據）
```typescript
export interface DailyCandle {
  date: string;       // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;   // 還原收盤價 (用於指標計算與均線平滑)
  volume: number;     // 成交量 (股數/張數)
  // 台股籌碼擴充欄位 (由盤後增量更新)
  foreignNetBuy?: number;   // 外資買賣超張數
  trustNetBuy?: number;     // 投信買賣超張數
  dealerNetBuy?: number;    // 自營商買賣超張數
  dayTradingVolume?: number;// 當沖成交量
  marginBalance?: number;   // 融資餘額張數
}

export interface SymbolOhlcvStore {
  symbol: string;     // 主鍵 (e.g., '2330', 'AAPL')
  market: MarketType;
  earliestDate: string;
  latestDate: string;
  candles: DailyCandle[];
  sharesOutstanding?: number; // 發行總股數 (計算週轉率/投本比)
  updatedAt: number;
}
```

#### 2. `technicalIndicators`（預先計算完成的歷史技術指標）
```typescript
export type BoxStatus = 'BREAKOUT_UP' | 'BREAKOUT_DOWN' | 'INSIDE_BOX';
export type RelativeStrengthRank = 'EXTREME_STRONG' | 'STRONG' | 'NEUTRAL' | 'WEAK' | 'EXTREME_WEAK';

export interface TechnicalIndicatorPoint {
  date: string;
  
  // 1. 傳統均線系統 (SMA & EMA)
  ma?: { ma5?: number; ma10?: number; ma20?: number; ma60?: number; ma120?: number; ma240?: number };
  ema?: { ema12?: number; ema26?: number };

  // 2. 肌肉書僮：均線扣抵值時空望遠鏡 (MA Deduction & Displacement)
  maDeduction?: {
    ma5DeductionPrice: number;   // 5 日前同等價格 (當前價高於此則 MA5 上彎)
    ma10DeductionPrice: number;  // 10 日前同等價格
    ma20DeductionPrice: number;  // 20 日前同等價格 (生命線扣抵)
    future3DaysSlope: 'UP' | 'FLAT' | 'DOWN'; // 未來 3 日扣抵高檔/低檔預判
    isBottomPenetrationRebound?: boolean;     // 「底穿上」假跌破型態 (盤中破線、收盤強勢站回)
  };

  // 3. 肌肉書僮：箱子戰術與三日法則 (Darvas Box Theory)
  box?: {
    boxUpper: number;        // 連續 3 日不創新高確立之箱頂阻力
    boxLower: number;        // 連續 3 日不創新低確立之箱底支撐
    boxWidthPercent: number; // 箱體寬度 %
    boxStatus: BoxStatus;    // 突破/跌破/箱內
  };

  // 4. 肌肉書僮：布林通道與極致壓縮 (Bollinger Bands & Squeeze)
  bbands?: {
    upper: number;
    mid: number;
    lower: number;
    bandwidth: number;       // 帶寬 = (Upper - Lower) / Mid
    bPercent: number;        // %B 位階
    isSqueeze: boolean;      // 帶寬處於近 N 日極低水位 (主力發動前兆)
    squeezeDurationDays?: number;
  };

  // 5. 肌肉書僮：ATR 動態移動防守 (Trailing Defense)
  atr?: {
    atr14: number;
    trailingDefensePrice: number; // 關鍵支撐/突破位 - (1.5 ~ 2.0) * ATR14
  };

  // 6. 肌肉書僮：相對強度與動能週期 (RS & 11-Day Cycle)
  momentum?: {
    rs3Score: number;                 // 3 日相對加權指數/標普超額強度
    rs10Score: number;                // 10 日相對強度
    rsRank: RelativeStrengthRank;     // 極強 / 偏強 / 中立 / 偏弱
    momentumCycleDaysElapsed?: number;// 11 天動能波段週期計數器
  };

  // 7. 肌肉書僮：籌碼真偽篩網指標 (Chips & Flow Quality)
  chips?: {
    turnoverRatePercent?: number;     // 日週轉率 % (3%~7% 活躍, >7% 極強)
    volumeRatio?: number;             // 盤中/當日量比 (今日量 / 5日均量, ≥ 1.5 觸發)
    trustNetBuyCapitalRatio?: number; // 投本比 %
    foreignNetBuyCapitalRatio?: number;// 外本比 %
    trustToNetVolumeRatio?: number;   // 投量比 (投信買超 / (總量 - 當沖量))
    brokerBreadth?: number;           // 買賣家數差 (負值為集中，正值為發散)
    singleBrokerMonopolyRatio?: number;// 最大單一分點成交佔比 % (警戒紅線 > 10%~20%)
    marginOverheated?: boolean;       // 融資被監控警示 (高檔融資暴增且滯漲)
  };

  // 8. 經典擺盪與量能指標
  rsi?: { rsi6?: number; rsi12?: number; rsi14?: number };
  kdj?: { k: number; d: number; j: number }; // 9,3,3
  macd?: { dif: number; dea: number; macd: number }; // 12,26,9
  volumeMa?: { vma5: number; vma20: number };
  obv?: number;
}

export interface SymbolIndicatorsStore {
  symbol: string;     // 主鍵
  market: MarketType;
  indicators: TechnicalIndicatorPoint[];
  calculatedAt: number;
  version: number;    // 指標演算法版本號
}
```

---

### C. 高效計算引擎與主線程隔離 (Pure Engine & Off-Main-Thread)

1. **純函式計算庫 (`src/engine/technicalIndicators.ts`)**：
   - 實作無依賴純數學引擎，涵蓋均線扣抵、箱體三日演算法、布林通道 Squeeze、ATR14、RS 相對強度、投量比等標準計算。
2. **多執行緒 / 空閒分片運算**：
   - 若運算 10~20 年日 K 或多檔批次計算，透過 Web Worker 或 `requestIdleCallback` 執行，保證 UI 60fps 流暢不卡頓。

---

### D. 新標的自動監聽與自動回補 (Auto-Backfill Pipeline)

1. **監聽觸發點**：
   - 交易新增/修改（[TradeRecord](file:///d:/APP/股票紀錄/src/types/stock.ts)）。
   - CSV 匯入成功事件。
   - 標的自選追蹤加入。
   - 系統冷啟動時的健康檢查（比對全部已知 Symbol 是否皆有最新指標快照）。
2. **狀態提示**：
   - 於狀態列提供非侵入式微型指示燈（例如：「📊 肌肉書僮量化引擎同步中: 正在分析 2330 扣抵值與箱體 (3/15)」），完成後自動靜默更新本地狀態。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本架構實作：
1. 開發「K 線技術指標圖表 (Advanced Candlestick Chart)」或「肌肉書僮短線波段多空健檢儀表板」時。
2. 引入「歷史策略回測」或「箱體突破 / 均線扣抵低檔上彎 / 投量比放大」自動篩選器時。
3. 專案進行量化分析模組升級之排程時。
