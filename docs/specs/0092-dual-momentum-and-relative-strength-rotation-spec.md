# PRD #0092: 雙重動能與跨資產趨勢輪動評分引擎 (Dual Momentum & Safe Haven Rotation)

- **版本**：v8.11.0
- **狀態**：`APPROVED`
- **關聯技術債**：[技術債 #0027 (P2)](../debts/0027-dual-momentum-and-relative-strength-rotation.md)
- **前置依賴**：
  - [PRD #0090 (客戶端 API 速率限制與防封禁配額保護)](0090-client-side-rate-limiting-and-api-quota-guard-spec.md) (已就緒)
  - [PRD #0091 (本地全量歷史技術指標庫與日 K 回補引擎)](0091-local-historical-indicators-and-external-backfill-engine-spec.md) (已就緒)
- **架構連動**：為 [技術債 #0020 (宏觀戰情室)](../debts/0020-market-war-room-macro-liquidity-and-ai-advisor.md) 提供跨資產趨勢排行榜、動能切換信號與現金避風港閘門。

---

## 1. 執行摘要與核心目標 (Executive Summary & Goals)

### 1.1 背景盲區
目前系統在資產配置層面主要依賴固定權重再平衡（[src/engine/rebalancingEngine.ts](file:///d:/APP/股票紀錄/src/engine/rebalancingEngine.ts)）：
- 固定比例再平衡在長期熊市或板塊劇烈輪動時，容易陷入「持續逆勢加碼弱勢資產」的價值陷阱。
- 缺乏經典的**雙重動能 (Dual Momentum, Gary Antonacci)** 量化模型，無法在強勢資產持續領跑時搭順風車，亦無法在系統性熊市時自動觸發「現金避風港 (Safe Haven)」防禦閘門。

### 1.2 核心目標
1. **加權回報動能評分 (12-1M Momentum Score)**：
   - 採用中長期經典動能模型，權重為 $50\% \times R_{12M} + 30\% \times R_{6M} + 20\% \times R_{3M}$，剔除最近 1 個月的短期雜訊與均值回歸效應。
2. **相對動能排行榜 (Relative Momentum Leaderboard)**：
   - 支援在指定競爭資產池（如 `0050` vs `0056` vs `SPY` vs `QQQ` vs `GLD` vs `TLT` 等）中進行動能評分與強弱排序，推選出冠軍標的。
3. **絕對動能安全避風港閘門 (Absolute Momentum & Cash Safe Haven)**：
   - 檢驗冠軍資產之 12 個月總回報是否超越無風險利率（美債 3 個月國庫券或台幣定存利率）。
   - 若超越 ➔ 輸出 `HOLD_TOP` 或 `SWITCH_ASSET`；
   - 若落後或為負 ➔ 所有風險資產動能失靈，自動觸發 `MOVE_TO_CASH` 安全避風港警戒。
4. **預設宏觀與台美資產池模板 (Pre-configured Universes)**：
   - 內建三大代表性資產池：
     - **全球宏觀全天候池 (Global Macro)**：`SPY`, `QQQ`, `0050.TW`, `GLD`, `TLT`
     - **台股核心輪動池 (Taiwan Core Rotation)**：`0050.TW`, `0056.TW`, `00878.TW`, `00713.TW`
     - **美股科技成長輪動池 (US Tech & Mega-Caps)**：`QQQ`, `SPY`, `SMH`, `XLV`

---

## 2. 雙重動能數學模型 (Mathematical Formulations)

### 2.1 滾動報酬計算 (Rolling Returns)
給定時間序列收盤價 $P_t$，計算各時間窗口之報酬率：
$$R_{3M} = \frac{P_t - P_{t-63}}{P_{t-63}}, \quad R_{6M} = \frac{P_t - P_{t-126}}{P_{t-126}}, \quad R_{12M} = \frac{P_t - P_{t-252}}{P_{t-252}}$$

### 2.2 12-1M 加權動能評分 (12-1M Momentum Score)
$$\text{Score} = 0.5 \times R_{12M} + 0.3 \times R_{6M} + 0.2 \times R_{3M}$$
- 若部分歷史數據不足 12 個月但超過 3 個月，自動依可用維度權重重新歸一化。

### 2.3 雙重動能決策狀態機 (Dual Momentum Decision Engine)
1. 找出 $\max(\text{Score})$ 之標的 $A_{\text{top}}$。
2. 絕對動能檢驗：
   $$\text{Excess Return} = R_{12M}(A_{\text{top}}) - R_{\text{riskFree}}$$
3. 訊號輸出：
   - 若 $\text{Excess Return} > 0$：
     - 若使用者目前持有 $A_{\text{top}}$ ➔ `HOLD_TOP`（冠軍續抱）
     - 若未持有 $A_{\text{top}}$ ➔ `SWITCH_ASSET`（建議輪動換股至冠軍標的）
   - 若 $\text{Excess Return} \le 0$：
     - ➔ `MOVE_TO_CASH`（觸發避風港，建議持有現金或超短期國庫券）

---

## 3. 系統介面與資料模型 (`src/types/momentum.ts`)

```typescript
export interface MomentumAssetMetric {
  symbol: string;
  name?: string;
  market: 'TW' | 'US';
  currentPrice: number;
  returns3M: number;       // 3 個月報酬 %
  returns6M: number;       // 6 個月報酬 %
  returns12M: number;      // 12 個月報酬 %
  momentumScore: number;   // 綜合加權動能分數
  isAboveRiskFree: boolean;// 絕對動能是否為正
  rank: number;            // 相對動能名次
}

export type MomentumAction = 'HOLD_TOP' | 'SWITCH_ASSET' | 'MOVE_TO_CASH';

export interface DualMomentumSignal {
  universeId: string;
  universeName: string;
  calculatedAt: string;     // YYYY-MM-DD
  topAsset: MomentumAssetMetric;
  currentHeldSymbol?: string;
  action: MomentumAction;
  actionHeadline: string;   // 例如 "【動能續抱】"、"【觸發避險・現金為王】"
  actionAdvice: string;     // 具體策略紀律解讀
  safeHavenTriggered: boolean;
  leaderboard: MomentumAssetMetric[];
}

export interface MomentumUniverseConfig {
  id: string;
  name: string;
  description: string;
  symbols: Array<{ symbol: string; market: 'TW' | 'US'; name?: string }>;
  riskFreeRateAnnualized: number; // 預設 0.04 (4%)
}
```

---

## 4. 驗收標準 (Acceptance Criteria)

1. **純函式計算驗收**：
   - 撰寫單元測試驗證 3M/6M/12M 報酬計算與 12-1M 加權分數。
   - 驗證相對動能排行榜排序正確（高分排前）。
   - 驗證當冠軍標的 12 個月報酬高於無風險利率時輸出 `HOLD_TOP` 或 `SWITCH_ASSET`。
   - 驗證當所有標的 12 個月報酬低於無風險利率時輸出 `MOVE_TO_CASH` 與 `safeHavenTriggered = true`。
2. **預設資產池模板驗收**：
   - 內建全球宏觀池、台股核心池與美股科技池配置。
3. **全量測試與構建綠燈**：
   - `npm test` 100% 通過，`npm run build` 0 TypeScript 錯誤。
