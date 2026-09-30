# 需求規格說明書：AI 主力儀表板真實數據連動與視覺對齊重構 (AI Force Data Pipeline Sync & Visual Alignment)

- **規格編號**：`SPEC-0151`
- **狀態**：`READY_FOR_AGENT`
- **領域上下文**：`AI 主力儀表板 (AI Force Decision Dashboard)`、`技術指標管線 (Indicator Pipeline)`
- **關聯 PRD / ADR**：[ADR-0140](../adr/0140-ai-force-decision-dashboard.md)

---

## Problem Statement

使用者在「AI 主力決策儀表板」進行看盤操作與視覺審視時，發現五項影響決策判斷與可讀性的重大問題：
1. **標的查詢後數據未連動**：在頂部輸入 `0050` 並點擊「分析」後，僅標題切換為「0050 元大台灣50」，今日收盤價行卻仍停留在硬編碼的 2,290.00 (+205.00, +9.83%)，其餘 18 張卡片亦未同步真實行情。
2. **主力 K 線時間方向顛倒**：Card 01「主力 K 線」最左側為今天 (09/30)，最右側反而是過去 (09/01)，完全逆轉了標準金融圖表「左舊右新」的閱讀直覺。
3. **六角雷達圖判讀困難**：Card 03「多維度判讀」中心雷達圖半徑過小，各軸端文字（法人、趨勢、籌碼、流動、波動、動能）與分數微小模糊，使用者極難快速掌握各維度評分。
4. **健康度評估環過於纖細**：Card 11「健康度綜合評估表」內 5 個進度圓環直徑僅 54px，整體留白過多且數值字級過小，未達到如設計圖般的飽滿與高清晰度。
5. **總評判卡片未等高且層次不足**：Card 18「主力追蹤總評判」高度比左側的 Card 16 與 Card 17 矮，卡片底部未水平齊平；內部僅單純展示大文字與灰色段落，缺乏結構化關鍵數據指標，視覺專業感有待提升。

---

## Solution

1. **資料管線連動與防禦性回退 (Data Pipeline Sync & Resilient Fallback)**：
   - 確保台股 ETF（如 0050）與上市櫃標的能正確從 Yahoo Finance / TWSE 管道回補歷史日 K 與即時報價。
   - 重構 `createDefaultAiForceReport` 與回退機制，若外部連線異常或資料不足，依據當前查詢代碼與即時報價動態生成對應價格量級之基礎分析報告，絕不再使用與標的無關之寫死 2,290 元數值，並提供清楚的載入中與異常提示。
2. **K 線時間軸升冪排序校正 (Ascending Temporal Alignment)**：
   - 強制校正 `KLineChartCard` 的蠟燭數列與示範數列產生邏輯，確保資料嚴格按日期由舊至新（升冪）排列。SVG 畫布最左側固定為歷史（離今天最遠），最右側固定為最新交易日（離今天最近）。
3. **六角雷達圖與標籤文字大幅度視覺強化 (Card 03 Radar Magnification)**：
   - 將六角雷達圖最大半徑擴展（約 98~102px），優化 viewBox 空間利用率。
   - 維度名稱字級放大至 13px（加粗、高對比），分數數值放大至 12px（科技藍高亮），中心綜合評分圓環與字級等比放大，實現一目了然的判讀體驗。
4. **健康度評估 5 環甜甜圈圖形飽滿重構 (Card 11 Donut Gauges Expansion)**：
   - 將單一甜甜圈尺寸由 54px 放大至 78px，外環線寬加粗至 7px。
   - 中心百分比數字放大至 15px 粗體，下方指標名稱字級提升至 0.85rem，緊湊化各圓環間距，達成飽滿且不重疊的優質視覺。
5. **總評判卡片等高對齊與三層式專業佈局 (Card 18 Equal Height & Bento Reorganization)**：
   - 卡片設置 `height: 100%` 與垂直 Flex 排版，使 Card 18 底部與 Card 16、Card 17 完美齊平。
   - 內部重構為三層清晰結構：
     - **頂層**：🔮 標題 + 右側「法人動作」狀態膠囊徽章。
     - **中層**：核心語意大看板（「主力語意：調節減碼」20px 發光字體 + 狀態燈號）。
     - **底層**：結構化「關鍵量化數據膠囊」（5日法人合計、VWAP 偏離、RSI 狀態）+ 結構分明之 AI 研判論述。

---

## User Stories

1. 作為看盤使用者，當我在搜尋框輸入 `0050` 並點擊「分析」時，我希望能看到 0050 的真實收盤價與歷史走勢，而不是其他股票寫死的 2,290.00 假數據，以確保分析結論具備真實參考價值。
2. 作為交易決策者，若我的網路或資料庫暫時查無歷史資料，我希望能獲得明確的載入反饋或提示，而非無聲無息地載入不相干標的的數據，避免造成誤判。
3. 作為技術分析者，我希望「01 主力 K 線」的最左邊是歷史資料、最右邊是最新交易日，以便我按照標準金融看盤習慣從左至右判讀股價趨勢與形態演變。
4. 作為一般投資人，我希望「03 多維度判讀」的六角雷達圖與軸端文字（法人、趨勢、籌碼等）足夠大且清晰，讓我不需要瞇著眼睛或放大畫面就能立即掌握六大維度優劣。
5. 作為注重健康指標的投資者，我希望「11 健康度綜合評估表」內的 5 個甜甜圈進度環直徑更大、線條更厚實、數字更醒目，讓綜合健康度一目了然。
6. 作為追求介面整潔的使用者，我希望「18 主力追蹤總評判」卡片的高度與左邊兩張卡片（16、17）保持等高齊平，避免版面出現參差不齊的凹陷。
7. 作為專業投資人，我希望 Card 18 內部不僅有主力語意，還能將支撐此語意的核心量化數據（法人合計張數、VWAP偏離、RSI）提煉為視覺膠囊，幫助我一眼驗證 AI 的決策邏輯。

---

## Implementation Decisions

### 1. 模組改動與管線調整
- **`AiForceDashboardView.tsx`**：
  - 加強 `loadDataForSymbol` 流程，確保傳入 `targetSymbol` 與推斷的 `targetMarket`。
  - 當拉取歷史或即時報價時，若僅有即時報價，自動調整 `defaultAiForceReport` 之基準價格，杜絕 2,290.00 殘留。
  - 優化 Row 6 Grid 容器設定，使第 3 欄子容器具備 `height: 100%`，讓 Card 18 能夠繼承高度。
- **`aiForceDashboardEngine.ts`**：
  - 重構 `createDefaultAiForceReport`，支援自定義 `basePrice` 與動態數值生成，避免致茂 2360 價格成為全系統唯一寫死預設值。
  - 確保即時行情 `quote` 存在時，優先將價格與漲跌覆蓋至頂部 `marketBar`。
- **`KLineChartCard.tsx`**：
  - 重構 `rawCandles` 的 fallback 生成邏輯，改為由 `i = 1` 至 `30` 遞增，日期為由遠至近（`09/01` ➔ `09/30`）。
  - 在傳入真實 `data.candles` 時，增加日期升冪保護機制，杜絕任何降冪數列導致圖表倒置。
- **`MultiDimensionRadarCard.tsx`**：
  - 調整 SVG viewBox 與中心點配置，將 `maxRadius` 調升至 98~102。
  - 軸端標籤文字調升至 13px（`fontWeight: 700`），分數調升至 12px，中心評級文字相應放大。
- **`HealthSummaryCard.tsx`**：
  - `SingleGauge` 調整為寬高 78px，`radius` 調升至 31，`strokeWidth` 增至 7px。
  - 中心文字放大至 15px monospace，下方標籤字級提升至 0.85rem，減小各圓環之間的 flex gap。
- **`MainForceVerdictCard.tsx`**：
  - 根元素設定 `height: 100%`、`display: flex`、`flexDirection: column`、`justifyContent: space-between`。
  - 內部新增三層佈局，將 AI 研判文本解析提取「法人近 5 日合計」、「VWAP 偏離」、「RSI」為 Key-Value 膠囊，下方配置完整語意研判結論。

---

## Testing Decisions

### 1. 測試標準 (Test Standards)
- 遵循黑箱行為測試，只在公開介面縫隙（Test Seams）進行驗證，不測試私有實作細節。
- 測試需涵蓋：
  1. `KLineChartCard`：傳入任意蠟燭數列或預設狀態時，其繪製之首末座標與日期必須保持由遠到近（最左側日期 <= 最右側日期）。
  2. `MultiDimensionRadarCard`：驗證雷達頂點配置與放大後之半徑屬性正確性。
  3. `HealthSummaryCard`：驗證圓環進度計算與放大尺寸樣式正確性。
  4. `MainForceVerdictCard`：驗證卡片容器等高佈局樣式與三層排版渲染正確性。
  5. `aiForceDashboardEngine` / `AiForceDashboardView`：驗證標的變更時，報告內 `marketBar` 數值正確同步至該標的價格，不殘留 2290 舊數據。

### 2. 測試先例 (Prior Art)
- `src/components/aiForceDashboard/cards/KLineChartCard.test.tsx`
- `src/components/aiForceDashboard/cards/HealthSummaryCard.test.tsx`
- `src/components/aiForceDashboard/cards/MultiDimensionRadarCard.test.tsx`
- `src/components/aiForceDashboard/cards/MainForceVerdictCard.test.tsx`
- `src/engine/aiForceDashboardEngine.test.ts`

---

## Out of Scope

1. 本次不涉及後端伺服器的重構（維持純前端離線優先與 Vite 開發代理架構）。
2. 本次不修改 Card 01~18 以外之次要工作區功能。

---

## Further Notes

- 完成 PRD 後將執行 `/to-tickets` 將此規格拆解為獨立的原子開發任務票券。
