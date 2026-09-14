# Spec 0128: 股票健診系統 UX/UI 全面重構、原生毛玻璃擬態與 ETF 智慧引導規格 (Stock Health Check UX Redesign, Native Glassmorphism & ETF Guard Spec)

## Problem Statement

使用者實盤檢驗股票健診功能時指出體驗不佳與視覺破版：
1. **樣式系統失效與佈局碎裂**：
   - 專案未配置 Tailwind CSS，先前程式碼依賴 Tailwind utility classes 導致卡片無背景、邊框消失、文字在深色背景下發黑、按鈕變成瀏覽器原生醜陋邊框。
   - SVG 圖標與右箭頭未約束尺寸，變形為巨大黑箭頭遮擋內容。
2. **ETF / 空數據標的真空問題**：
   - 系統預設載入了持倉首檔之 ETF（如 `00403A`），由於 ETF 非一般營運企業，無三張財報（營收/毛利/CFO），導致所有卡片全顯示「歷史財務數據不足」，極度破壞第一印象。
3. **操作心流不便**：
   - 缺乏直觀的熱門/在庫「標的快捷膠囊 (Stock Pills)」，使用者需在下拉選單翻找或手打代碼。

---

## Solution & Architectural Design

### 1. 全面回歸原生 Glassmorphism 頂級設計系統 (Native Styling)
- **全面移除 Tailwind classes**，全量改採專案原生 Design Tokens (`var(--bg-card)`, `var(--bg-secondary)`, `var(--border-color)`, `var(--text-primary)`, `var(--accent-primary)`, `var(--font-mono)`) 與 Inline Styles。
- **頂部 Banner 升級**：深藍至科技海軍藍漸層背景，右側心跳醫療箱發光圖標，內建「關閉說明/展開」按鈕與 `localStorage` 狀態記憶。
- **四大健診卡片重構 (`HealthCard.tsx`)**：
  - 採用 `.glass-card` 毛玻璃卡片基底，具備深色透明度、內發光與邊框懸停高亮。
  - 左側清晰標題、公司評語與精緻藍色「查看完整健診細節 ➔」按鈕。
  - 右側固定尺寸之圓環評分進度條。
- **圓環進度條重構 (`HealthScoreGauge.tsx`)**：
  - 固定 SVG 尺寸與 ViewBox，底層軌道環與動態彩色進度環（綠/藍/橘/紅），中央文字垂直水平絕對居中，杜絕任何溢出或變形。
- **穿透報告彈窗重構 (`HealthReportModal.tsx`)**：
  - `position: fixed; inset: 0; zIndex: 9999; backdropFilter: blur(12px)` 深色毛玻璃遮罩。
  - 彈窗置中，包含高對比綠色「✔ 通過」、紅色「✖ 沒過」與灰色「– 豁免」膠囊徽章，門檻文字清晰對齊，右下角提供精美關閉按鈕。

---

### 2. ETF 智慧識別防呆橫幅與成分股引導 (ETF Guard & Look-Through)
- 智慧檢測標的是否為 ETF：代碼以 `00` 開頭、含字母後綴如 `00403A`，或知名美股 ETF（`SPY`, `QQQ`, `VOO`, `VT` 等）。
- 若選取 ETF，卡片區域頂部展示醒目琥珀色毛玻璃防呆橫幅：
  - 提示：「⚠️ 本標的為 ETF / 指數型基金，非一般企業個股，企業財報健診幫手不適用於 ETF。」
  - 內建一鍵快捷切換按鈕：「👉 點此切換至熱門企業個股（台積電 2330、聯發科 2454、IBM、AAPL）進行體質健診」。
- 預設標的優先選擇持倉中的**普通股（非 ETF）**，若庫存全為 ETF 則預設熱門個股 `2330`，確保使用者進入工作區即刻見到豐富完整的健診分數。

---

### 3. 熱門與在庫個股快捷膠囊列 (Stock Quick Pills)
- 頂部 Header 下方新增水平滾動快捷膠囊列：
  - 在庫個股優先列出（帶有「持倉」標籤）。
  - 熱門標的膠囊：`2330 台積電`、`2454 聯發科`、`2317 鴻海`、`NVDA 輝達`、`AAPL 蘋果`、`IBM`。
  - 當前選中標的具備科技藍高亮選取態，點擊任一標籤秒級切換診斷。

---

## Acceptance Criteria (驗收標準)

1. **視覺還原與設計品質**：
   - 彻底消滅所有大黑箭頭、透明無邊框與排版擠壓，恢復高質感金融科技深色毛玻璃外觀。
   - 圓環進度條比例與數字居中無錯位。
2. **ETF 友善提示與防呆**：
   - 選取 ETF（如 `00403A`、`0050`、`SPY`）時，顯示琥珀色防呆卡片，引導切換至企業個股。
3. **快捷膠囊流暢切換**：
   - 點擊膠囊即時刷新標的報價、資訊與 4 大健診報告。
4. **全量測試與構建**：
   - 全量單元測試 100% 綠燈，`npm run build` TypeScript 0 錯誤。

---

## Verification Plan

1. 自動化測試回歸：`npm test`
2. 生產打包構建驗證：`npm run build`
3. 瀏覽器驗收：切換不同標的（2330、IBM、00403A），驗證正常個股卡片、ETF 提示、Modal 彈窗及深淺主題。
