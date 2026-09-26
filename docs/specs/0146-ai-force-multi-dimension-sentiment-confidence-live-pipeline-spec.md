# 規格 0146：AI 主力儀表板「03 多維度判讀」、「13 市場情緒」與「14 AI 信心度」全量化真實資料管線動態整合規格 (Spec 0146)

## Problem Statement

目前在「AI 主力行為判讀與全功能量化決策儀表板」中，當使用者於頂部輸入框切換不同股票（如 2330 台積電、2317 鴻海、2360 致茂或 NVDA 輝達）進行分析時：
1. **「03 多維度判讀」卡片完全無動作**：畫面上永遠卡在靜態預設值（綜合評分 56 / 100、C 級、6 軸雷達固定為 法人 50、趨勢 65、籌碼 55、流動 45、波動 60、動能 58）。經深入檢查，根本原因為 `generateAiForceReportFromCandles()` 僅解構了預設模板 `...defaultTemplate`，完全遺漏了 `multiDimensionRadar` 的動態計算與屬性覆蓋。
2. **「13 台股市場情緒」與「14 AI 信心度」未動態連動**：`marketSentimentEngine.ts` 雖已建立獨立模組，卻未在主報表合成管線中被呼叫；`aiConfidence` 亦缺乏基於歷史 K 線樣本長度與訊號穩定度的量化引擎，導致換股時數值靜態固化，損及量化決策系統的公信力與實用性。

---

## Solution (方案 B：獨立量化模組 + 完整 TDD)

遵循 KISS 原則與單一職責原則 (SRP)，建立獨立量化引擎與純函式架構，並完全對齊 `AiForceDashboardReport` 既有契約：

### 1. 建立「多維度判讀量化引擎」(`src/engine/multiDimensionRadarEngine.ts`)

依據真實歷史日 K (`candles`)、技術指標 (`klineCandles`) 與三大法人記錄 (`institutionalFlow`)，動態計算 6 大軸向分數 (0~100)：

- **法人 (`institutional`)**：
  - 依近 20 日三大法人累計買賣超與方向判斷。
  - 法人累計買超 > 2000 張或土洋合買給予 80~95 分；對作或持平給 50~60 分；累計賣超 < -2000 張或土洋齊賣給予 15~35 分。美股無法人時依大戶量能或成交均量動態映射基準分 55 分。
- **趨勢 (`trend`)**：
  - 依多均線排列度 (MA5 > MA10 > MA20 > MA60) 與收盤價相對 20 日 VWAP 主力成本之乖離率 (`vwapBias`)。
  - 四線多頭排列且價格站上主力成本給予 85~95 分；站上月線給予 70~80 分；跌破季線與主力成本給予 25~45 分。
- **籌碼 (`chips`)**：
  - 依近 5 日三大法人買賣超合計張數與主力集中度。
  - 近 5 日主力急買集中給予 75~90 分；籌碼渙散大賣給予 25~45 分。
- **流動性 (`liquidity`)**：
  - 依近 5 日與 20 日日均成交量（張數 / Volume）。
  - 日均量 > 3,000 張（或美股高流動性標的）給予 85~95 分；1,000~3,000 張給予 70~80 分；< 300 張給予 20~40 分。
- **波動 (`volatility`)**：
  - 依近 20 日歷史真實波幅 (ATR) 或標準差。
  - 波動維持於 1.5%~3.5% 之健康區間給予 75~85 分；波動劇烈失控 (>6%) 或死水無流動性依風控折算得分。
- **動能 (`momentum`)**：
  - 依 KD(9,3,3) 黃金交叉、RSI(14) 數值與最新日量能相對 20 日均量倍數 (`volume / avgVol20`)。
  - RSI 在 55~70 區間且帶量上攻給予 80~95 分；超賣鈍化或無量陰跌給予 20~40 分。
- **綜合評分與評級 (`overallScore`, `overallGrade`)**：
  - 6 軸等權平均後以四捨五入取整：`overallScore = Math.round(sum / 6)`。
  - 等級判定：`>= 80: 'A'`、`>= 65: 'B'`、`>= 50: 'C'`、`< 50: 'D'`。

### 2. 建立「AI 信心度量化引擎」(`src/engine/aiConfidenceEngine.ts`)

依據資料樣本充分度與訊號雜訊比計算 4 大維度百分比 (0~100)：

- **資料完整度 (`dataCompleteness`)**：日 K 數列長度 >= 120 根且籌碼資料充足為 100%；60~119 根為 85%；不足 60 根為 60~75%。
- **訊號穩定度 (`signalStability`)**：依據近 10 日價格震幅標準差與均線糾結度計算（震盪極端時信號穩定度下降）。
- **模型準確度 (`modelAccuracy`)**：依據均線趨勢與乖離率回測之方向一致性 (40%~85%)。
- **策略適用度 (`strategyApplicability`)**：判斷標的是否具備清晰波段或流動性特徵 (45%~90%)。
- **總體信心度 (`overallConfidence`)**：4 大指標加權或平均，反映當前標的分析之可信賴程度。

### 3. 動態接入「市場情緒引擎」(`src/engine/marketSentimentEngine.ts`)

將真實日 K 漲跌幅、近 5 日法人買超佔比與主力成本乖離率作為輸入，呼叫 `estimateMarketSentiment()`，產出真實 `MarketSentimentData`。

### 4. 報表組裝總管線連動 (`src/engine/aiForceDashboardEngine.ts`)

在 `generateAiForceReportFromCandles` 內：
- 調用 `calculateMultiDimensionRadar()`
- 調用 `estimateMarketSentiment()`
- 調用 `calculateAiConfidence()`
- 於回傳物件中正式覆蓋：
  ```ts
  multiDimensionRadar: calculateMultiDimensionRadar(...),
  marketSentiment: estimateMarketSentiment(...),
  aiConfidence: calculateAiConfidence(...),
  ```

---

## User Stories & Acceptance Criteria (驗收條件)

### User Story 1: 03 多維度判讀換股即時響應
- **Given** 使用者在即時行情 Bar 輸入不同股票（例如「2330」台積電）並點擊分析
- **When** 資料載入完成後
- **Then** 「03 多維度判讀」卡片的綜合評分、中心等級標籤（A/B/C/D）與 6 軸頂點座標**必須依據台積電真實歷史行情動態改變**，不再固定為 56 分與 C 級。

### User Story 2: 邊界安全性與優雅降級
- **Given** 使用者查詢歷史資料不足 5 根或特殊美股標的
- **When** 呼叫量化引擎時
- **Then** 引擎內部必須具備防守保護（`NaN`、除以零防護與預設回退），絕不引發前端白屏崩潰。

### User Story 3: 13 市場情緒與 14 AI 信心度同步活化
- **Given** 使用者查詢不同動能強度或不同波動狀態的標的
- **When** 切換至 Task 1 綜合分析視圖
- **Then** 「13 台股市場情緒」與「14 AI 信心維度」各進度條與指標百分比必須隨不同標的之數據特徵真實連動。

### User Story 4: 單元測試 100% 綠燈覆蓋
- **Given** 新增 `multiDimensionRadarEngine.ts` 與 `aiConfidenceEngine.ts`
- **When** 執行 `npm test`
- **Then** 新增之單元測試必須 100% 通過，且既有 18 張卡片之迴歸測試與 build 0 錯誤。
