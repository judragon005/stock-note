# PRD #0043: 機構級量化風控指標卡片懸浮雙層診斷與即時解讀系統規格書 (Quant Metrics Interactive Diagnosis & Dynamic Tooltips)

- **版本**：v5.7.2
- **狀態**：`PROPOSED`
- **日期**：2026-08-28
- **關聯 PRD**：
  - [PRD #0041: 交易計畫紀律檢討、風控觸價警示與大盤量化基準對比](0041-trade-discipline-risk-alerts-and-quant-benchmark.md)
  - [PRD #0042: 當日異動事件置頂常駐與量化指標混合智能常駐](0042-quant-dashboard-and-events-permanent-layout.md)
- **目標檔案**：
  - `src/types/stock.ts` (型別擴充：MetricDiagnosis, QuantDiagnosisMap)
  - `src/engine/quantMetrics.ts` (新增：`getQuantMetricDiagnosis` 動態診斷分析器)
  - `src/engine/quantMetrics.test.ts` (單元測試：全區間指標診斷與文字驗證)
  - `src/components/PortfolioGrowthChart.tsx` (升級：量化卡片 Hover/Tap 雙層 Tooltip 元件與防溢出機制)

---

## 1. 概述與業務價值 (Executive Summary & Business Value)

### 1.1 現行痛點
在 v5.7.1 中，淨值成長曲線下方已常駐呈現「🏆 機構級量化風控與超額報酬看板」（含 Alpha、Beta、Sharpe、MDD、Volatility 5 大指標）。然而：
1. **量化指標專業門檻高**：一般投資人對詹森阿爾法 (Alpha) 或貝塔 (Beta) 等計量金融術語感到生疏，不清楚其背後的數學原理與衡量意義。
2. **缺乏即時動態解讀**：看板只呈現數字（如 `+3.23%`、`0.17`、`0.38`），未提供對應當前數值的「健康度評級」與「具體策略解讀」，使用者無法直觀得知自身操作優劣與潛在風險。

### 1.2 系統目標
為 5 大量化指標卡片建立**「雙層懸浮 Tooltip 即時診斷系統」**：
- **上層（原理層）**：呈現指標全名、CAPM/統計金融定義、計算公式與基準常數。
- **下層（診斷層）**：依據當前即時數值，動態計算**健康度評級 Badge**、**專業量化機構語氣診斷**與**操作策略建議**。
- **互動體驗**：支援滑鼠 Hover 平滑淡入、行動端/平板點擊切換，並具備智慧防邊界溢出 (Auto-placement)。

---

## 2. 資料結構與型別規格 (Data Models Specification)

### 2.1 型別定義 (`src/types/stock.ts`)

```typescript
export type DiagnosisHealthLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'ATTENTION' | 'NEUTRAL';

export interface MetricDiagnosis {
  id: 'alpha' | 'beta' | 'sharpe' | 'mdd' | 'volatility';
  title: string;              // 指標完整中文名 (例如：詹森阿爾法 (Jensen's Alpha))
  definition: string;         // 原理與金融定義說明
  formula: string;            // 計算公式 (例如：α = Rp - [Rf + β(Rb - Rf)])
  benchmarkNote?: string;     // 基準或參數說明 (例如：無風險利率 Rf = 1.5%)
  
  // 動態診斷結果 (依當前數值產出)
  level: DiagnosisHealthLevel;// 評級健康度
  levelBadge: string;         // 顯示標籤 (例如：🟢 穩健超額、🛡️ 防禦獨立型)
  badgeColor: string;         // 標籤主題色 (如 #10b981, #60a5fa, #fbbf24, #f87171)
  summary: string;            // 一句話即時診斷核心結論
  suggestion: string;         // 具體量化操作建議
}

export type QuantDiagnosisMap = Record<'alpha' | 'beta' | 'sharpe' | 'mdd' | 'volatility', MetricDiagnosis>;
```

---

## 3. 計算與診斷邏輯規格 (Calculation & Diagnosis Engine)

在 `src/engine/quantMetrics.ts` 中新增導出函式：
```typescript
export function getQuantMetricDiagnosis(
  metrics: QuantPerformanceMetrics,
  benchmarkLabel: string
): QuantDiagnosisMap;
```

### 3.1 五大指標診斷判斷矩陣

#### 1. 👑 詹森阿爾法 (Jensen's Alpha)
- **定義**：在 CAPM 資本資產定價模型下，扣除承擔市場系統性風險後的「純主動選股與擇時超額報酬」。
- **公式**：$\alpha = R_{p,\text{ann}} - [R_f + \beta(R_{b,\text{ann}} - R_f)]$
- **判定門檻**：
  - `metrics.alpha === null`（無基準）：
    - 評級：`NEUTRAL` | 標籤：`⚪ 需大盤基準`
    - 診斷：目前未選取大盤基準，無法計算 CAPM 風險調整超額報酬。
    - 建議：切換上方 0050 或 SPY 基準即可解鎖 Alpha 指標。
  - `alpha >= 5.0%`：
    - 評級：`EXCELLENT` | 標籤：`🌟 卓越超額`
    - 診斷：主動選股創造極強超額收益，大幅跑贏同等風險下的市場期望回報。
    - 建議：策略運作極佳，建議保持既有選股邏輯並適時保護獲利。
  - `0.0% <= alpha < 5.0%`（如 `+3.23%`）：
    - 評級：`GOOD` | 標籤：`🟢 穩健超額`
    - 診斷：成功創造正向超額報酬，主動配置展現正向選股與擇時貢獻。
    - 建議：維持良好紀律，持續追蹤持股基本面以鞏固超額收益。
  - `-5.0% <= alpha < 0.0%`：
    - 評級：`FAIR` | 標籤：`🟡 略遜大盤`
    - 診斷：主動配置未能完全彌補承擔之市場風險，整體回報略遜於基準被動指數。
    - 建議：檢視虧損部位進場假設，或適度提高核心指數化被動持股比重。
  - `alpha < -5.0%`：
    - 評級：`ATTENTION` | 標籤：`🔴 落後大盤`
    - 診斷：主動選股或擇時產生負貢獻，承擔風險卻大幅落後大盤指數。
    - 建議：嚴格執行停損風控，檢討選股策略或轉向大盤 ETF 被動投資。

#### 2. ⚖️ 貝塔係數 (Beta)
- **定義**：衡量投資組合相對於基準大盤波動的敏感度（系統性風險與聯動率）。
- **公式**：$\beta = \frac{\text{Cov}(r_p, r_b)}{\text{Var}(r_b)}$，相關度 $r = \text{Corr}(r_p, r_b)$
- **判定門檻**：
  - `metrics.beta === null`（無基準）：
    - 評級：`NEUTRAL` | 標籤：`⚪ 需大盤基準`
    - 診斷：需選取大盤基準以試算市場敏感度與相關係數。
    - 建議：切換上方大盤按鈕即可即時分析。
  - `beta < 0.50`（如 `0.17`）：
    - 評級：`GOOD` | 標籤：`🛡️ 防禦獨立型`
    - 診斷：對大盤波動極不敏感，系統性風險極低，走勢具備高度獨立性。
    - 建議：抗大盤崩跌能力強，在空頭市場表現穩健；大盤多頭時可能彈力較溫和。
  - `0.50 <= beta <= 0.80`：
    - 評級：`GOOD` | 標籤：`🟢 低度聯動`
    - 診斷：波動幅度小於大盤，配置風格偏向低波防守或高防禦權重。
    - 建議：兼具防禦力與部分指數上漲動能，適合穩健投資者。
  - `0.80 < beta <= 1.20`：
    - 評級：`NEUTRAL` | 標籤：`🔵 大盤同步`
    - 診斷：波動幅度與大盤相當，主要承擔市場平均系統性風險。
    - 建議：績效將高度取決於總體市場多空走向。
  - `beta > 1.20`：
    - 評級：`ATTENTION` | 標籤：`⚡ 敏銳進攻型`
    - 診斷：波動大於大盤，大盤上漲時彈力強勁，但回檔時下檔壓力顯著加劇。
    - 建議：宜隨時留意大盤頭部訊號，落實高檔分批減碼。

#### 3. ⚡ 夏普值 (Sharpe Ratio)
- **定義**：每承擔 1% 總年化波動度所換取的超額年化報酬率（無風險利率基準 1.5%）。
- **公式**：$\text{Sharpe} = \frac{R_{p,\text{ann}} - R_f}{\sigma_{p,\text{ann}}}$
- **判定門檻**：
  - `sharpe >= 2.0`：
    - 評級：`EXCELLENT` | 標籤：`🌟 極致卓越`
    - 診斷：風險調整後報酬極佳，承擔每單位波動均換取超額回報，達機構頂級水準。
    - 建議：性價比極高，策略效益極大化。
  - `1.0 <= sharpe < 2.0`：
    - 評級：`GOOD` | 標籤：`🟢 優良穩健`
    - 診斷：投資組合性價比健康，承受風險能獲得充沛的超額回報。
    - 建議：維持既有部位配置與風險控管節奏。
  - `0.0 <= sharpe < 1.0`（如 `0.38`）：
    - 評級：`FAIR` | 標籤：`🟡 回報偏弱`
    - 診斷：具備正報酬但性價比偏低，每單位波動所換取的超額收益相對有限。
    - 建議：可透過優化停損停利點或剔除高波低回報持股以提升夏普值。
  - `sharpe < 0.0`：
    - 評級：`ATTENTION` | 標籤：`🔴 需留意`
    - 診斷：年化報酬率低於 1.5% 無風險利率，承擔市場波動卻未獲合理回報。
    - 建議：宜重新檢視資產配置或降低投機性部位。

#### 4. 📉 最大回撤 (Max Drawdown, MDD)
- **定義**：統計區間內從淨值歷史峰值跌落至谷底的最大百分比跌幅（極端歷史虧損壓力）。
- **公式**：$\text{MDD} = \max_{t} \left( \frac{\text{Peak}_t - \text{NAV}_t}{\text{Peak}_t} \right)$
- **判定門檻**：
  - `portfolioMaxDrawdown <= 10.0%`：
    - 評級：`EXCELLENT` | 標籤：`🛡️ 風控極佳`
    - 診斷：歷史最大回檔控制在 10% 內，下檔保護能力極為優異。
    - 建議：防守嚴密，資金安全邊際充裕。
  - `10.0% < portfolioMaxDrawdown <= 20.0%`（如 `-18.40%`）：
    - 評級：`GOOD` | 標籤：`🟡 正常回撤`
    - 診斷：處於一般股票型組合常見回檔區間，需對照基準大盤回撤監控風險。
    - 建議：維持既定停損紀律，避免在震盪低谷時恐慌殺跌。
  - `20.0% < portfolioMaxDrawdown <= 35.0%`：
    - 評級：`FAIR` | 標籤：`🟠 波動偏高`
    - 診斷：曾歷經顯著資產縮水，持倉心理壓力較大。
    - 建議：落實單筆虧損上限控制，適度分散單一個股權重。
  - `portfolioMaxDrawdown > 35.0%`：
    - 評級：`ATTENTION` | 標籤：`🔴 風險警示`
    - 診斷：歷史深度回撤過大，本金承受嚴峻考驗。
    - 建議：必須重新檢視部位規模管理，嚴格執行機械化停損。

#### 5. 🌊 年化波動度 (Annualized Volatility)
- **定義**：每日報酬率標準差經 252 交易日年化後之指標，反映淨值震盪起伏劇烈程度。
- **公式**：$\sigma_{\text{ann}} = \text{std}(r_p) \times \sqrt{252}$
- **判定門檻**：
  - `volatility < 10.0%`（如 `8.70%`）：
    - 評級：`GOOD` | 標籤：`🛡️ 低波防守`
    - 診斷：淨值走勢平穩抗震，震盪幅度溫和，持倉心理壓力低。
    - 建議：走勢穩定度高，利於長期複利滾動。
  - `10.0% <= volatility <= 20.0%`：
    - 評級：`GOOD` | 標籤：`🟢 中等平穩`
    - 診斷：接近大盤指數或優質權值股標準波動區間，成長與穩定兼備。
    - 建議：維持均衡資產配置。
  - `20.0% < volatility <= 35.0%`：
    - 評級：`FAIR` | 標籤：`🟠 高波成長`
    - 診斷：淨值起伏較大，常見於高成長飆股或持股集中度偏高之組合。
    - 建議：需做好心理耐受準備，並設定明確的停利退場機制。
  - `volatility > 35.0%`：
    - 評級：`ATTENTION` | 標籤：`⚡ 極高波動`
    - 診斷：淨值劇烈震盪如雲霄飛車，具有高不確定性。
    - 建議：應降低槓桿或調整高風險個股比重。

---

## 4. 使用者介面升級 (UI / UX Specification)

### 4.1 雙層 Tooltip 元件設計
```tsx
<div className="quant-metric-tooltip">
  {/* 上層：原理層 */}
  <div className="tooltip-header">
    <div className="title-row">
      <span className="name">{diagnosis.title}</span>
      <span className="formula-tag">{diagnosis.formula}</span>
    </div>
    <div className="definition-text">{diagnosis.definition}</div>
    {diagnosis.benchmarkNote && (
      <div className="benchmark-note">📌 {diagnosis.benchmarkNote}</div>
    )}
  </div>

  {/* 分隔線 */}
  <div className="tooltip-divider" />

  {/* 下層：即時診斷層 */}
  <div className="tooltip-body">
    <div className="diagnosis-row">
      <span className="badge" style={{ backgroundColor: diagnosis.badgeColor }}>
        {diagnosis.levelBadge}
      </span>
      <span className="diagnosis-text">{diagnosis.summary}</span>
    </div>
    <div className="suggestion-box">
      <span className="label">💡 策略建議：</span>
      <span>{diagnosis.suggestion}</span>
    </div>
  </div>
</div>
```

### 4.2 視覺與互動規格
1. **背景與樣式**：
   - 採用 Deep Glassmorphism 風格 (`background: rgba(15, 23, 42, 0.96)`, `backdrop-filter: blur(12px)`，邊框 `1px solid rgba(255, 255, 255, 0.15)`)。
   - 寬度設定：`max-width: 320px`，文字層次清晰，排版精巧。
2. **位置定位與防溢出 (Auto-placement)**：
   - 預設定位於卡片上方中央 (`top: auto; bottom: 100%; margin-bottom: 8px`)。
   - 當卡片位於最左側或最右側時，自動靠齊卡片邊緣，避免超出可視邊界。
3. **行動端點擊支援**：
   - 支援卡片點擊切換顯示 Tooltip，點擊畫面其他區域或再次點擊卡片可即時關閉。

---

## 5. 驗收條件 (Acceptance Criteria)

- [ ] **AC-1 診斷邏輯完整覆蓋**：`quantMetrics.ts` 中的 `getQuantMetricDiagnosis()` 對 5 大指標的所有數值區間（含無基準情況）皆能產出對應的評級、標籤、診斷與建議。
- [ ] **AC-2 單元測試 100% 綠燈**：`quantMetrics.test.ts` 覆蓋全部 5 大指標之各種臨界數值邊界測試（包含正值、負值、臨界值與無基準狀態）。
- [ ] **AC-3 雙層 Tooltip 呈現**：滑鼠 Hover 於看板上的 Alpha、Beta、Sharpe、MDD、Volatility 任一卡片時，均能平滑浮現包含「原理層」與「即時診斷層」之雙層 Tooltip。
- [ ] **AC-4 狀態色標與 Badge 一致**：Badge 顏色與評級（綠/藍/黃/紅）清晰易讀，文字格式排版整齊無跑版。
- [ ] **AC-5 行動端觸控相容**：在手機或平板觸控點擊卡片時能正常展開 Tooltip，且具有邊界防溢出保護。
- [ ] **AC-6 構建與無損相容**：`npm test` 全數通過，`npm run build` TypeScript 0 錯誤。

---

## 6. 測試與驗證計畫 (Test Plan)

1. **單元測試 (`quantMetrics.test.ts`)**：
   - 驗證 `alpha = 3.23` 產出 `🟢 穩健超額` 與對應診斷文字。
   - 驗證 `alpha = null` 產出 `⚪ 需大盤基準`。
   - 驗證 `beta = 0.17` 產出 `🛡️ 防禦獨立型`。
   - 驗證 `sharpe = 0.38` 產出 `🟡 回報偏弱`。
   - 驗證 `mdd = 18.40` 產出 `🟡 正常回撤`。
   - 驗證 `volatility = 8.70` 產出 `🛡️ 低波防守`。
2. **UI 視覺與互動驗證**：
   - 啟動 `npm run dev` 在瀏覽器中依序 Hover 5 張卡片，檢查浮現之雙層 Tooltip 內容與動畫效果。
