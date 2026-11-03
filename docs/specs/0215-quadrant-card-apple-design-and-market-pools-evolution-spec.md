# Spec 0215: 四大象限動能卡片蘋果系統美學重構、全量台股與美股四大市場選池進化規格 (Quadrant Card Apple Design & Full Market Pools Evolution Spec)

## Problem Statement

當前「四大象限動能看板 (Darvas & Bollinger Quadrants)」與市場觀察池面臨兩大核心使用痛點：

1. **照片 1：卡片視覺呈現崩潰與資訊架構混亂**
   - 在多欄並排佈局下，卡片寬度受壓縮至 240px~280px。既有卡片 Header 在同一列硬塞了 7 個橫向元素（股票代碼、一鍵複製按鈕、中文名稱、庫存股數徽章、外部圖表外連按鈕、全方位透視儀按鈕、象限動能狀態徽章），且未設定換行防禦（缺乏 `white-space: nowrap`、未限制寬度、未設 `flex-shrink`）。導致瀏覽器在狹窄空間下強行將中文字元逐字斷行折疊，出現「中/華/電」、「台/積/電」、「庫/存: 100/股」等怪異單字直排現象。
   - 價格、漲跌額、漲跌幅與成交量比平鋪在同一列，字級大小不一且缺乏視覺重心；達瓦斯防守價與緩衝百分比長字串擠壓，導致「防守價:...$147」出現截斷省略號；跌破防守時紅色文字（`🚨 已破防守: 緩衝: -4.1%`）與操作按鈕衝突，缺乏金融終端與 Apple 系統的精緻層次感與呼吸感。

2. **照片 2：觀察池維度單一，缺乏台股全市場與美股核心指數支援**
   - 下拉選單僅提供 3~4 個靜態池，無法滿足實戰投資者對「台灣上市櫃全量全景掃描」以及「美股四大指數體系（標普 500、那斯達克 100、道瓊工業 30、費城半導體 30）」之全方位短線動能篩選需求。
   - 缺乏大批量標的（2,000+ 檔）的智慧分級水合與快取防禦機制，若直接全量聯網容易遭遇 CORS Proxy 逾時與 Yahoo Finance 429 Rate Limit。

---

## Solution

1. **導入蘋果系統美學 (Apple Design System) 重構 `MuscleStockCard`**：
   - **第 1 層：標的辨識列 (Identity Row)**：等寬粗體代碼 (15px) + 中文名稱單行截斷保護 (`text-overflow: ellipsis`) + 庫存微標籤；右側配置精緻動能微膠囊（如 `🔥 箱頂突破`）與右上角極簡微圖標群組（圖表、透視儀），省下 60px 以上橫向空間，100% 根治折字直排。
   - **第 2 層：量價焦點看板 (Hero Price & Momentum)**：現價 18px Bold 等寬數字，搭配 Apple Stocks 風格的漲跌幅圓角雙態微透明膠囊，並以灰階晶片標示量比。
   - **第 3 層：達瓦斯防守儀表條 (Darvas Defense Metric & Buffer Gauge)**：左側顯示完整防守價（無省略號）、右側顯示緩衝百分比，下方加入 3px 高度微光動態防守安全條（綠色安全、黃色臨界、紅色破防），並於下方顯示風益比 R 倍數。
   - **第 4 層：抽屜式詳細技術指標 (Collapsible Details Drawer)**：展開時呈現箱體範圍、MA20 扣抵望遠鏡趨勢、布林帶寬與 OBV 動能流向。

2. **擴充全量台股與美股四大市場權威種子庫與分類選單**：
   - 擴展 `AssetPoolType`：新增 `TW_ALL`（台股全量 ~2,285 檔，復用 `STATIC_TW_STOCKS`）、`US_SP500`（標普 500）、`US_NASDAQ100`（那斯達克 100）、`US_DOW30`（道瓊工業 30）、`US_SOX30`（費城半導體 30）、`MID100_MOMENTUM`（中型 100）。
   - 下拉選單改為語意清晰的 `<optgroup>` 結構（🇹🇼 台灣市場、🇺🇸 美股四大市場、💼 我的投資組合）。
   - 建立「**快取優先 (Cache-First) + 超大池模擬種子 K 線即時上榜 + 受控後台節流增量水合**」架構，確保切換至 2,000+ 標的時 0 延遲瞬間呈現，零卡頓、零白屏、抗 429 限流。

---

## User Stories

1. As a 波段實戰交易員, I want 卡片上的股票名稱、代碼與徽章始終保持優雅水平單行排列, so that 我在狹窄的多欄看板中能清晰閱讀標的資訊，不再被怪異的中文字元直排干擾。
2. As a 活躍投資者, I want 卡片具備明確的價格與漲跌幅視覺焦點, so that 我能一眼秒級判斷股票當前漲跌行情與量價強弱。
3. As a 紀律交易員, I want 卡片顯示明確的達瓦斯箱體防守價與剩餘緩衝空間, so that 我不需要心算就能知道股價離停損點還有多少距離。
4. As a 視覺導向使用者, I want 卡片具備一條動態防守安全條 (3px Buffer Bar), so that 我透過顏色（綠/黃/紅）就能一眼辨識哪些標的安全、哪些處於臨界、哪些已實質破防。
5. As a 波段操盤手, I want 能在右上角透過精簡圖標快速跳轉 Yahoo/TradingView 即時圖表或開啟全方位指標透視儀, so that 我能在不佔用卡片主要閱讀空間的前提下順暢切換工具。
6. As a 股市小白, I want 在防守價與風益比標籤上看到股市小白指南 Tooltip, so that 我能學習「防守價」與「R 倍數」的實戰意義。
7. As a 深度技術分析者, I want 點擊卡片展開技術抽屜時能看到 MA20 扣抵望遠鏡、布林帶寬與 OBV 資金動能, so that 我能進一步確認突破真偽與未來均線引力。
8. As a 台股全市場投資人, I want 在市場選單中選擇「🇹🇼 台灣上市櫃全量 (~2,280+ 檔)」, so that 我能全景掃描全台灣所有股票與 ETF 的達瓦斯箱體突破標的。
9. As a 美股全球科技股投資人, I want 在市場選單中選擇「🇺🇸 費城半導體 30 (SOX 30)」與「🇺🇸 那斯達克 100 (NASDAQ 100)」, so that 我能專注追蹤全球晶片半導體與科技巨頭的短線動能。
10. As a 價值與大型股投資人, I want 在市場選單中選擇「🇺🇸 標普 500 (S&P 500)」與「🇺🇸 道瓊工業 30 (Dow Jones 30)」, so that 我能掌握美國傳統藍籌與大盤權值巨頭的動態。
11. As a 系統使用者, I want 在切換至台股全量或標普 500 等大型觀察池時介面毫秒級即時上榜, so that 我不需要等待數分鐘的網路全量抓取，體驗極致流暢且零白屏。
12. As a 前端使用者, I want 系統在背景以受控並發與節流方式更新大型池的日 K 數據, so that 瀏覽器不會因為巨量並發網路請求而崩潰或被遠端 API 429 封鎖。
13. As a 投資組合管理者, I want 在市場選單中清晰看到分組的 `<optgroup>`（台灣市場、美股四大市場、我的投資組合）, so that 我能直覺且快速地切換不同市場維度。
14. As a 庫存持股者, I want 如果掃描出的標的是在庫持股，能在卡片上看到小巧精緻的庫存微膠囊, so that 我能優先關注自己手中持股的突破或破防狀態。

---

## Implementation Decisions

1. **卡片層次結構與樣式規範 (MuscleStockCard)**
   - 容器採用毛玻璃背景 (`rgba(15, 23, 42, 0.72)` + `backdrop-filter: blur(16px)`)，邊框使用細微的透明白光 (`1px solid rgba(255, 255, 255, 0.08)`)，破防時動態切換為警示紅光邊框。
   - Header 採用 `min-width: 0`，左側標的區以 `flex: 1 1 auto` 搭配名稱 `text-overflow: ellipsis; white-space: nowrap; max-width: 92px`，右側操作區圖標以 `flex-shrink: 0` 保持單行排列。
   - 操作按鈕從文字（「圖表」、「透視」）收攏為 13px 微圖標（`BarChart2`、`Sliders`），帶圓角與 Hover 微光。
   - 價格 row 採用等寬數字，漲跌幅以半透明背景微膠囊（Pill）呈現，量比以輕量晶片顯示。
   - 達瓦斯防守儀表條包含完整數值防守價、緩衝百分比、以及 3px 高度進度條（以 8% 緩衝為 100% 滿格，綠/黃/紅三色漸層動態計算）。
   - 抽屜展開區展示箱體上下緣、MA20 扣抵望遠鏡預測、布林帶寬值與 OBV 動能流向。

2. **市場池擴展與資料庫種子架構 (usIndicesComponents & muscleBookerEngine)**
   - 擴充 `AssetPoolType` 聯合型別：
     ```ts
     export type AssetPoolType =
       | 'HOLDINGS'
       | 'HOLDINGS_ACTIVE'
       | 'HOLDINGS_CLOSED'
       | 'TOP30_FOCUS'
       | 'TW_ALL'
       | 'TW50_CORE'
       | 'MID100_MOMENTUM'
       | 'TW_TOP_30_FOCUS'
       | 'US_SP500'
       | 'US_NASDAQ100'
       | 'US_DOW30'
       | 'US_SOX30'
       | 'US_MEGA_50_CORE'
       | 'CUSTOM_WATCHLIST';
     ```
   - 建立模組化指數成分庫 `src/data/usIndicesComponents.ts`：
     - `US_DOW_30_SYMBOLS`：30 檔道瓊工業藍籌龍頭。
     - `US_SOX_30_SYMBOLS`：30 檔費城半導體晶片供應鏈。
     - `US_NASDAQ_100_SYMBOLS`：100 檔那斯達克科技與新經濟成分股。
     - `US_SP_500_SYMBOLS`：500+ 檔標普大型全產業權值標的（映射自本地 `STATIC_US_STOCKS`）。
     - `TW_ALL_SYMBOLS`：2,285+ 檔台股全市場上市櫃與合法 ETF（映射自本地 `STATIC_TW_STOCKS`）。
     - `TW_MID_100_SYMBOLS`：100 檔台灣中型動能代表股。
   - 擴充 `getScopedUniverseSymbols`，完整支援所有新市場池的讀取與 Storage 快取回退。

3. **大池效能與防禦性載入機制 (useMuscleBookerSync)**
   - 當標的數量大於 150 檔（如台股全量或美股大盤）時，未命中 IndexedDB 本地快取的標的，優先透過 `generateSyntheticCandles` 以種子基礎價格生成模擬 K 線，確保毫秒級瞬間排定四大象限，零白屏、零卡頓。
   - 背景以 `processSyncBatch`（Concurrency = 3，節流 60ms）逐步增量水合，Header 呈現受控進度條，切換觀察池時透過 `isCancelled` 立即中斷舊任務，杜絕浪費請求與 429 限流。

4. **選單分組結構 (MuscleBookerHeader)**
   - 使用語意化 `<optgroup>` 分組：
     - `🇹🇼 台灣市場 (Taiwan Markets)`：全量 (~2,280+)、TW50、Mid100、Top 30。
     - `🇺🇸 美股四大市場 (US Markets & Indices)`：S&P 500、NASDAQ 100、Dow 30、SOX 30、Mega 50。
     - `💼 我的投資組合 (Portfolio)`：在庫有效持股、自訂觀察名單、在庫全部標的、歷史已平倉。

---

## Testing Decisions

1. **測試標準與原則**
   - 遵循測試驅動開發 (TDD) 與公開行為測試（Black-box Behavior Testing），不刺探內部私有變數，專注測試 DOM 輸出結構與數值正確性。
   - 採用專案標準的 `renderToStaticMarkup` from `react-dom/server` 進行 SSR 靜態 HTML 斷言。

2. **模組測試覆蓋**
   - `usIndicesComponents.test.ts`：驗證美股四大市場（Dow 30、SOX 30、NASDAQ 100、S&P 500）與台股全量、中型 100 的檔數、欄位完整性與關鍵龍頭代碼。
   - `MuscleStockCard.test.tsx`：驗證股票代碼、中文名稱、價格膠囊、防守價、緩衝百分比、持股微標籤、操作圖標按鈕、破防警告與抽屜展開技術細節之正確呈現。
   - `muscleBookerEngine.test.ts`：驗證 `getScopedUniverseSymbols` 在各大市場池下的標的過濾與回傳行為。
   - `MuscleBookerWorkspace.test.ts`：驗證工作區整合與自適應水合。

3. **品質閘門**
   - 本地 `npm test` 100% 通過（全案 61+ 測試全綠燈）。
   - 本地 `npm run build` 0 TypeScript 編譯錯誤與 0 未使用變數警告。

---

## Out of Scope

1. **後端資料庫或外部即時 WebSocket 直連**：本規格專注於純前端 IndexedDB 湖倉快取與公開 CORS Proxy API 增量水合，不架設私有後端服務。
2. **美股盤中毫秒級逐筆 Tick 串流**：維持日 K 線與盤後/延遲價格掃描機制。
3. **自訂選股公式編輯器**：四大象限動能邏輯遵循筋肉書僮箱體與布林收縮量化規則，不開放用戶任意自訂指標公式。

---

## Further Notes

- 本規格對應 GitHub Issue `#395`，標籤為 `enhancement,ready-for-agent`。
- 本次升級在保留 100% 筋肉書僮短線動能策略精髓的前提下，極致昇華了卡片視覺語言，徹底告別傳統金融軟體的簡陋與擁擠，對齊 Apple 原生現代美學。

