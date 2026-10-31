# Spec 0213: 宏觀戰情室雙溫度計排版修復、持股戰術訊號狀態膠囊與雙重動能真實數據審計升級規格 (Macro War Room Thermometer Alignment, Tactical Signals Segmented Pills, and Dual Momentum Data Audit Spec)

## 1. 概述 (Overview)

本規格針對「宏觀戰情室 (`WarRoomWorkspace`)」及其核心子模組（`MacroDualThermometerBar`、`HoldingTacticalSignalsCard`、`dualMomentumEngine`）進行全面體質強化與排版/交互/數據鏈路修復。
遵循 **KISS 原則（Keep It Simple, Stupid）** 與 **防禦性開發（Defensive Development）**，徹底根除畫面文字折行擠壓、按鍵動作無反饋、雙重動能冷啟動幽靈數據等實戰痛點，並補齊機構法人與波段操盤手所需的數據審計水位線與跨模組聯動。

---

## 2. 核心痛點與根本病因分析 (Root Cause Analysis)

### 2.1 雙溫度計分數折行與資訊層次割裂
* **現象**：短中期波段溫度計數值 `25 / 100` 碎裂折行成 `25 /` 與 `100`，且長徽章 `⚠️ 拉積盤警訊（賺指數賠價差）` 搶佔標題列空間。
* **病因**：`MacroDualThermometerBar.tsx` 頂部 Flex Row 寬度不足，分數缺少 `white-space: nowrap` 與等寬數字設定，次行右側大量留白，左右雙軌高度與資訊結構嚴重不對稱。

### 2.2 持股波段雷達折疊按鈕無效跳動
* **現象**：在倉持股均為正常股（如僅 1 檔）時，點擊按鈕僅文字在「收合」與「展開」間跳動，下方表格內容紋絲不動。
* **病因**：`HoldingTacticalSignalsCard.tsx` 中 `displayedSignals` 內寫入不對稱的 fallback `normalSignals.slice(0, 5)`，導致在異常股為 0 時，展開與收合輸出的陣列完全相同，引發狀態機假死感。

### 2.3 雙重動能跨資產輪動被質疑「假資料」
* **現象**：冷啟動或本地 SQLite 湖倉缺乏美股日 K 時，排行榜全部顯示 `-999.0%` 或 `0.0%`，缺乏時間基準日與樣本數，造成黑箱假資料信任危機；且高股息標的因除息缺口遭到動能模型扣分懲罰。
* **病因**：`dualMomentumEngine.ts` 在 `candles.length === 0` 時回傳 `-999`，UI 直接赤裸渲染；且缺乏數據基準日與湖倉來源審計標章。

---

## 3. 詳細技術規格 (Technical Specifications)

### 3.1 雙溫度計對稱佈局與防折行重構 (`MacroDualThermometerBar.tsx`)
1. **數值隔離保護**：
   - 第一行右側**僅保留**核心分數 `{tacticalSwing.score} / 100`。
   - 套用樣式：`whiteSpace: 'nowrap'`, `flexShrink: 0`, `fontVariantNumeric: 'tabular-nums'`，字級維持 `1.15rem` 粗體。
2. **對稱下移警訊**：
   - 將 `⚠️ 拉積盤警訊（賺指數賠價差）` 徽章移至**第二行右側**，與左軌的「建議總股票上限 ≤ X%」徽章水平對齊。
   - 保持左右雙軌高度一致，徹底消除任何折行破圖。

### 3.2 持股戰術訊號分頁膠囊切換與正向安全反饋 (`HoldingTacticalSignalsCard.tsx`)
1. **狀態機純函數化**：
   - 廢除脆弱的 `showNormalHoldings` 布林值，改為分頁過濾狀態：`activeFilter: 'ACTIONABLE' | 'ALL'`（預設為 `ACTIONABLE`）。
   - 當 `activeFilter === 'ALL'` 時展示全部持股；當 `activeFilter === 'ACTIONABLE'` 時僅展示需行動持股。
2. **分頁膠囊按鈕 (Segmented Tab Pills)**：
   - `[ 🚨 需行動 (X) ]` 與 `[ 📑 全部在倉 (Y) ]`。
   - 點擊時即時切換高亮樣式，提供直觀反饋。
3. **高信任度空狀態安全盾 (All-Clear Card)**：
   - 當 `activeFilter === 'ACTIONABLE'` 且 `actionableSignals.length === 0` 時，不偷渡展示正常股，而是渲染綠色正向安全卡片：
     `🛡️ 當前在倉持股全數處於正常箱型結構或安全防守水位，無須緊急減碼或調倉。`

### 3.3 雙重動能真實數據透明化與冷啟動降級 (`WarRoomWorkspace.tsx` & `dualMomentumEngine.ts`)
1. **數據審計標章 (Audit Watermark)**：
   - 在雙重動能卡片 Header 增加綠色審計膠囊：
     `🟢 SQLite 湖倉真實日 K 驅動 · 基準日: YYYY-MM-DD`。
2. **優雅降級與骨架屏**：
   - 當標的日 K 不足 5 根時，分數與報酬率不顯示 `-999.0%`，改為顯示 `⏳ 水合中` 或骨架屏標籤。
3. **除息還原總報酬校準 (Total Return Correction)**：
   - 在計算高股息 ETF（如 0056, 00878, 00713）之 3M 報酬率時，若近 3 個月內有已發放股息，將除息金額還原至價格分子中，杜絕高息標的被動能模型誤判淘汰。

### 3.4 宏觀全景輕量補強 (Lightweight 全景進化)
1. **個人防護盾雙冷連動**：
   - 當長線總經分 < 45 且 短線波段分 < 30 時，防護盾卡片自動提示「雙指標共振偏弱，請優先守護質押維持率 ≥ 166%」。
2. **持股月線乖離率揭露**：
   - 在持股列表中標註標的月線乖離率，> 6% 時以黃色標記過熱，與戰術溫度計形成呼應。

---

## 4. 驗收標準 (Acceptance Criteria)

1. **AC-1 (視覺排版零錯行)**：在 320px 至 1920px 各解析度下，雙溫度計數值嚴格維持單行，左右軌高度對齊。
2. **AC-2 (狀態切換零假死)**：持股訊號表點擊膠囊切換，100% 產生清晰的清單變更或綠色安全卡片反饋。
3. **AC-3 (動能審計透明可信)**：雙重動能排行榜標明數據來源與日期，冷啟動時不出現 -999% 破圖。
4. **AC-4 (代碼與測試品質)**：全站既有 53+ 測試套件 100% 通過，`npm test` 0 失敗，`npm run build` 0 警告錯誤。

---

## 5. 影響檔案清單 (File Impact Analysis)

* `src/components/warRoom/MacroDualThermometerBar.tsx` (溫度計排版與數值防折行)
* `src/components/warRoom/HoldingTacticalSignalsCard.tsx` (分頁膠囊切換與正向安全卡片)
* `src/components/WarRoomWorkspace.tsx` (雙重動能審計標章、降級處理與全景聯動)
* `src/engine/dualMomentumEngine.ts` (除息還原計算與冷啟動標記優化)
* 單元測試檔案相應覆蓋更新

