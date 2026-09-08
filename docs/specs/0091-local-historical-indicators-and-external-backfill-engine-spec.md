# PRD #0091: 本地全量歷史技術指標庫與免費外部資源自動回補引擎 (肌肉書僮短線量化體系)

- **版本**：v8.10.0
- **狀態**：`APPROVED`
- **關聯技術債**：[技術債 #0019 (P2)](../debts/0019-local-historical-indicators-and-external-backfill-engine.md)
- **前置依賴**：[PRD #0090 (客戶端 API 速率限制與防封禁配額保護)](0090-client-side-rate-limiting-and-api-quota-guard-spec.md) (已就緒)
- **架構連動**：為後續 [技術債 #0027 (雙重動能輪動)](../debts/0027-dual-momentum-and-relative-strength-rotation.md) 與 [技術債 #0020 (宏觀戰情室)](../debts/0020-market-war-room-macro-liquidity-and-ai-advisor.md) 提供完整的歷史日 K (OHLCV) 與深層量化時序數列。

---

## 1. 執行摘要與核心目標 (Executive Summary & Goals)

### 1.1 背景盲區
目前系統在歷史數據層面主要以每日收盤價純量為主：
- IndexedDB 僅快取收盤價字典 `Record<string, number>`，缺乏完整開高低收與成交量 (OHLCV)。
- 技術分析訊號主要停留在單日均線與粗粒度乖離率，缺乏完整的**時序技術指標矩陣**與「**肌肉書僮 (MuscleBooker)**」短線波段核心實戰體系：
  - **箱子戰術（三日法則箱頂/箱底確認）**
  - **均線扣抵值時空望遠鏡（MA Deduction & 3日斜率預判）**
  - **「底穿上」假跌破誘空反轉型態**
  - **布林通道極致壓縮 (Bollinger Squeeze)**
  - **ATR 動態移動防守價**
  - **RS 相對強度 (Relative Strength vs TAIEX/SPY)**
  - **投量比 (Trust-to-Net-Volume Ratio，過濾當沖水分)**

### 1.2 核心目標
1. **底層儲存平滑升級 (`DB_VERSION = 3`)**：
   - 擴充 IndexedDB Object Stores：`historicalOhlcv`（全量日 K 線）與 `technicalIndicators`（計算完成之時序技術指標）。
2. **純函式肌肉書僮量化運算核心 (`src/engine/muscleBookerEngine.ts`)**：
   - 提供無副作用 (Pure Function)、高吞吐量（每秒計算數千根 K 線）的指標計算引擎，覆蓋箱頂箱底、均線扣抵、假跌破、布林 Squeeze、ATR 防守價與 RS 強度。
3. **安全背景回補調度器 (`src/engine/historicalOhlcvBackfill.ts`)**：
   - 接入 Phase 1 的 `globalRequestScheduler` 速率限制器，安全拉取 Yahoo Finance Chart API 10~20 年歷史日 K。
   - 支援增量更新（僅補齊 `max(cachedDate) + 1` 至今日），支援斷點續傳。
4. **與持股信號無縫對齊**：
   - 產出結構化指標點位，可直接擴充至既有持股膠囊標籤與後續戰情室儀表板。

---

## 2. 肌肉書僮量化指標數學模型 (Mathematical Formulations)

### 2.1 箱子戰術與三日法則 (Darvas Box Theory)
- **箱頂確認 (Box Upper)**：
  當前 K 線高點後連續 3 個交易日未創更高價，以該高點作為有效箱頂：
  $$\text{BoxUpper} = \max(H_{t-3}, H_{t-2}, H_{t-1}, H_t) \quad (\text{if } H_{t-i} < H_t \text{ for } i \in [1, 3])$$
- **箱底確認 (Box Lower)**：
  當前 K 線低點後連續 3 個交易日未創更低價，以該低點作為有效箱底：
  $$\text{BoxLower} = \min(L_{t-3}, L_{t-2}, L_{t-1}, L_t) \quad (\text{if } L_{t-i} > L_t \text{ for } i \in [1, 3])$$
- **箱體狀態 (Box Status)**：
  - 收盤價 $> \text{BoxUpper}$ ➔ `BREAKOUT_UP` (強勢突破)
  - 收盤價 $< \text{BoxLower}$ ➔ `BREAKOUT_DOWN` (弱勢跌破)
  - 介於其間 ➔ `INSIDE_BOX` (箱內盤整)

### 2.2 均線扣抵值時空望遠鏡 (MA Deduction & Displacement)
- **扣抵價格**：
  $N$ 日移動平均線扣抵價即為 $N$ 日前同期的收盤價 $C_{t-N}$：
  - $\text{MA5 Deduction} = C_{t-5}$
  - $\text{MA20 Deduction} = C_{t-20}$（生命線扣抵）
  - $\text{MA60 Deduction} = C_{t-60}$（季線扣抵）
- **均線走勢預判**：
  - 若當前價格 $C_t > C_{t-N}$，則 $N$ 日均線翻揚上彎 (`UP`)。
  - 若當前價格 $C_t < C_{t-N}$，則 $N$ 日均線加速下彎 (`DOWN`)。
  - 計算未來 3 日即將扣抵的均價梯度，預告均線拐點。
- **「底穿上」假跌破型態 (Bottom Penetration Rebound)**：
  - 盤中低點跌破重要箱底或 MA20（$L_t < \text{Support}$），但收盤價強勢站回支撐之上（$C_t \ge \text{Support}$）且留長下影線（$\frac{C_t - L_t}{H_t - L_t} \ge 0.5$）。

### 2.3 布林通道極致壓縮 (Bollinger Squeeze)
- **帶寬 (Bandwidth)**：
  $$\text{BW} = \frac{\text{Upper} - \text{Lower}}{\text{MA20}} \times 100\%$$
- **極致壓縮狀態 (Squeeze)**：
  當前 $\text{BW} \le 8\%$ 或處於近 60 日最低分位數（$\le \text{Percentile}_{15}$），標記 `isSqueeze = true`（主力蓄勢發動變盤前兆）。

### 2.4 ATR 動態移動防守 (Trailing Defense)
- **真實波動區間 (True Range)**：
  $$\text{TR}_t = \max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)$$
- **動態移動防守價**：
  $$\text{TrailingStop} = \max_{k \in [t-N, t]}(H_k) - 2.5 \times \text{ATR}_{14}$$

### 2.5 RS 相對強度 (Relative Strength)
- 計算標的相對於大盤指數（台股加權指數 TAIEX 或美股 S&P 500）之滾動超額報酬率：
  $$\text{RS}_{10} = R_{\text{Stock}, 10D} - R_{\text{Benchmark}, 10D}$$
  - $\text{RS}_{10} \ge +5\%$ ➔ `EXTREME_STRONG`
  - $+2\% \le \text{RS}_{10} < +5\%$ ➔ `STRONG`
  - $-2\% \le \text{RS}_{10} < +2\%$ ➔ `NEUTRAL`
  - $\text{RS}_{10} < -2\%$ ➔ `WEAK`

### 2.6 投量比 (Trust-to-Net-Volume Ratio)
- 扣除當沖虛胖水分，洞察投信真實控盤比例：
  $$\text{投量比} = \frac{\text{投信買超張數}}{\max(1, \text{成交量} - \text{當沖量})} \times 100\%$$

---

## 3. 系統介面與儲存架構 (Schema & Storage)

### 3.1 儲存定義 (`src/types/indicators.ts`)
```typescript
export interface DailyCandle {
  date: string;       // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose?: number;
  volume: number;
  // 台股籌碼欄位 (可選)
  foreignNetBuy?: number;
  trustNetBuy?: number;
  dealerNetBuy?: number;
  dayTradingVolume?: number;
}

export interface MuscleBookerIndicatorPoint {
  date: string;
  close: number;
  ma: { ma5?: number; ma10?: number; ma20?: number; ma60?: number };
  maDeduction: {
    ma5DeductionPrice?: number;
    ma20DeductionPrice?: number;
    ma20Slope: 'UP' | 'FLAT' | 'DOWN';
    isBottomPenetrationRebound: boolean;
  };
  box: {
    boxUpper?: number;
    boxLower?: number;
    boxStatus: 'BREAKOUT_UP' | 'BREAKOUT_DOWN' | 'INSIDE_BOX';
  };
  bbands: {
    upper: number;
    mid: number;
    lower: number;
    bandwidth: number;
    isSqueeze: boolean;
  };
  atr: {
    atr14: number;
    trailingDefensePrice: number;
  };
  momentum: {
    rs10Score: number;
    rsRank: 'EXTREME_STRONG' | 'STRONG' | 'NEUTRAL' | 'WEAK';
  };
  chips?: {
    trustToNetVolumeRatio?: number;
  };
}

export interface SymbolOhlcvStore {
  symbol: string;
  candles: DailyCandle[];
  updatedAt: number;
}

export interface SymbolIndicatorsStore {
  symbol: string;
  points: MuscleBookerIndicatorPoint[];
  updatedAt: number;
}
```

---

## 4. 驗收標準 (Acceptance Criteria)

1. **量化運算正確性驗收**：
   - 撰寫單元測試驗證三日法則箱頂/箱底確立、突破與跌破狀態判定。
   - 驗證均線扣抵價計算與未來斜率預判（$C_t > C_{t-20}$ 判定 MA20 走揚）。
   - 驗證「底穿上」假跌破下影線逆轉偵測。
   - 驗證布林極致壓縮 ($\text{BW} \le 8\%$) 與 ATR 動態移動防守價計算。
2. **底層資料庫相容性驗收**：
   - IndexedDB 升級至版本 3，新增 `historicalOhlcv` 與 `technicalIndicators` Object Stores，現有交易、帳戶與快照數據完全無損。
3. **回補引擎速率保護驗收**：
   - 全量回補歷史日 K 線時，所有 HTTP 請求必經 `globalRequestScheduler` 節流，無 429 觸發。
4. **全量測試與構建綠燈**：
   - `npm test` 100% 通過，`npm run build` 0 TypeScript 錯誤。
