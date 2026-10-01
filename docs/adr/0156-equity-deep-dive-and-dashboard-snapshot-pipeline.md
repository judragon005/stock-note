# ADR 0156: 全市場個股 7 步深度投研引擎、AI 主力處置狀態端到端串接與純前端 Canvas 快照匯出架構

- **狀態**: `ACCEPTED`
- **日期**: 2026-10-01
- **對應 Spec**: [docs/specs/0156-equity-deep-dive-and-dashboard-snapshot-pipeline-spec.md](../specs/0156-equity-deep-dive-and-dashboard-snapshot-pipeline-spec.md)
- **對應技術債**: `Debt #0037` (P2), `Debt #0040` (P3), `Debt #0039` (P3)

---

## 1. 背景與脈絡 (Context)

在個人股票交易與投研決策中，散戶經常面臨「看價格直覺進出場、無深度基本面與籌碼劇本、無交易紀律與停損目標線」之痛點。先前版本雖已建立強大的 SQLite 本地湖倉 (Spec 0155) 與 AI 主力戰情室 (Spec 0140)，但存在三個關鍵的最後一哩路架構縫隙：
1. **投研閉環斷鏈 (`Debt #0037`)**：缺乏全市場個股（台美雙市場）「商業定性 ➔ 財務定量 ➔ 同業對比 ➔ 風險防雷 ➔ 情境推演 ➔ 籌碼微觀 ➔ 投資筆記」的結構化投研引擎。
2. **處置股票警示未連動 (`Debt #0040`)**：湖倉已落庫 TWSE 處置與注意事件，但前端呼叫 `generateAiForceReportFromCandles` 時遺漏傳入 `options.statusTag`，導致頂部警示徽章未點亮。
3. **戰情快照匯出體驗不佳 (`Debt #0039`)**：戰情室「下載 PNG」僅提示列印 Toast，缺乏一鍵純前端直接下載高畫質研報快照圖檔之能力。

---

## 2. 決策考量與原則 (Decision Drivers)

1. **KISS 原則與零依賴**：不引入肥大且易造成 CSS Grid 跑版的外部截圖套件（如 `html2canvas`），以原生 HTML5 `<canvas>` 實作向量合成。
2. **隱私優先與零 Token 成本**：投研框架採「提示詞工廠 + 本地決策卡」雙軌機制，不強制綁定外部付費 LLM API，產出相容各大 LLM 的 Payload 並在本地持久化投資筆記。
3. **全市場動態適配**：美股標的自動將三大法人切換為價量動能與量能分佈描述，處置股票切換為波動率/Beta 風險，維持台美一致體驗。
4. **雙向連動與紀律落實**：投資筆記與持倉帳本的目標價、停損價風控線雙向互通。

---

## 3. 架構決策 (Decisions)

### 3.1 7 步深度投研純計算引擎 (`src/engine/equityDeepDiveEngine.ts`)
- 輸入包含：`symbol`, `market`, `candles`, `quote`, `institutionalRecords`, `muscleBox`, `statusTag`。
- 產出結構化 7 步驟 Markdown Prompt Payload，支援分步複製與全量一鍵複製。

### 3.2 投資筆記本地存儲與持倉連動 (`src/utils/investmentMemoStorage.ts`)
- 於 `localStorage` 維護 `stock_investment_memos`，支援 CRUD 與時間戳記。
- 提供 `syncMemoToHoldings` 函式，若標的在持倉內，使用者可一鍵回填持倉帳本中的 `targetPrice` 與 `stopLossPrice`。

### 3.3 處置與注意股票有效時間視窗判定 (`AiForceDashboardView.tsx`)
- 依據 `[start_date, end_date]` 嚴格驗證基準日，過期事件自動回退為 `NORMAL`。
- 於 `generateAiForceReportFromCandles` 傳入第 8 參數 `{ statusTag: resolvedStatusTag }`，完整驅動 `HeaderMarketBar` 之 `DISPOSITION` 與 `ATTENTION` 徽章。

### 3.4 純前端 Canvas 決策快照下載器 (`src/engine/dashboardCanvasExporter.ts`)
- 原生 Canvas 向量繪製，設定解析度為 1920x1080 (Canvas DPR 2x)。
- 生成包含標的行情、主力位階、關鍵支撐、7步核心筆記與處置標籤的金融機構級快照卡，透過 `canvas.toBlob` 直接觸發下載。

---

## 4. 後果與影響 (Consequences)

### 正面影響 (Positive)
- **使用者體驗極致躍升**：具備完整的「湖倉數據 ➔ 主力判讀 ➔ 7步投研 ➔ 決策存檔 ➔ 快照分享」一體化閉環。
- **架構純淨**：零新增外部 npm 套件，維持極簡與高效。
- **技術債一次性清償**：一口氣解決 `Debt #0037`, `Debt #0040`, `Debt #0039` 三大技術債。

### 權衡與代價 (Trade-offs)
- 原生 Canvas 排版需手動計算座標與字級，需確保多行文本與 Badge 的換行精確度。
