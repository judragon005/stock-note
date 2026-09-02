# ADR 0043: 機構級量化風控指標卡片雙層懸浮診斷與動態即時解讀系統 (Quant Metrics Interactive Diagnosis & Tooltips)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **決策者**：AI 協作團隊
- **關聯 PRD**：[PRD #0043: 機構級量化風控指標卡片懸浮雙層診斷與即時解讀系統規格書](../specs/0043-quant-metrics-interactive-diagnosis-and-tooltips.md)
- **關聯 ADR**：
  - [ADR 0041: 交易計畫紀律檢討、風控觸價警示與大盤量化基準對比](0041-trade-discipline-risk-alerts-and-quant-benchmark.md)
  - [ADR 0042: 當日異動事件置頂常駐與量化指標混合智能常駐](0042-permanent-quant-dashboard-and-event-layout.md)

---

## 1. 背景與脈絡 (Context)

在系統建立常駐之「🏆 機構級量化風控與超額報酬看板」後，使用者回饋指出：
1. **量化指標專業門檻高**：一般投資人對詹森阿爾法 (Alpha)、貝塔 (Beta)、夏普值 (Sharpe)、最大回撤 (MDD) 與年化波動度 (Volatility) 的公式與金融意涵理解困難。
2. **缺乏即時動態解讀**：看板只呈現數字（如 `+3.23%`、`0.17`、`0.38`），未提供對應當前數值的「健康度評級 Badge」與「具體量化策略建議」，使用者無法直觀得知自身操作優劣與潛在風險。

---

## 2. 決策方案 (Decision)

### 2.1 動態診斷引擎設計 (`quantMetrics.ts`)
1. **純函式解耦 (`getQuantMetricDiagnosis`)**：
   - 接收 `QuantPerformanceMetrics` 與 `benchmarkLabel`。
   - 分別針對 5 大指標建立數值臨界區間對照表，回傳包含 `title`、`fullName`、`definition`、`formula`、`benchmarkNote`、`level`、`levelBadge`、`badgeColor`、`summary` 與 `suggestion` 之完整診斷結構。
2. **5 大指標區間評級標籤**：
   - **Alpha**：`🌟 卓越超額` ($\ge 5\%$)、`🟢 穩健超額` ($0\% \sim 5\%$)、`🟡 略遜大盤` ($-5\% \sim 0\%$)、`🔴 落後大盤` ($< -5\%$)、`⚪ 需大盤基準` (無基準)。
   - **Beta**：`🛡️ 防禦獨立型` ($< 0.5$)、`🟢 低度聯動` ($0.5 \sim 0.8$)、`🔵 大盤同步` ($0.8 \sim 1.2$)、`⚡ 敏銳進攻型` ($> 1.2$)、`⚪ 需大盤基準` (無基準)。
   - **Sharpe**：`🌟 極致卓越` ($\ge 2.0$)、`🟢 優良穩健` ($1.0 \sim 2.0$)、`🟡 回報偏弱` ($0.0 \sim 1.0$)、`🔴 需留意` ($< 0$)。
   - **MDD**：`🛡️ 風控極佳` ($\le 10\%$)、`🟡 正常回撤` ($10\% \sim 20\%$)、`🟠 波動偏高` ($20\% \sim 35\%$)、`🔴 風險警示` ($> 35\%$)。
   - **Volatility**：`🛡️ 低波防守` ($< 10\%$)、`🟢 中等平穩` ($10\% \sim 20\%$)、`🟠 高波成長` ($20\% \sim 35\%$)、`⚡ 極高波動` ($> 35\%$)。

### 2.2 雙層懸浮 Tooltip 互動設計 (`PortfolioGrowthChart.tsx`)
1. **雙層視覺架構**：
   - **上層（原理層）**：深藍毛玻璃背景，顯示指標中文名、英文全名、計算公式與基準常數說明。
   - **中層分隔線**：細緻半透明分割線。
   - **下層（診斷層）**：評級 Badge（帶專屬狀態主題色）、一句話即時診斷核心結論與 💡 具體量化操作建議。
2. **防邊界溢出 (Auto-placement)**：
   - 最左側卡片（Alpha）：`left: 0` 靠左對齊。
   - 中間卡片（Beta / Sharpe / MDD）：`left: 50%, transform: translateX(-50%)` 居中對齊。
   - 最右側卡片（Volatility）：`right: 0, left: auto` 靠右對齊。
3. **多端相容**：
   - 桌面端：Hover 即時平滑浮現，滑開淡出。
   - 行動端 / 平板：Tap 點擊切換顯示，點擊卡片外部自動關閉。

---

## 3. 結果與影響 (Consequences)

### 正面效益
- **零認知門檻**：投資人游標移至任一指標即可秒懂其計算原理與即時投資診斷，極大幅提升系統的機構級專業感與易用性。
- **邊界安全性**：全螢幕不同解析度下均不溢出可視範圍，手機平板操作自如。
- **100% TDD 綠燈**：24 個測試套件、296 個單元測試全數綠燈，TypeScript 0 編譯錯誤。

---

## 4. 驗證與測試 (Verification)

- `npm test src/engine/quantMetrics.test.ts` 通過 20 項測試。
- `npm test` 全量 296 項測試 100% 通過。
- `npm run build` 生產構建成功。
