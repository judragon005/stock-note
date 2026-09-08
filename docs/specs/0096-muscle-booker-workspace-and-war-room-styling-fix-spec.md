# PRD 0096: 宏觀戰情室原生樣式修復、色彩模式連動與肌肉書僮動能雷達專屬工作區規格書

## 1. 執行摘要 (Executive Summary)
針對使用者回饋之畫面樣式崩塌（Tailwind 類別未編譯導致無樣式）、持倉膠囊未連動紅漲綠跌主題、以及缺乏肌肉書僮實戰掃描視圖等三大痛點，本規格書制定全套修復與功能演進計畫：
1. **宏觀戰情室 Vanilla CSS 樣式重塑**：徹底移除無效的 Tailwind 類別，全面採用專案原生設計系統（CSS 變數、`.card`、`.badge`、深色毛玻璃金融終端排版），還原現代專業質感。
2. **持倉訊號膠囊色彩模式連動**：重構 `getSignalCapsuleStyle`，以 `var(--gain-color)`、`var(--loss-color)` 取代寫死 Hex 色碼，100% 同步「紅漲綠跌 / 綠漲紅跌」主題切換。
3. **貫通肌肉書僮底層計算鏈**：在 `computeTechnicalIndicators` 串聯 `muscleBookerEngine`，確保持倉標的自動產生箱子突破與扣抵信號。
4. **獨立新增「💪 肌肉書僮·動能雷達」工作區 (`MuscleBookerWorkspace.tsx`)**：
   - 提供「在倉持股 / 法人焦點 Top 30 / 台股權值 Top 50」三軌資產池切換。
   - 視覺化四象限動能看板：【箱頂突破區】、【底穿反轉區】、【布林極致壓縮區】、【跌破箱底警戒區】。
   - 均線扣抵望遠鏡：展示未來 3~5 天月線/季線扣低翻揚的潛力標的。

---

## 2. 邊界條件與技術約束 (Constraints)
1. **零 Tailwind 相依性**：專案為純 Vanilla CSS + React，所有元件樣式必須使用專案已有之 CSS 類別與 CSS 變數，嚴禁引入未安裝之 CSS 框架。
2. **單一色彩事實來源 (SSOT)**：所有看多/看空或漲跌色彩一律引用 `--gain-color`、`--loss-color`、`--gain-bg`、`--loss-bg`。
3. **API 配額守護**：前 30 焦點與在倉標的優先複用本地快取，防止觸發外部請求熔斷。

---

## 3. 功能規格詳細定義 (Detailed Specifications)

### 3.1 宏觀戰情室原生樣式重構 (`WarRoomWorkspace.tsx`)
- 結構改為 CSS Grid 與 Flexbox 佈局，套用 `.card` 與局部 class。
- 頂部 AI 晨報橫幅改為帶有深藍毛玻璃漸層的質感卡片。
- 四柱脈搏卡片採用 4 欄格線排版（`grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`）。
- 排行榜與事件日曆擁有清晰的邊框、內距與對齊。

### 3.2 膠囊色彩變數化 (`HoldingSignalCapsules.tsx`)
- `BULLISH`：`color: 'var(--gain-color)'`, `background: 'var(--gain-bg)'`, `border: '1px solid var(--gain-border)'`。
- `BEARISH`：`color: 'var(--loss-color)'`, `background: 'var(--loss-bg)'`, `border: '1px solid var(--loss-border)'`。
- `WARNING`：`color: 'var(--accent-amber)'`, `background: 'rgba(245, 158, 11, 0.12)'`, `border: '1px solid rgba(245, 158, 11, 0.3)'`。

### 3.3 指標計算鏈整合 (`technicalIndicatorEngine.ts`)
- 在 `computeTechnicalIndicators` 中，當日 K 線數量充足時（$\ge 3$ 天），呼叫 `calculateMuscleIndicators(candles)` 獲取 `boxStatus`、`isBottomPenetration`、`ma20DeductionSlope`、`isBollingerSqueeze` 並填入回傳物件。

### 3.4 肌肉書僮動能雷達工作區 (`MuscleBookerWorkspace.tsx`)
- 於 `WorkspaceTabs` 註冊 `musclebooker`（「💪 肌肉書僮」·「短線聖經」）。
- 支援資產池選擇：
  - `HOLDINGS`：我的在倉持股（即時防守與扣抵診斷）。
  - `TOP30_FOCUS`：市場法人焦點 Top 30（**預設**，共用現有籌碼池數據，捕捉主力抬轎突破）。
  - `TW50_CORE`：台股核心權值 Top 50（穩健型波段雷達）。
- 儀表板四大專題卡片：
  - 🔥 **【箱頂突破區】**：現價突破過去 3 日箱頂高點，帶量攻擊。
  - 🚀 **【底穿上反轉】**：主力誘空假跌破，下影線強勢拉回。
  - ⚡ **【布林極致收縮】**：帶寬 $< 8\%$，蓄勢即將變盤。
  - 📈 **【扣抵翻揚先鋒】**：月線即將扣抵低檔，均線翻揚助漲。

---

## 4. 驗收標準 (Acceptance Criteria)
1. 戰情室頁面具有頂級現代毛玻璃深色質感，排版整齊，完全無樣式崩壞。
2. 切換頂部「紅漲綠跌 / 綠漲紅跌」按鈕時，持倉訊號膠囊即時動態連動切換顏色。
3. 符合條件之持股正確顯示「箱頂突破」或「底穿上反轉」膠囊。
4. 點擊「💪 肌肉書僮」工作區頁籤，可流暢查看各標的之箱子位階與波段訊號。
5. 全量單元測試 100% 通過，`npm run build` 0 錯誤。
