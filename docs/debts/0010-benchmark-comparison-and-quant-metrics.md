# 技術債 #0010: 大盤基準疊圖 (0050/SPY) 與量化績效指標 (Alpha, Beta, Sharpe, MDD) (Benchmark & Quant Metrics)

- **狀態**：`RESOLVED` (已於 v5.7.0 ADR #0041 完整解決)
- **優先級**：`P2`
- **發現來源**：專業金融軟體架構審查 (Financial Software Engineering Audit)
- **建立日期**：2026-08-26
- **標籤**：`Quant` · `Performance` · `Visualization` · `Benchmark`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統於 `src/components/PortfolioGrowthChart.tsx` 與 `src/engine/historicalNav.ts` 實現了投資組合之每日資產總值與累積時間加權報酬率 (TWRR) 圖表。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **缺乏大盤基準對照 (Benchmark Overlay)**：投資人無法直接將自身投資組合的累積成長曲線與主要市場指數（如台股 0050、美股 SPY/VOO、那斯達克 QQQ）進行歸一化 (Normalized to 100%) 疊圖，無法衡量主動投資之超額報酬。
  2. **缺乏機構級量化風控指標**：缺乏年化複合成長率 (CAGR)、歷史最大回撤 (Max Drawdown, MDD)、年化波動度 (Volatility)、夏普值 (Sharpe Ratio)、索提諾比 (Sortino Ratio) 與阿爾法/貝塔係數 (Alpha / Beta)。
* **暫緩理由**：
  1. 目前 TWRR 圖表已能清晰呈現自身本金投入與總淨值成長。
  2. 指數歷史 K 線抓取與量化數學統計公式需獨立模組化，列入 P2 技術債集中開發。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **建立基準歷史獲取模組 (`src/engine/benchmarkFetcher.ts`)**：
   - 支援 0050.TW (台股加權代用)、SPY (標普500)、QQQ (那斯達克) 等標的之歷史收盤價獲取與本地快取。
2. **開發量化統計指標計算器 (`src/engine/quantMetrics.ts`)**：
   - 計算年化波動度 $\sigma$ 與無風險利率（如台灣央行定存利率或美國聯準會 SOFR/3M 國債利率）。
   - 計算夏普值 $\text{Sharpe} = \frac{R_p - R_f}{\sigma_p}$ 與 最大回撤 $\text{MDD} = \min \left(\frac{\text{NAV}_t - \text{Peak}}{\text{Peak}}\right)$。
3. **升級圖表元件**：
   - 在 `PortfolioGrowthChart.tsx` 提供 Benchmark 開關（可勾選「疊加 0050」或「疊加 SPY」）。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者希望評估投資組合是否打敗大盤或檢視風險調整後報酬率。
2. 進行 P2 階段圖表與績效深化時。
