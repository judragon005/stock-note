# Ticket 04: 個股全技術指標透視面板 (Omni-Technical Inspector Modal UI)

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0121-omni-technical-indicator-analysis-system-spec.md` (模組三)
- 關聯 Issue: #37
- 標籤: `enhancement,ready-for-agent`

## 任務目標
打造質感極佳的現代毛玻璃風格 (Glassmorphism) 全指標透視彈窗 `src/components/OmniTechnicalInspectorModal.tsx`，具備代碼搜尋、多空共振指針、5 大指標矩陣折疊卡片、全域漲跌顏色同步與一鍵複製 Markdown 研報功能。

## 具體修改清單
1. **`src/components/OmniTechnicalInspectorModal.tsx`**：
   - 頂部：標的搜尋輸入框（支援台/美股切換）、現價與漲跌幅、多空共振儀 (0~100 分) 與等級膠囊。
   - 核心區：五大維度卡片展示
     - 趨勢矩陣（MA 均線排列、MACD 柱狀體、DMI/ADX 強度）。
     - 動能擺盪（RSI 狀態、KD 交叉、CCI、Williams %R）。
     - 波動通道（布林帶寬與壓縮警示、ATR 移動防守價、乖離率）。
     - 量能資金（5日/20日均量比、爆量/窒息警示、OBV 趨勢、投量比）。
     - 關鍵支撐壓力（Darvas 箱體、Fibonacci 支撐位、Pivot 樞紐點）。
   - 底部操作列：
     - 「📋 一鍵複製診斷報告 Markdown」按鈕。
     - 「關閉」按鈕。
   - 樣式：完美繼承全域 CSS 變數 (`--profit-color`, `--loss-color`, `--bg-card` 等)，支援紅漲綠跌與綠漲紅跌。
2. **單元/整合測試 (`src/components/OmniTechnicalInspectorModal.test.ts`)**：
   - 驗證開啟 Modal、載入資料骨架、渲染五大矩陣卡片之正確性。
   - 驗證點擊複製按鈕能觸發剪貼簿 API。

## 驗收標準
- [ ] 元件渲染正常，無 layout shift 或溢出。
- [ ] 支援主題模式即時響應。
