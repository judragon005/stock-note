# 0146：AI 主力儀表板「03 多維度判讀」、「13 市場情緒」與「14 AI 信心度」全量化資料管線動態整合

- **日期**：2026-09-26
- **狀態**：Accepted (已實作並驗證)
- **關聯 Issue**：[#115](https://github.com/judragon005/stock-note/issues/115)
- **關聯規格**：[docs/specs/0146-ai-force-multi-dimension-sentiment-confidence-live-pipeline-spec.md](../specs/0146-ai-force-multi-dimension-sentiment-confidence-live-pipeline-spec.md)
- **本地票券**：`.scratch/v8.59.0-ai-force-multi-dimension-live-pipeline/issues/` (01 ~ 08)

---

## 1. 背景與問題陳述 (Context & Problem)

在 AI 主力儀表板中，使用者於即時行情 Bar 輸入不同股票代號（例如 2330 台積電、2317 鴻海、2360 致茂或 NVDA 輝達）進行分析時：
- **卡片 03「多維度判讀」完全卡死無動作**：雷達圖與評分固定為初始模板的「綜合評分：56 / 100」、「C 級」，6 軸（法人 50、趨勢 65、籌碼 55、流動 45、波動 60、動能 58）毫無響應。
- **根本原因**：`generateAiForceReportFromCandles()` 雖然接收了各標的真實日 K 與三大法人歷史數據，但在回傳物件組裝時，僅解構了預設模板 `...defaultTemplate`，**完全遺漏了 `multiDimensionRadar` 的動態計算與屬性覆蓋**。
- **衍生連帶問題**：卡片 13（台股市場情緒）已有獨立引擎 `marketSentimentEngine.ts` 但未掛載至管線；卡片 14（AI 信心度）亦缺乏量化推估公式，數值長期待在靜態常數。

---

## 2. 架構決策 (Decision)

依據 KISS 原則與單一職責原則 (SRP)，採取方案 B「解耦獨立量化模組 + 完整 TDD 測試驅動開發」：

### 2.1 建立 Card 03 專屬引擎：`multiDimensionRadarEngine.ts`
建立 6 大維度數學映射模型與防禦機制：
1. **法人軸 (`institutional`)**：依據近 20 日法人累計買賣超與方向，土洋合買獲 85~95 分、齊賣獲 15~35 分，美股/無籌碼回退 50 基準分。
2. **趨勢軸 (`trend`)**：依 MA5/10/20/60 多頭排列度（四線多頭 88 分）與 VWAP 乖離率修正。
3. **籌碼軸 (`chips`)**：依近 5 日三大法人合計淨買超張數與集中度，大買 70~85 分、大賣 25~35 分。
4. **流動性軸 (`liquidity`)**：依近 5 日均量分段映射（台股 >3000 張獲 88+ 分，<300 張獲 25 分；美股以股數為基準）。
5. **波動軸 (`volatility`)**：依近 20 日日波幅標準差，健康交易波動 (1.0%~4.0%) 獲 85 高分，極端劇烈 (>6.0%) 或死水盤 (<0.5%) 扣減至 35~45 分。
6. **動能軸 (`momentum`)**：整合 KD(9,3,3) 黃金交叉、RSI(14) 區間與當日成交量放大倍數。
7. **等級判定**：6 軸等權平均四捨五入取整：`>=80: 'A'`、`>=65: 'B'`、`>=50: 'C'`、`<50: 'D'`。不足 5 根資料提供 50 分中性回退，絕不產生 `NaN`。

### 2.2 建立 Card 14 專屬引擎：`aiConfidenceEngine.ts`
依據資料充足度與訊號品質推估 4 大維度：
- **資料完整度 (`dataCompleteness`)**：日 K >= 120 根且有法人資料達 98%，隨樣本縮減遞減。
- **訊號穩定度 (`signalStability`)**：依近 10 日價格波幅標準差與雜訊比評估。
- **模型準確度 (`modelAccuracy`)**：檢驗短中長期均線同向性，樣本過短自動折算。
- **策略適用度 (`strategyApplicability`)**：流動性充足與波段明確度評估。
- **總體信心度 (`overallConfidence`)**：加權平均取整。

### 2.3 主報表管線整合 (`aiForceDashboardEngine.ts`)
在 `generateAiForceReportFromCandles` 中調用：
- `calculateMultiDimensionRadar(...)` 覆蓋 `multiDimensionRadar`
- `estimateMarketSentiment(...)` 覆蓋 `marketSentiment`
- `calculateAiConfidence(...)` 覆蓋 `aiConfidence`
- 同時以 `healthSummary.chipHealth` 動態聯動 `decisionCore.chipHealthScore`。

---

## 3. 實作後果與效益 (Consequences)

### 正面效益
1. **即時有感響應**：切換台積電 (2330) 時多維度雷達呈現 80+ 分 A/B 級強勢多邊形；切換弱勢股時立即跌落至 30~45 分 D 級，徹底根除 56 分寫死現象。
2. **全卡片動態閉環**：18 張卡片中最後 3 張靜態卡（03、13、14）全數接通真實管線，達成 100% 動態化。
3. **極致防禦性與相容性**：所有函式具備完整邊界防呆，空陣列或不足 5 根日 K 時絕不拋出例外或渲染錯誤。

### 驗證結果
- **單元測試**：新增 `multiDimensionRadarEngine.test.ts` (12 tests) 與 `aiConfidenceEngine.test.ts` (4 tests)，全專案 **137 個測試檔案、1,157 個測試 100% 綠燈通過**。
- **生產建置**：`npm run build` TypeScript 0 錯誤順利產出。
