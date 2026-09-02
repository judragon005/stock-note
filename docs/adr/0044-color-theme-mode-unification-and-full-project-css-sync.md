# ADR-0044: 全專案「慣用紅綠漲跌」色彩模式統一與 CSS 變數體系全面連動

## 1. 背景與問題 (Context & Problem Statement)

專案提供「慣用紅綠漲跌」切換機制（台股模式：🔴 紅漲 🟢 綠跌；國際模式：🟢 綠漲 🔴 紅跌），透過在 `document.documentElement` 設定 `data-color-theme` 屬性驅動全域色彩。

然而，在近期快速演進的模組中（如 `PortfolioGrowthChart.tsx`、`XirrDetailModal.tsx` 等），部分樣式直接寫死 Hex 色碼（如 `#ef4444` / `#10b981`），導致切換至國際模式時，全期累計總損益、當日漲跌額、XIRR 及超額回報 Alpha 產生色彩倒置與混亂，且 Header 切換按鈕在國際模式時文案漏字（「🟢 綠漲 🔴 跌」）。

## 2. 決策內容 (Decision)

1. **全面統一為 CSS 變數標準**：
   - 漲/正向收益統一使用 `var(--gain-color)`（背景使用 `var(--gain-bg)`）。
   - 跌/負向虧損統一使用 `var(--loss-color)`（背景使用 `var(--loss-bg)`）。
   - 在 `data-color-theme="taiwan"` 下，`--gain-color` 為 `#ef4444`，`--loss-color` 為 `#10b981`。
   - 在 `data-color-theme="international"` 下，`--gain-color` 為 `#10b981`，`--loss-color` 為 `#ef4444`。
2. **區分中性資產指標與動態損益色彩**：
   - 「當前淨資產 (NAV)」與「最高淨值 (ATH)」總額維持中性主題亮色（避免頻繁隨正負跳色）。
   - 「當日漲跌額 / 報酬率」、「全期累計總損益」、「XIRR」、「Alpha 超額報酬」則嚴格即時連動。
3. **量化風險評級維持獨立語意**：
   - Sharpe Ratio、Beta、波動率與 MDD 維持其客觀風險層級語意色（藍/紫/黃/紅等），不與漲跌反轉混淆。
4. **Header 按鈕對稱性**：
   - 統一為「`🔴 紅漲 🟢 綠跌`」與「`🟢 綠漲 🔴 紅跌`」。

## 3. 結果與影響 (Consequences)

- **優點**：
  - 徹底杜絕切換紅綠漲跌時顏色錯亂與倒置問題。
  - 單一事實來源 (Single Source of Truth)，未來所有新增元件只需使用 `var(--gain-color)` / `var(--loss-color)` 即可自動支援主題切換。
  - 符合 KISS 原則，零額外 React 狀態穿透或 JS 計算開銷。
- **缺點**：
  - SVG 向量圖內部使用 CSS 變數時需確保符合 SVG 規範（例如 fill / stroke 屬性）。
