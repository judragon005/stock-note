# 技術債 #0027: 雙重動能與跨資產趨勢輪動評分引擎 (Dual Momentum & Relative Strength Rotation Engine)

- **狀態**：`RESOLVED`
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 雙重動能與跨資產趨勢輪動調研
- **建立日期**：2026-09-02
- **解決日期**：2026-09-08 (v8.11.0, PRD #0092, ADR #0092)
- **標籤**：`Quant` · `DualMomentum` · `AssetAllocation` · `Strategy` · `Rotation` · `Engine`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備大盤基準比較（[src/engine/quantMetrics.ts](file:///d:/APP/股票紀錄/src/engine/quantMetrics.ts)）與目標配置偏離再平衡（[src/engine/rebalancingEngine.ts](file:///d:/APP/股票紀錄/src/engine/rebalancingEngine.ts)）：
1. **靜態配置 vs. 動態趨勢輪動 (Static vs Dynamic Momentum)**：
   - 現有再平衡機制主要基於「固定目標比例」進行偏離度補單。
   - **實質盲區**：在長期牛熊轉換或產業板塊劇烈輪動時（如科技股與能源/價值股輪動，或股票與長天期美債輪動），靜態配置常陷入「持續逆勢加碼弱勢資產」的困境。
2. **缺乏雙重動能 (Gary Antonacci Dual Momentum) 模型**：
   - 系統尚未提供標準的「絕對動能 (Absolute Momentum)」與「相對動能 (Relative Momentum)」綜合評分體系。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **雙重動能評分演算法 (Dual Momentum Calculation)**：
   - **加權回報動能 (12-1M Momentum)**：
     $$\text{Momentum Score} = 0.5 \times R_{12M} + 0.3 \times R_{6M} + 0.2 \times R_{3M}$$
     （剔除最近 1 個月的短期雜訊，捕捉中期穩固趨勢）。
   - **相對動能 (Relative Momentum)**：在使用者定義的競爭資產池（如：`0050` vs `0056` vs `SPY` vs `QQQ` vs `GLD` vs `TLT`）中進行強弱排序。
   - **絕對動能檢驗 (Absolute Momentum / Trend Filter)**：比對第一名強勢資產之 12 個月滾動報酬是否大於無風險利率（或短期國庫券 BIL / 台幣定存利率）。
2. **防禦性現金避風港閘門 (Defensive Safe Haven Trigger)**：
   - 當所有風險性資產的絕對動能均為負（或低於現金利率）時，系統自動發出「防禦警示」，建議將曝險資金轉入現金或超短期公債（如 BIL / SGOV / 00712B 等）。

### 暫緩理由 (Deferral Rationale)
1. 現有再平衡引擎已能支援常規的指數被動投資與目標權重偏離試算。
2. 雙重動能屬於主動式量化策略輔助維度，收錄於技術債中明確數學模型，待量化戰情室專題時實施。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. 動能輪動資料模型 (Momentum Rotation Schema)

```typescript
export interface MomentumAsset {
  symbol: string;
  name: string;
  returns3M: number;
  returns6M: number;
  returns12M: number;
  weightedScore: number;          // 加權動能評分
  isAboveSafeRate: boolean;       // 絕對動能是否為正 (優於無風險基準)
  rank: number;                   // 資產池內部相對動能排名
}

export interface DualMomentumSignal {
  asOfDate: string;
  universe: string;               // 資產池名稱 (例如 "Global Macro ETF Universe")
  topAsset: MomentumAsset;        // 當前動能冠軍標的
  safeHavenActive: boolean;       // 是否觸發避風港避險 (所有資產絕對動能均為負)
  recommendedAction: 'HOLD_TOP' | 'SWITCH_ASSET' | 'MOVE_TO_CASH';
  targetSymbol: string;           // 建議持有的代碼
  rationale: string;              // 決策文字說明
  leaderboard: MomentumAsset[];   // 完整排行榜
}
```

### B. 核心評分引擎實作思路

```typescript
// src/engine/dualMomentumEngine.ts
export function evaluateDualMomentum(
  universeSymbols: string[],
  historicalQuotes: Record<string, DailyQuote[]>,
  riskFreeRateAnnualized: number = 0.04
): DualMomentumSignal {
  // 1. 計算各標的 3M / 6M / 12M 總報酬 (Total Return 含息)
  // 2. 計算加權綜合動能分數並降序排序
  // 3. 檢驗排名第一標的是否超越無風險利率
  // 4. 生成動能輪動與切換訊號
}
```

---


---

## 5. 解決方案與驗收結果 (Resolution & Verification)

- **實施 PRD**：[docs/specs/0092-dual-momentum-and-relative-strength-rotation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0092-dual-momentum-and-relative-strength-rotation-spec.md)
- **架構決策**：[docs/adr/0092-dual-momentum-and-relative-strength-rotation.md](file:///d:/APP/股票紀錄/docs/adr/0092-dual-momentum-and-relative-strength-rotation.md)
- **實作代碼**：
  - 型別定義：[src/types/momentum.ts](file:///d:/APP/股票紀錄/src/types/momentum.ts)
  - 評分引擎：[src/engine/dualMomentumEngine.ts](file:///d:/APP/股票紀錄/src/engine/dualMomentumEngine.ts)
  - 單元測試：[src/engine/dualMomentumEngine.test.ts](file:///d:/APP/股票紀錄/src/engine/dualMomentumEngine.test.ts)
- **交付功能亮點**：
  1. **12-1M 加權動能評分**：自適應長短週期（`0.5 * 12M + 0.3 * 6M + 0.2 * 3M`）並剔除近 1 個月短期回轉雜訊。
  2. **相對動能排行榜**：支援降序排名、自動排除資料不足之標的。
  3. **絕對動能避風港狀態機**：榜首低於無風險報酬率或所有資產為負時，自動建議退守現金避風港標的（如 BIL / SGOV / 00712B 等）。
  4. **三大預設資產池**：全球核心輪動（SPY/QQQ/TLT/GLD）、台股強勢版塊（0050/0056/00713/00919/006208）、美股美債對沖輪動。
- **測試覆蓋**：5/5 單元測試 100% 通過，全工程 53 套件 589 測試全數綠燈，TypeScript 編譯零錯誤。

