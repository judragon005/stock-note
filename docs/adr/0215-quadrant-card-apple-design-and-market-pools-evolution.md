# ADR 0215: 四大象限動能看板卡片蘋果美學重構與全市場/美股四大指數擴充架構決策 (Quadrant Card Apple Design & Full Market Pools Evolution)

## 狀態 (Status)
已採納 (Accepted)

## 背景 (Context)
在肌肉書僮「四大象限動能看板 (Darvas & Bollinger Quadrants)」實戰中，使用者面臨兩大核心痛點：
1. **卡片排版破碎與直排折字**：多欄並排佈局下，卡片寬度受壓縮至 240px~280px。原本卡片頂部 Header 橫向硬塞了 7 個元素，未設換行防禦與截斷保護，導致中文字元被強行單字直排（如「中/華/電」），資訊階層平鋪雜亂，防守價出現截斷省略號，缺乏金融終端與 Apple 系統的精緻美感。
2. **觀察池維度窄化**：僅有少數靜態池，缺乏台股上市櫃全量（~2,285 檔）與美股四大指數體系（標普 500、那斯達克 100、道瓊工業 30、費城半導體 30）的短線動能篩選支援。若前端對 2,000+ 標的一口氣聯網抓取，將面臨 Yahoo Finance 429 限流與瀏覽器記憶體膨脹。

## 決策 (Decision)

### 1. 蘋果系統美學三層式卡片重構 (`MuscleStockCard`)
- **標的列 (Identity Row)**：等寬粗體代碼 (15px) + 中文名稱單行截斷保護 (`text-overflow: ellipsis`) + 庫存微膠囊；右側配置動能狀態微膠囊（如 `🔥 箱頂突破`）與右上角微圖標群組（圖表外連 `BarChart2`、指標透視儀 `Sliders`），徹底節省橫向空間，100% 免疫折字直排。
- **量價焦點層 (Hero Price & Momentum)**：現價 18px Bold 等寬數字，搭配 Apple Stocks 風格的漲跌幅雙態圓角微透明膠囊，並以低對比晶片標示量比。
- **達瓦斯防守儀表條 (Darvas Defense Metric & Buffer Gauge)**：左側顯示完整防守價（無省略號）、右側顯示緩衝百分比，下方加入 3px 高度動態微光防守安全條（綠色安全 >5%、黃色臨界 1.5%~5%、紅色跌破 <0%），並以簡潔晶片呈現風益比 R 倍數。
- **抽屜式展開技術面板 (Collapsible Details Drawer)**：保留並收攏箱體上下緣、MA20 扣抵望遠鏡預測、布林帶寬與 OBV 動能走向。

### 2. 美股四大市場與台股全量成分庫實體化 (`usIndicesComponents`)
- 模組化建立 `src/data/usIndicesComponents.ts`，納入：
  - `US_DOW_30_SYMBOLS` (道瓊 30 檔經典藍籌)
  - `US_SOX_30_SYMBOLS` (費城半導體 30 檔晶片供應鏈)
  - `US_NASDAQ_100_SYMBOLS` (那斯達克 100 檔科技旗艦)
  - `US_SP_500_SYMBOLS` (標普 500+ 檔全產業權值核心)
  - `TW_ALL_SYMBOLS` (台股 2,285+ 檔上市櫃與 ETF 全量庫)
  - `TW_MID_100_SYMBOLS` (台灣中型 100 動能代表股)
- 擴充 `AssetPoolType` 與 `getScopedUniverseSymbols`，無縫相容動態 Storage 快取。

### 3. 大池載入效能防禦：快取優先 + 模擬日 K 即時上榜 + 受控後台水合 (`useMuscleBookerSync`)
- 針對超過 150 檔的大型觀察池，未命中本地快取時，先依據種子收盤價由 `generateSyntheticCandles` 瞬間合成模擬日 K，保障四大象限看板毫秒級 0 延遲排定，杜絕白屏與卡頓。
- 背景啟動受控並發（Concurrency = 3，節流 60ms）逐步增量水合，避免觸發 429 限流；切換觀察池時透過 `isCancelled` 立即取消過時排程。

### 4. 選單 UI 語意分組 (`MuscleBookerHeader`)
- 使用 `<optgroup>` 劃分「🇹🇼 台灣市場」、「🇺🇸 美股四大市場」與「💼 我的投資組合」，讓投資人快速切換。

## 後果 (Consequences)

### 正面影響 (Positive)
- **視覺體驗昇華**：徹底解決字元直排與排版崩潰，達成專業金融終端與 Apple 原生質感的完美融合。
- **功能維度跨越式提升**：從少數個股擴充至全台股 2,285+ 檔與美股全板塊四大指數。
- **極致效能與防禦性**：超大池秒開，抗網路抖動與 API 限流，代碼高內聚低耦合。

### 負面影響 / 緩解策略 (Mitigations)
- **初始快取冷啟動**：在首次切換至全量池時，部分標的可能處於種子模擬 K 線狀態。
  - **緩解**：透過 Header 狀態列清晰標註增量同步進度，水合完畢自動無縫無感切換至真實 K 線。

