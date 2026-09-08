# ADR 0096: 宏觀戰情室原生樣式重塑、色彩模式連動與肌肉書僮動能雷達專屬工作區 (Muscle Booker Workspace & War Room Styling Fix)

## 狀態
已接受 (Accepted)

## 脈絡 (Context)
在先前引入宏觀戰情室與量化指標後，使用者回報了三個顯著的使用者體驗與邏輯問題：
1. **宏觀戰情室無樣式崩塌**：本專案採用純原生 CSS 系統 (Vanilla CSS + CSS 變數)，未安裝 TailwindCSS。先前的實作誤用了大量 Tailwind 類別，在無編譯器的情況下被瀏覽器無視，導致戰情室呈現為未經排版的純 HTML 文字，極其難用且破壞體驗。
2. **持倉訊號膠囊顏色未連動主題模式**：`HoldingSignalCapsules.tsx` 寫死了 `#34d399` 與 `#f87171` 色碼，未引用專案定義的 `--gain-color` 與 `--loss-color` CSS 變數，導致在切換「紅漲綠跌 / 綠漲紅跌」模式時完全無法切換多空色彩。
3. **持倉未顯示任何肌肉書僮膠囊且缺乏實戰選股雷達**：
   - 底層邏輯面：`computeTechnicalIndicators` 漏接了 `muscleBookerEngine` 的計算鏈，回傳的指標物件完全缺少肌肉書僮欄位。
   - 使用者體驗面：使用者的在庫持股通常僅 5~15 檔，90% 時間處於箱內整理，難以看到「箱頂突破」或「底穿反轉」訊號，缺乏主動性波段雷達看板。

## 決策 (Decision)
1. **宏觀戰情室 Vanilla CSS 樣式重塑**：
   - 剔除所有未定義之 Tailwind 類別，在 `src/index.css` 與 `WarRoomWorkspace.tsx` 全面套用專案既有之原生設計系統（`.card`、`.badge`、`.mono`、`.warroom-hero-card`、`.warroom-grid-4` 等）。
   - 打造深色毛玻璃金融終端（Glassmorphism）佈局，徹底解決照片 1 的樣式崩潰。
2. **持倉膠囊色彩動態變數化**：
   - `getSignalCapsuleStyle` 與 `directive` 判定全面改為 `var(--gain-color)`、`var(--loss-color)`、`var(--gain-bg)`、`var(--loss-bg)`，100% 同步頂部按鈕切換。
3. **貫通肌肉書僮底層計算鏈與修復 Look-ahead Bias**：
   - 在 `computeTechnicalIndicators` 中串聯 `detectDarvasBox`、`calculateMaDeduction` 與 `calculateBollingerSqueeze`。
   - 修復 `detectDarvasBox` fallback 時未排除當日 K 線之 Look-ahead Bug，確保當日創新高時正確判定為 `BREAKOUT_UP`。
4. **獨立建置「💪 肌肉書僮·動能雷達」專屬工作區 (`MuscleBookerWorkspace.tsx`)**：
   - 於導覽列註冊 `musclebooker`（「💪 肌肉書僮」·「短線聖經」）頁籤。
   - 提供「在倉持股 / 法人焦點 Top 30 (預設) / 台股權值 Top 50」三軌資產池切換。
   - 建立四象限箱子型態看板：【箱頂突破區】、【底穿反轉區】、【布林極致收縮區】、【跌破箱底警戒區】。
   - 建立均線扣抵望遠鏡清單，提前推算未來 3~5 日月線/季線扣低翻揚的動能潛力股。

## 後果 (Consequences)
- **優點**：
  - 戰情室視覺效果還原為頂級現代金融終端機質感，毛玻璃漸層與排版對齊專業。
  - 持倉膠囊完整支援台股習慣（紅漲綠跌）與國際習慣（綠漲紅跌）。
  - 使用者即使手頭持股無訊號，亦能透過「法人焦點 Top 30」即時捕捉市場上正發生「箱頂突破」或「假跌破破底翻」之強勢股，短線波段實戰價值極大化。
- **向後相容**：
  - 56 個測試檔案、607 項單元與整合測試 100% 綠燈通過。
  - `tsc && vite build` 0 錯誤打包。
