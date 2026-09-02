# 規格說明書 #0067: 持股技術指標警示膠囊與智慧操作建議引擎 (Holding Technical Signal Capsules & Action Advisor)

- **狀態**：`READY_FOR_TDD`
- **負責人**：AI Pair Programmer & User
- **建立日期**：2026-09-02
- **關聯 ADR**：[docs/adr/0067-holding-technical-signal-capsules-and-action-advisor.md](../adr/0067-holding-technical-signal-capsules-and-action-advisor.md)
- **領域文件**：[CONTEXT.md](../../CONTEXT.md)

---

## 1. 需求背景與目標 (Background & Objectives)

### 1.1 背景
投資人在檢視目前持股清單（如台股 00924 復華S&P500成長、美股 AAPL 等）時，僅檢視帳面浮動損益與報酬率容易產生情緒化決策或錯失關鍵技術位階變化。
現代券商與專業量化看盤軟體均會針對當前持股提供一目瞭然的「技術與籌碼警示膠囊（Badges/Pills）」，例如：
- `昨日量能注意`（量能異動）
- `9日K大幅拉升`、`KD超買鈍化`、`MACD注意`（動能擺盪）
- `5日線之下`、`月線之下`、`季線之下`、`半年線之上`（多空均線位階）
- `創單週新低`、`創波段新高`（價格突破）

並根據以上訊號進行多因子加權，即時輸出精確的「四字定調與操作建議指引」（如：`【逢高減碼】`、`【超跌分批】`、`【多頭續抱】`、`【觀望防守】`），並預留 AI 深度個人化診斷能力。

### 1.2 目標
1. **純前端離線運算 (`technicalIndicatorEngine.ts`)**：基於歷史日 K 線資料，離線計算 MA（5/20/60/120/240）、KD(9,3,3)、MACD(12,26,9)、昨日/5日均量比、5日/20日極值高低點。
2. **多維色彩膠囊標籤 (`HoldingSignalCapsules.tsx`)**：
   - 🟢 **偏多/強勢** (Bullish/Strength)：綠色/翡翠綠
   - 🔴 **偏空/破位** (Bearish/Breakdown)：玫瑰紅/亮紅
   - 🟡 **量價/指標異動** (Notice/Volume)：琥珀黃/亮橘
   - 🟣 **結構與均線階梯** (Structure/Support)：深藍/紫
3. **智慧操作建議引擎 (`holdingAdvisorEngine.ts`)**：
   - **確定性專家規則矩陣 (Deterministic Rule Engine)**：依據多空訊號加權計分即時輸出四字定調與具體紀律操作指引。
   - **可選 AI 深度診斷 (AI Deep Insight)**：支援點擊生成結構化 JSON 提供外部 LLM 解讀。
4. **持股介面整合 (`HoldingsTable.tsx`)**：在股票代碼與名稱下方無縫嵌入膠囊列，並提供懸浮 Tooltip 詳細數值。

---

## 2. 領域模型與資料結構 (Domain Models & Types)

```typescript
// src/types/signal.ts

export type SignalCategory = 'MA_LEVEL' | 'MOMENTUM' | 'VOLUME' | 'PRICE_EXTREME' | 'CHIPS';

export type SignalTone = 'BULLISH' | 'BEARISH' | 'WARNING' | 'NEUTRAL';

export interface HoldingSignal {
  id: string;                      // 唯一識別碼，如 'MA_BELOW_5', 'KD_K_SURGE_9'
  label: string;                   // 顯示標籤文字，如 '5日線之下', '9日K大幅拉升'
  category: SignalCategory;        // 訊號類別
  tone: SignalTone;                // 視覺語意調性
  weight: number;                  // 專家系統評分權重 (+2 為強多, -2 為強空, 0 為中性)
  description?: string;            // 詳細說明文字 (用於 Tooltip)
  metricsValue?: number | string;  // 具體數值 (如 MA5: 38.5, K: 85.2)
}

export interface TechnicalIndicators {
  currentPrice: number;
  ma5?: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
  ma240?: number;
  k9?: number;
  d9?: number;
  prevK9?: number;
  dif12_26?: number;
  macd9?: number;
  macdHist?: number;
  prevMacdHist?: number;
  yesterdayVolume?: number;
  avgVolume5?: number;
  avgVolume20?: number;
  weekLow5?: number;
  weekHigh5?: number;
  monthLow20?: number;
  monthHigh20?: number;
}

export type ActionSentiment = 'STRONG_BUY' | 'ACCUMULATE' | 'HOLD' | 'TRIM' | 'STOP_LOSS_EXIT' | 'WAIT_AND_SEE';

export interface HoldingActionDirective {
  headline: string;                // 四字定調，例如 '【逢高減碼】'、'【多頭續抱】'
  sentiment: ActionSentiment;      // 操作情緒傾向
  score: number;                   // 綜合量化得分
  advice: string;                  // 紀律性具體操作指南 (1~2 句話)
  signals: HoldingSignal[];        // 觸發的訊號清單
  updatedAt: number;
}
```

---

## 3. 指標運算與訊號萃取規則 (Indicator & Signal Extraction Rules)

### 3.1 均線位階 (Moving Averages)
- **5日線之下 (`MA_BELOW_5`)**: `currentPrice < ma5` $\rightarrow$ `BEARISH`, 權重 `-1`
- **5日線之上 (`MA_ABOVE_5`)**: `currentPrice >= ma5` $\rightarrow$ `BULLISH`, 權重 `+1`
- **月線之下 (`MA_BELOW_20`)**: `currentPrice < ma20` $\rightarrow$ `BEARISH`, 權重 `-2`
- **月線之上 (`MA_ABOVE_20`)**: `currentPrice >= ma20` $\rightarrow$ `BULLISH`, 權重 `+2`
- **季線之下 (`MA_BELOW_60`)**: `currentPrice < ma60` $\rightarrow$ `BEARISH`, 權重 `-2`
- **季線之上 (`MA_ABOVE_60`)**: `currentPrice >= ma60` $\rightarrow$ `BULLISH`, 權重 `+2`
- **半年線之下 (`MA_BELOW_120`)**: `currentPrice < ma120` $\rightarrow$ `BEARISH`, 權重 `-1`
- **半年線之上 (`MA_ABOVE_120`)**: `currentPrice >= ma120` $\rightarrow$ `NEUTRAL / BULLISH`, 權重 `+1`
- **均線多頭排列 (`MA_BULLISH_ALIGNMENT`)**: `ma5 > ma20 && ma20 > ma60 && ma60 > ma120` $\rightarrow$ `BULLISH`, 權重 `+3`
- **均線空頭排列 (`MA_BEARISH_ALIGNMENT`)**: `ma5 < ma20 && ma20 < ma60 && ma60 < ma120` $\rightarrow$ `BEARISH`, 權重 `-3`

### 3.2 動能與擺盪指標 (KD & MACD)
- **9日K大幅拉升 (`KD_K_SURGE_9`)**: `k9 - prevK9 >= 15` 或 `k9 >= 80` $\rightarrow$ `BULLISH`, 權重 `+2`
- **KD黃金交叉 (`KD_GOLDEN_CROSS`)**: 前日 `prevK <= prevD` 且今日 `k9 > d9` $\rightarrow$ `BULLISH`, 權重 `+2`
- **KD死亡交叉 (`KD_DEATH_CROSS`)**: 前日 `prevK >= prevD` 且今日 `k9 < d9` $\rightarrow$ `BEARISH`, 權重 `-2`
- **KD超賣鈍化 (`KD_OVERSOLD`)**: `k9 < 20` 且 `d9 < 20` $\rightarrow$ `WARNING`, 權重 `-1` (具備反彈潛力)
- **MACD注意 (`MACD_ATTENTION`)**: MACD 柱狀體收斂或變色（如 `prevMacdHist < 0` 且 `macdHist >= 0` 或反向）$\rightarrow$ `WARNING`, 權重 `0`
- **MACD黃金交叉 (`MACD_GOLDEN_CROSS`)**: `dif12_26` 由下往上穿過 `macd9` $\rightarrow$ `BULLISH`, 權重 `+2`
- **MACD死亡交叉 (`MACD_DEATH_CROSS`)**: `dif12_26` 由上往下穿過 `macd9` $\rightarrow$ `BEARISH`, 權重 `-2`

### 3.3 量能異動 (Volume)
- **昨日量能注意 (`VOL_YESTERDAY_SURGE`)**: `yesterdayVolume >= avgVolume5 * 2.0` $\rightarrow$ `WARNING`, 權重 `+1` / `-1`（視當日收紅或黑）
- **量縮窒息注意 (`VOL_DRY_UP`)**: 當日預估或昨日成交量 $< avgVolume20 * 0.35$ $\rightarrow$ `WARNING`, 權重 `0`

### 3.4 價格極值與突破 (Price Extremes)
- **創單週新低 (`PRICE_WEEK_LOW`)**: `currentPrice <= weekLow5` $\rightarrow$ `BEARISH`, 權重 `-2`
- **創單週新高 (`PRICE_WEEK_HIGH`)**: `currentPrice >= weekHigh5` $\rightarrow$ `BULLISH`, 權重 `+2`
- **創月線新低 (`PRICE_MONTH_LOW`)**: `currentPrice <= monthLow20` $\rightarrow$ `BEARISH`, 權重 `-3`
- **創月線新高 (`PRICE_MONTH_HIGH`)**: `currentPrice >= monthHigh20` $\rightarrow$ `BULLISH`, 權重 `+3`

---

## 4. 建議操作 (Action Directive) 專家矩陣

綜合總分 $\text{Score} = \sum \text{Signal.weight}$：

| 綜合得分與形態 | 四字定調 (Headline) | 操作情緒 (Sentiment) | 建議操作內容 (Advice) |
| :--- | :--- | :--- | :--- |
| $\text{Score} \ge +5$ | `【強勢續抱】` | `STRONG_BUY` / `HOLD` | 「各期均線多頭排列且動能強勁，建議沿 5 日線向上移動停利，持股續抱享受波段利潤。」 |
| $+2 \le \text{Score} < +5$ | `【多頭格局】` | `ACCUMULATE` / `HOLD` | 「股價穩守於月季線之上，短線趨勢向上，拉回均線有撐可視為分批加碼機會。」 |
| $-1 \le \text{Score} \le +1$ | `【盤整觀望】` | `WAIT_AND_SEE` | 「均線糾結壓縮且多空訊號相互抵銷，建議維持既定配置，靜待突破表態再行動。」 |
| $-4 \le \text{Score} \le -2$ 且 KD超賣/量縮 | `【超跌留意】` | `ACCUMULATE` | 「短期價格破位但指標已落入深度超賣區並出現窒息量，切勿盲目追殺，留意低接反彈。」 |
| $-4 \le \text{Score} \le -2$ (無超賣) | `【弱勢防守】` | `TRIM` | 「股價跌破短中期關鍵均線，反彈力道疲弱，建議適度減碼持股或逢高降低風險暴露。」 |
| $\text{Score} \le -5$ | `【嚴設停損】` | `STOP_LOSS_EXIT` | 「均線呈現空頭排列且創近期新低，賣壓沈重，強烈建議執行嚴格停損或果斷出清避險。」 |

---

## 5. UI/UX 視覺與膠囊標籤樣式

### 5.1 色彩階梯 (Color Palette)
- **BULLISH (翡翠綠)**：
  - 背景：`rgba(16, 185, 129, 0.15)`
  - 邊框：`1px solid rgba(16, 185, 129, 0.4)`
  - 文字：`#34d399`
- **BEARISH (亮紅)**：
  - 背景：`rgba(239, 68, 68, 0.15)`
  - 邊框：`1px solid rgba(239, 68, 68, 0.4)`
  - 文字：`#f87171`
- **WARNING (琥珀金/橘)**：
  - 背景：`rgba(245, 158, 11, 0.15)`
  - 邊框：`1px solid rgba(245, 158, 11, 0.4)`
  - 文字：`#fbbf24`
- **NEUTRAL (沉穩藍紫)**：
  - 背景：`rgba(99, 102, 241, 0.15)`
  - 邊框：`1px solid rgba(99, 102, 241, 0.4)`
  - 文字：`#818cf8`

### 5.2 膠囊尺寸與互動
- 高度 `20px`，字體 `0.65rem (10.5px)`，圓角 `4px`，內距 `1px 6px`。
- Hover 時顯示 Tooltip：呈現指標具體算式或門檻（例如：`5日均線: 38.20 (現價 37.50, 跌破 -1.83%)`）。

---

## 6. 測試縫隙與驗收標準 (Test Seams & Acceptance Criteria)

### 6.1 測試縫隙 (Test Seams)
- `src/engine/technicalIndicatorEngine.test.ts`：
  - 驗證單元函數：`calculateMovingAverages`, `calculateStochasticKD`, `calculateMACD`, `extractHoldingSignals`。
  - 邊界案例：K 線資料不足（少於 5 根、少於 20 根、空陣列）、全為 0 的成交量、價格皆相同時的防除零處理。
- `src/engine/holdingAdvisorEngine.test.ts`：
  - 驗證 `evaluateHoldingActionDirective`：
    - 多頭排列 + KD 大漲 $\rightarrow$ `【強勢續抱】`
    - 跌破 5/20/60 線 + 創單週新低 $\rightarrow$ `【嚴設停損】`
    - 跌破均線但 KD < 20 量縮 $\rightarrow$ `【超跌留意】`
- `src/components/common/HoldingSignalCapsules.test.tsx`：
  - 驗證膠囊標籤渲染、顏色調性類別與 Tooltip 內容。

### 6.2 驗收標準 (Acceptance Criteria)
1. **100% 離線計算**：若有歷史 K 線快取，無需聯網即可即時計算所有標籤。
2. **顏色清晰可辨**：在深色主題下對比度高於 4.5:1，符合無障礙規範。
3. **無效數據優雅降級**：當無歷史資料時，隱藏膠囊或顯示「無歷史數據」提示，不導致頁面崩潰。
4. **全套測試通過**：`npm test` 100% 綠燈，`npm run build` TypeScript 0 錯誤。
