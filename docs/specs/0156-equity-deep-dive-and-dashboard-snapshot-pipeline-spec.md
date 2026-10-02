# 產品需求規格書 (PRD)：全市場個股 7 步深度投研引擎、AI 主力處置狀態端到端串接與純前端 Canvas 快照匯出 (Spec 0156)

- **版本**: v8.67.0
- **狀態**: `ready-for-agent`
- **對應技術債**: `Debt #0037` (P2), `Debt #0040` (P3), `Debt #0039` (P3)
- **架構決策 (ADR)**: ADR #0156
- **關聯 PRD**: Spec 0140 (AI 戰情室), Spec 0155 (SQLite 湖倉)

---

## Problem Statement

在投資交易與個股研究實戰中，散戶常面臨三大核心痛點：
1. **看絕對價格定買賣、缺乏基本面與同業相對估值**：容易把營運模式與毛利率天差地遠的公司混為一談，忽視同業估值基準。
2. **無劇本、無交易紀律與風控底線**：進場前沒有明確定出買進理由、目標價、停損價與跟蹤指標，行情反轉時淪為被動套牢。
3. **戰情室決策閉環存在最後一哩路縫隙**：
   - 剛完成的 Spec 0155 SQLite 湖倉中已落庫處置與注意股票事件 (`disposition_attention_events`)，但在主力戰情室前端介面中尚未傳入 `statusTag`，導致頂部處置警示徽章無法真實連動 (`Debt #0040`)。
   - 戰情室與研報缺乏一鍵生成高畫質合成 PNG 快照的功能，目前僅能手動列印或跳出 Toast (`Debt #0039`)，無法便捷地在社群或交易日誌中分享與歸檔。

---

## Solution

建立全市場通用之**「7 步個股深度投研與決策閉環系統 (Equity Deep-Dive 7-Step Framework)」**，並與主力戰情室及 SQLite 湖倉全面連動：
1. **7 步個股深度投研引擎 (`src/engine/equityDeepDiveEngine.ts`)**：
   - 全市場通用（台股/美股自動市場適配）。
   - 自動裝配本地湖倉已知數據：行情價量、本益比、三大法人累積買賣超、箱頂/箱底支撐防線、處置/注意警示。
   - 雙軌交付：
     - **提示詞工廠 (Prompt Factory)**：一鍵無損產生相容 ChatGPT/Claude/Gemini/DeepSeek 的 7 步投研結構化 Prompt Payload。
     - **投資筆記本地沉澱 (Investment Memo Storage)**：儲存 200 字極簡交易卡（買進理由、目標價、停損價、週期、3 大指標），支援雙向同步至持倉風控線或關注清單。
2. **AI 主力戰情室處置狀態端到端串接 (`Debt #0040`)**：
   - 於 `AiForceDashboardView.tsx` 自動比對目標股票在當前基準日之處置有效區間 (`[start_date, end_date]`) 與注意事件，精準注入 `generateAiForceReportFromCandles` 的 `statusTag`，點亮 `HeaderMarketBar` 處置/注意警示徽章。
3. **純前端零依賴 Canvas 快照下載器 (`Debt #0039`)**：
   - 於 `HeaderExportBar.tsx` 實作純前端原生 Canvas 向量繪圖渲染管線，以 1920x1080 (2x Retina) 繪製機構級「主力戰情 × 7 步決策卡」高解析度合成圖，支援一鍵直接下載 PNG。
4. **沉浸式 7 步投研全螢幕彈窗 (`EquityDeepDiveModal.tsx`)**：
   - 在主力戰情室與持倉清單均設置「🔍 7 步投研」入口，支援隨時喚出、分步折疊檢視、一鍵複製與決策存檔。

---

## User Stories

### A. 7 步深度投研引擎與提示詞工廠 (Debt #0037)
1. 作為投資者，我希望在主力戰情室或持倉清單點擊「🔍 7 步投研」時，能立刻彈出該個股的深度投研彈窗，以便在交易前建立完整劇本。
2. 作為投資者，我希望步驟 1 自動提示該標的產業鏈上下游、主要客戶及商業模式拆解範本，以便確認在我的能力圈之內。
3. 作為投資者，我希望步驟 2 自動標記營收與現金流、應收帳款與存貨周轉的防雷檢驗重點，防範踩到地雷股。
4. 作為投資者，我希望步驟 3 提供 2 檔主要競爭對手的橫向指標對比結構（毛利、PE、PB、殖利率），破除單看股價高低的盲點。
5. 作為投資者，我希望步驟 4 能自動整合當前個股是否處於處置/注意股票警示，並提示客戶集中度、匯率等未定價風險。
6. 作為投資者，我希望步驟 5 建立未來一年樂觀、中性、悲觀三種情境推演的目標價推估架構，避免單一劇本迷思。
7. 作為投資者，我希望步驟 6 能自動帶出該標的近 20 日三大法人買賣超、融資增減或美股量能動態，釐清籌碼沉澱或主力吃貨出貨階段。
8. 作為投資者，我希望步驟 7 能引導我填寫 200 字極簡交易卡（買進理由、目標價、停損價、持有週期、3 大觀察指標）。
9. 作為投資者，我希望提供「一鍵複製完整 7 步 Prompt」與「分步單鍵複製」按鈕，讓我能直接貼入 Claude 或 ChatGPT 進行深度問答。

### B. 投資筆記持久化與持倉雙向連動 (Debt #0037)
10. 作為投資者，我希望填寫完步驟 7 投資筆記後能點擊儲存，將決策卡持久化至本地儲存 (`stock_investment_memos`)，確保重啟瀏覽器後不遺失。
11. 作為投資者，如果我正在研究庫存持倉中的股票，我希望在儲存投資筆記時勾選「同步至持倉風控線」，系統自動將筆記中的目標價與停損價更新至我的持倉帳本。
12. 作為投資者，如果我研究的是非庫存標的，我希望筆記自動被歸檔為「觀察清單筆記」，當未來我實際買入該標的時自動關聯展示歷史決策紀錄。
13. 作為投資者，我希望能在彈窗中檢視與編輯歷史投資筆記，並支援刪除與清空操作。

### C. 主力戰情室處置狀態端到端連動 (Debt #0040)
14. 作為台股交易者，當我在主力戰情室查詢一檔處於處置期的股票（如被列入 20 分鐘撮合盤）時，我希望頂部 MarketBar 能清晰顯示高對比度的紅色「處置股票」警示徽章，提醒我流動性凍結風險。
15. 作為台股交易者，當股票被列為注意股票時，我希望頂部 MarketBar 顯示黃色「注意股票」標籤。
16. 作為台股交易者，若該股票處置期已於昨日結束，我希望系統能依據 `[start_date, end_date]` 自動判定並回退為正常（`NORMAL`），不發出過期假警報。

### D. 純前端 Canvas 快照下載 (Debt #0039)
17. 作為使用者，在主力戰情室頂部匯出列點擊「下載儀表板 PNG」時，我希望瀏覽器在 1 秒內直接觸發下載一張乾淨高畫質的 PNG 圖檔，無需手動透過瀏覽器列印對話框另存。
18. 作為使用者，下載的 PNG 圖檔應包含標的代碼、名稱、現價漲跌幅、主力籌碼強度、關鍵支撐箱體、處置警示徽章與 7 步投研核心結論，排版符合 16:9 高畫質 (1920x1080) 標準。
19. 作為使用者，此匯出過程應純前端運算，不依賴任何外部截圖服務或上傳伺服器，100% 保障投資隱私。

---

## Implementation Decisions

### 1. 核心計算模組與型別設計 (`src/engine/equityDeepDiveEngine.ts`)
- 定義 `EquityDeepDiveInput`、`EquityDeepDiveReport` 與 `InvestmentMemoRecord` 型別介面。
- 實作組裝函式 `buildEquityDeepDivePromptPayload(input)`：
  - 輸入：標的、市場 (TW/US)、當前報價、K 線數據、籌碼數據、關鍵支撐位、處置標籤。
  - 美股適配：美股標的自動將三大法人切換為價量動能與量能分佈描述，處置風險切換為 Beta 與波動率警示。
  - 產出 Markdown 格式化、結構嚴謹之 7 步 Prompt 文本。

### 2. 投資筆記持久化層 (`src/utils/investmentMemoStorage.ts`)
- 於 `localStorage` 維護 `stock_investment_memos` 表格。
- 支援 `getInvestmentMemo(symbol)`、`saveInvestmentMemo(memo)`、`deleteInvestmentMemo(symbol)`、`getAllInvestmentMemos()`。
- 提供回填同步輔助函式 `syncMemoToHoldings(symbol, memo, updateHoldingCallback)`。

### 3. 主力戰情室端到端處置狀態注入 (`src/components/aiForceDashboard/AiForceDashboardView.tsx`)
- 引入處置事件判定輔助函式 `resolveStockStatusTag(symbol, market, referenceDate)`。
- 在 `AiForceDashboardView.tsx:113` 呼叫 `generateAiForceReportFromCandles` 時，將解析出的 `statusTag` 作為第 8 參數 `options.statusTag` 傳入。

### 4. 純前端 Canvas 快照下載管線 (`src/engine/dashboardCanvasExporter.ts`)
- 使用原生 `document.createElement('canvas')` 搭配 2D Context。
- 尺寸定錨：寬度 1920px、高度 1080px (Canvas DPR 2x)。
- 繪製深色專業金融面板背景、頂部股票代碼/現價行情、中段主力多空評級/籌碼雷達摘要、下段 7 步投研決策卡與停損停利風控線。
- 使用 `canvas.toBlob` 產出 PNG 並透過標準下載觸發保存。

### 5. UI 呈現層 (`src/components/equityDeepDive/EquityDeepDiveModal.tsx`)
- 採現代深色玻璃擬態 (Dark Glassmorphism) 設計風格。
- 支援分步摺疊卡片、一鍵複製各步 Prompt、一鍵複製全量 Prompt、投資筆記編輯器。
- 在 `HeaderExportBar.tsx` 與 `HoldingsTable.tsx` 掛載入口按鈕。

---

## Testing Decisions

### 1. 測試理念與縫隙 (Test Seams)
- 遵循 Red-Green-Refactor TDD 循環。
- 僅在公開介面縫隙測試外部行為，杜絕內部實作細節之脆性測試。
- 單元測試與整合測試需達到 100% 通過。

### 2. 主要測試切片
1. **`equityDeepDiveEngine.test.ts`**：
   - 驗證台股與美股的 Prompt 組裝正確性（包含籌碼降級與市場適配）。
   - 驗證處置狀態是否正確反映於步驟 4 Prompt 中。
   - 驗證缺漏數據時的 Fallback 容錯處理。
2. **`investmentMemoStorage.test.ts`**：
   - 驗證 CRUD 行為、標的關聯及持久化。
   - 驗證持倉風控線同步回填邏輯。
3. **`dashboardCanvasExporter.test.ts`**：
   - 驗證 Canvas 渲染資料裝配與 Blob 產出回調機制。
4. **`AiForceStatusTagE2E.test.ts`**：
   - 驗證 `AiForceDashboardView` 在給定處置股票時，`HeaderMarketBar` 是否正確渲染處置警示徽章。

---

## Out of Scope

1. **直接呼叫付費雲端 LLM API 生成文本**：本規格恪守 KISS 原則與零成本隱私規範，採「提示詞工廠 + 本地決策卡」雙軌機制，不內建任何外部 API Key 或消耗 Token 之伺服器調用。
2. **美股 13F 機構持股完整即時爬蟲**：美股籌碼採價量動能與量能分佈代理，不在此次引入龐大美股 SEC EDGAR 爬蟲管線。
3. **DOM 全節點像素級強制截圖套件**：不引入 `html2canvas` 等第三方大套件，僅採原生 Canvas 專屬繪製金融決策快照卡。

---

## Further Notes

- 完成實作後，需同步更新 `docs/debts/README.md` 將 `0037`、`0040`、`0039` 標記為 `RESOLVED`。
- 同步產出 ADR #0156 並更新 `CONTEXT.md` 領域名詞。
