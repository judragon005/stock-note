# PRD #0044: 全專案「慣用紅綠漲跌」色彩模式統一與 CSS 變數體系全面連動規格書 (Color Theme Mode Unification & Full Project CSS Sync)

- **版本**：v5.7.3
- **狀態**：`PROPOSED`
- **日期**：2026-08-28
- **關聯 PRD**：
  - [PRD #0022: 全歷史淨值折線圖與資產成長曲線 (Portfolio Equity Curve)](0022-historical-nav-and-portfolio-equity-curve.md)
  - [PRD #0033: 精確含息資金加權年化報酬率 XIRR 引擎與穿透透視系統](0033-xirr-performance-engine.md)
  - [PRD #0043: 機構級量化風控指標卡片懸浮雙層診斷與即時解讀系統規格書](0043-quant-metrics-interactive-diagnosis-and-tooltips.md)
- **目標檔案**：
  - `src/components/Header.tsx` (修復切換按鈕文字對稱性)
  - `src/components/PortfolioGrowthChart.tsx` (全面重構：以 `var(--gain-color)` / `var(--loss-color)` 取代寫死 hex 色碼，包含 NAV 卡片、全期累計總損益、XIRR 與 Alpha 指標)
  - `src/components/XirrDetailModal.tsx` (修復報酬率正負色碼連動)
  - `src/components/MarginStressModal.tsx` (修復保證金追繳試算金額正負色碼連動)
  - `src/components/LotsBreakdownModal.tsx` (確認並強化 CSS 變數備援)
  - `src/index.css` (確認與規範全域 `--gain-color` / `--loss-color` 之 `data-color-theme` 行為)

---

## 1. 概述與問題背景 (Executive Summary & Problem Statement)

### 1.1 現行痛點
系統頂部工具列提供「慣用紅綠漲跌」切換功能（台股模式：🔴 紅漲 🟢 綠跌；國際模式：🟢 綠漲 🔴 紅跌），並在 `document.documentElement` 上設定 `data-color-theme` 屬性。然而在實際使用中發現：
1. **多個關鍵元件寫死色碼**：近期開發與擴充的元件（如 `PortfolioGrowthChart.tsx`、`XirrDetailModal.tsx`、`MarginStressModal.tsx` 等）內部直接寫死了 `#ef4444`（紅）與 `#10b981`（綠），未採用專案定義的 `data-color-theme` CSS 變數。
2. **顏色語意嚴重錯亂**：在切換至「國際模式 (綠漲紅跌)」時，全期累計總損益之正值仍顯示為紅色、當日正報酬亦顯示為紅色，導致視覺與使用者認知產生嚴重衝突。
3. **按鈕文字不對稱**：頂部 Header 的切換按鈕在切換到國際模式時顯示為「`🟢 綠漲 🔴 跌`」（漏了「紅」字）。

### 1.2 系統目標
- **全面對齊 CSS 變數體系**：全專案所有代表漲跌、損益、超額回報 (Alpha) 的數值顏色，全面統一使用 CSS 變數 `var(--gain-color)` 與 `var(--loss-color)`。
- **保留中性與主題色彩層次**：
  - 「當前淨資產 (NAV)」與「最高淨值 (ATH)」總額維持中性亮色主題（不隨漲跌頻繁跳色）。
  - 「當日漲跌金額 / 報酬率」、「全期累計總損益」、「XIRR」、「Alpha 超額報酬」則嚴格即時動態連動。
- **修復 Header 按鈕標籤**：統一為「`🔴 紅漲 🟢 綠跌`」與「`🟢 綠漲 🔴 紅跌`」。

---

## 2. 色彩架構規範與對應矩陣 (Color Design System Specification)

### 2.1 CSS 變數標準 (`src/index.css`)

```css
/* 預設與台灣市場主題：紅漲綠跌 */
:root,
[data-color-theme="taiwan"] {
  --profit-color: #ef4444;
  --profit-bg: rgba(239, 68, 68, 0.12);
  --loss-color: #10b981;
  --loss-bg: rgba(16, 185, 129, 0.12);
  --gain-color: var(--profit-color);
  --gain-bg: var(--profit-bg);
}

/* 國際/美股主題：綠漲紅跌 */
[data-color-theme="international"] {
  --profit-color: #10b981;
  --profit-bg: rgba(16, 185, 129, 0.12);
  --loss-color: #ef4444;
  --loss-bg: rgba(239, 68, 68, 0.12);
  --gain-color: var(--profit-color);
  --gain-bg: var(--profit-bg);
}
```

### 2.2 各區塊色彩連動規則矩陣

| 元件 / 區塊 | 數值意義 | 台灣模式 (`taiwan`) | 國際模式 (`international`) | 實作標準 |
| :--- | :--- | :--- | :--- | :--- |
| **Header 模式開關** | 標籤文案 | `🔴 紅漲 🟢 綠跌` | `🟢 綠漲 🔴 紅跌` | 對稱雙字標籤 |
| **NAV 卡片 - 總淨資產** | 總資產金額 | `#10b981` / 綠青中性色 | `#10b981` / 綠青中性色 | 保持中性主題色 |
| **NAV 卡片 - 當日漲跌** | `dailyPnL >= 0` | 紅色 (`#ef4444`) | 綠色 (`#10b981`) | `isGain ? 'var(--gain-color)' : 'var(--loss-color)'` |
| **全期累計總損益** | `totalProfitPnL >= 0` | 紅色 (`#ef4444`) | 綠色 (`#10b981`) | `isGain ? 'var(--gain-color)' : 'var(--loss-color)'` |
| **全期累計報酬率 %** | `totalReturnPercent >= 0`| 紅色 (`#ef4444`) | 綠色 (`#10b981`) | `isGain ? 'var(--gain-color)' : 'var(--loss-color)'` |
| **XIRR 年化報酬率** | `xirrPercent >= 0` | 紅色 (`#ef4444`) | 綠色 (`#10b981`) | `isGain ? 'var(--gain-color)' : 'var(--loss-color)'` |
| **量化指標 - Alpha** | `alpha >= 0` (超額回報) | 亮紅 (`var(--gain-color)`) | 亮綠 (`var(--gain-color)`) | 連動 `var(--gain-color)` / `var(--loss-color)` |
| **量化指標 - Sharpe/MDD** | 風險評級 | 客觀風險色 (藍/紫/黃/紅) | 客觀風險色 (藍/紫/黃/紅) | 維持通用量化風險評級 |
| **XIRR 穿透視窗** | 簡單報酬率、個別損益 | 紅色 (`#ef4444`) | 綠色 (`#10b981`) | `var(--gain-color)` / `var(--loss-color)` |
| **保證金壓力測試視窗** | 需補繳保證金 / 安全水位 | 警戒色 / 安全色 | 警戒色 / 安全色 | 連動 `var(--gain-color)` / `var(--loss-color)` |

---

## 3. 受影響檔案與重構清單 (Target Code Modification Details)

### 3.1 `src/components/Header.tsx`
- **變更點**：修正切換按鈕文字。
- **代碼位置**：約 line 274。
- **變更前**：`{colorTheme === 'taiwan' ? '🔴 紅漲 🟢 綠跌' : '🟢 綠漲 🔴 跌'}`
- **變更後**：`{colorTheme === 'taiwan' ? '🔴 紅漲 🟢 綠跌' : '🟢 綠漲 🔴 紅跌'}`

### 3.2 `src/components/PortfolioGrowthChart.tsx`
- **變更點 1**：當日漲跌額度與百分比色彩。
  - `color: activeSnapshot.dailyPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`
- **變更點 2**：全期累計總損益大字色彩。
  - `color: (activeSnapshot?.cumulativeReturnPnL || 0) >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`
- **變更點 3**：全期累計總報酬率百分比色彩。
  - `color: (activeSnapshot?.cumulativeReturnPercent || 0) >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`
- **變更點 4**：XIRR 數值色彩。
  - `color: metrics.xirrPercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`
- **變更點 5**：量化指標 Alpha 數值色彩。
  - `color: quantMetrics.alpha !== null ? (quantMetrics.alpha >= 0 ? 'var(--gain-color)' : 'var(--loss-color)') : 'var(--text-muted)'`

### 3.3 `src/components/XirrDetailModal.tsx`
- **變更點**：彈窗中各個期間報酬率 (simpleReturnPercent) 與損益數值色彩替換為 `var(--gain-color)` / `var(--loss-color)`。

### 3.4 `src/components/MarginStressModal.tsx`
- **變更點**：保證金試算中追繳警示與差額數值色彩替換為 `var(--gain-color)` / `var(--loss-color)`。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] **AC 1**：在「🔴 紅漲 🟢 綠跌」模式下：
  - NAV 卡片中正向當日漲跌為紅色、負向為綠色。
  - 全期累計總損益正數為紅色、負數為綠色。
  - XIRR 正數為紅色、負數為綠色。
  - Alpha 正數為紅色、負數為綠色。
- [ ] **AC 2**：在「🟢 綠漲 🔴 紅跌」模式下：
  - NAV 卡片中正向當日漲跌為綠色、負向為紅色。
  - 全期累計總損益正數為綠色、負數為紅色。
  - XIRR 正數為綠色、負數為紅色。
  - Alpha 正數為綠色、負數為紅色。
- [ ] **AC 3**：Header 工具列切換按鈕文字在兩模式間切換時，精確顯示為「`🔴 紅漲 🟢 綠跌`」與「`🟢 綠漲 🔴 紅跌`」。
- [ ] **AC 4**：全專案單元測試 100% 通過 (`npm test`) 且 TypeScript 零錯誤編譯 (`npm run build`)。

---

## 5. 測試策略 (Testing Strategy)

1. **單元測試 (Unit Tests)**：
   - 驗證 `Header` 元件按鈕切換渲染文字正確性。
   - 驗證各組件 Render 時產生的 CSS 樣式包含 `var(--gain-color)` 與 `var(--loss-color)`。
2. **全迴歸測試 (Regression Tests)**：
   - 執行 `npm test` 確保所有既有 100+ 個單元測試全數 PASS。
   - 執行 `npm run build` 確保生產環境打包無任何 TypeScript 或 CSS 報錯。
