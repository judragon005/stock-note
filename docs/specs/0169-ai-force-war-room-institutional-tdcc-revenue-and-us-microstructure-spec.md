# 規格書 0169：AI 主力戰情室法人籌碼與 TDCC 大戶端到端貫通、月營收與 ETF 自適應、美股微觀結構獨立化與搜尋體驗全面補強規格 (Spec 0169)

## Problem Statement

「AI 主力戰情室」歷經多次局部迭代後，依然讓券商、法人操盤室與真實波段存股投資人感到「無法完全正常運作且深度不足」，其根本原因在於系統架構存在以下六大斷層與盲區：

1. **湖倉真實數據閒置與前端管線脫鉤 (Technical Debt #0042)**：
   - 本地 SQLite 數據庫與 Vite 中介層 (`/api/market/history/:symbol`) 早已採集並能輸出 `tw_tdcc_distribution`（集保千張大戶股權分散表）與 `tw_monthly_revenue`（近 12 個月營收成長）。
   - 然而前端主視圖 `AiForceDashboardView.tsx` 與報表生成引擎 `aiForceDashboardEngine.ts` 卻將這兩筆數據拋棄，既未傳入也未渲染任何卡片。
2. **美股與無法人情境殘留偽數據公式 (Violation of Zero-Mock Policy)**：
   - 先前迭代宣告了零假數據，但在 `buildInstitutionalFlow` 底層中，當標的為美股或無法人資料時，仍使用 `Math.round(volume * 0.12 * 0.6)` 捏造「外資、投信、自營商」張數。
   - 美股投資人看到台股「三大法人」與「張數」單位，產生嚴重信任危機。
3. **ETF 預設標的之營收盲點 (0050 ETF Blind Spot)**：
   - 戰情室預設標的為台股旗艦指數「0050 (元大台灣50)」。但 ETF 為基金形態，根本無月營業收入（tw_monthly_revenue）。
   - 若直接套用個股營收卡片，0050 將直接呈現錯誤或空白，第一印象破功。
4. **缺乏多週期大格局檢視 (Multi-Timeframe Gap)**：
   - 波段操作核心為「週線看趨勢，日線找買點」，長線存股重視「月線位階」。
   - 主 K 線卡片死守單一日 K 頻率，無法切換週 K 與月 K。
5. **搜尋與操作體驗生硬 (Search & Navigation Friction)**：
   - 湖倉已建有 9,629 檔標的註冊表與 `/api/market/symbols` 模糊搜尋 API，但戰情室頂部搜尋列僅能精確手打代碼，無即時下拉補全，無法以中文名稱（如「台積電」、「輝達」）搜尋。
6. **多頻率數據時差未透明化 (As-of Date Transparency)**：
   - 交易所盤後日報、三大法人（15:00）、融資券（晚間）、集保大戶（週五）、月營收（每月10日）發布時間點各異。系統未標註各數據之發布基準日，易引發使用者對數據滯後的疑慮。

---

## Solution

實裝端到端「主力戰情室專業券商與法人級架構大對齊」，徹底根除所有偽數據，全面啟動本地湖倉之集保大戶與月營收數據：

1. **端到端管線貫通與資料結構擴充**：
   - 在 `AiForceDashboardView.tsx` 中完整提取 `lakehouseData.tdccRecords` 與 `lakehouseData.revenueRecords`。
   - 擴充 `generateAiForceReportFromCandles` 參數與回傳型別，新增 `tdccDistribution` 與 `monthlyRevenue` 結構。
2. **新增波段核心卡片：TDCC 集保千張大戶趨勢卡**：
   - 配置於 Row 3（與卡片 08 法人行為計量相鄰），呈現雙軸趨勢圖：
     - 左軸：千張大戶持股比率（%）折線圖 + 4 週均線。
     - 右軸：總股東人數（人）柱狀圖。
   - 實時量化徽章：`籌碼高度集中 (大戶增/人數減)`、`散戶接刀警戒`。
   - 保留原有卡片 16（買賣力分布），滿足盤中紅黑量能買賣張數力道監控。
3. **新增基本面核心卡片：月營收與營運成長走勢卡 (含 ETF 智慧自適應)**：
   - 個股：展示近 12 個月單月營收長條圖，以顏色高亮 YoY 成長率，標註 `連續 3 個月年月雙增` 與 `創歷史新高 (ATH)`。
   - ETF（0050, 0056 等）：智慧自適應切換為 **「ETF 規模 (AUM) 與配息殖利率河流」**，標註受益人人數，杜絕營收空白破綻。
4. **美股微觀結構獨立與完全零假數據**：
   - 切換美股標的（如 NVDA, AAPL）時，卡片 08/15 徹底剔除外資/投信/自營商，切換為 **「美股微觀量價動能評分 (Microstructure Score / MFI / OBV)」**。
   - 單位自適應切換為「股」，計價幣別自適應切換為「USD」，誠實標籤「美股市場無三大法人日報」。
5. **標的搜尋 30ms 防抖下拉補全與快捷標籤**：
   - 串接 SQLite `/api/market/symbols`，實裝代碼與中文名稱（如「台積電」、「聯發科」）模糊比對下拉提示。
   - 頂部常駐熱門/自選快速切換膠囊（`0050`、`2330`、`2454`、`NVDA`、`AAPL`）。
6. **分項時效基準日透明化 (As-of Date Footnotes)**：
   - 在法人卡片、集保卡片、營收卡片微觀腳註標明基準發布日期（如 `集保: 2026-10-02`、`營收: 2026-09`），建立專業信任感。
7. **主 K 線日 K / 週 K / 月 K 動態聚合**：
   - 前端於記憶體中將 250 天日 K 數列毫秒級聚合為週 K 與月 K，提供多週期切換鈕。

---

## User Stories

1. **作為波段交易員**，我希望在主力戰情室直接看到「千張大戶持股比連續增加、股東人數減少」的 TDCC 真實走勢，以此確認主力籌碼是否真正沉澱。
2. **作為中長線存股族**，我希望在戰情室能一眼看到近 12 個月營收 YoY 成長長條圖與營收創高標籤，並在查詢 0050 等 ETF 時不會看到荒謬的無營收報錯。
3. **作為美股投資人**，我希望查詢 NVDA 或 AAPL 時，戰情室不出現捏造的外資投信張數，而是呈現專業的美股微觀量價評分與美元單位。
4. **作為一般使用者**，我希望在搜尋列輸入「台積電」或「2330」時能立即出現下拉補全清單，並有一鍵切換核心標的的快捷按鈕。
5. **作為專業分析者**，我希望能切換「週 K」看大趨勢，並在各卡片看見清晰的資料發布基準日。

---

## Implementation Decisions

### 1. 佈局拓撲重構 (Bento-Grid Topology)
- **Row 1**：01 主 K 線（100% 滿版，新增【日 K / 週 K / 月 K】多週期切換）。
- **Row 2 (4 卡)**：02 AI 決策核心 | 03 多維度判讀 | 04 籌碼熱區 | 05 風險雷達。
- **Row 3 (3 卡 - 籌碼與基本面主力戰區)**：
  - `Card 08: 法人行為計量`（台股三大法人 / 美股微觀評分）
  - `Card 19 (新增): TDCC 集保千張大戶趨勢卡`（千張持股比 vs 股東人數）
  - `Card 20 (新增): 月營收與成長趨勢卡`（個股月營收 YoY / ETF 規模與殖利率）
- **Row 4 (4 卡)**：06 預測路徑 | 07 成本結構 | 10 多空能量棒 | 11 健康度綜合。
- **Row 5 (4 卡)**：09 隔日沖風險 | 12 動態信號 | 13 市場情緒 | 14 AI 信心。
- **Row 6 (4 卡)**：15 籌碼摘要 | 16 買賣力分布 (保留) | 17 多空力道 | 18 主力結論。

### 2. 數據傳遞與 SSOT 聚合
- `AiForceDashboardView.tsx` 呼叫 `loadSymbolFullLakehouseData` 時，取得完整的 `tdccRecords` 與 `revenueRecords`。
- `generateAiForceReportFromCandles` 增加參數接收 `tdccRecords` 與 `revenueRecords`。
- `buildInstitutionalFlow` 徹底移除美股 fallback 中的假張數捏造算式，回傳乾淨的空陣列或美股微觀標記。

### 3. ETF 智慧識別器 (Security Type Resolver)
- 判斷標的是否為 ETF：以代碼特徵（台股 00 開頭如 `0050`, `0056`, `00878`，美股如 `VOO`, `QQQ`, `SPY`）或 `symbols_meta.type === 'ETF'` 判定。
- 若為 ETF，月營收卡標題切換為「ETF 資產規模與收益分配」，展示近四季配息金額與殖利率折線。

---

## Step-by-Step Task Breakdown

### Ticket 01: 擴充主力戰情室報表型別與端到端數據管線 (Engine & Pipeline)
- 擴充 `types/aiForceDashboard.ts`：定義 `TdccDistributionData` 與 `MonthlyRevenueData` 介面。
- 修改 `aiForceDashboardEngine.ts`：`generateAiForceReportFromCandles` 接收並組裝 TDCC 與月營收資料。
- 根除 `buildInstitutionalFlow` 中針對美股的偽造法人張數算式。
- 修改 `AiForceDashboardView.tsx`：將 `lakehouseData` 中的 `tdccRecords` 與 `revenueRecords` 正式接入。
- **單元測試**：編寫 `aiForceDashboardEngine.test.ts` 驗證數據管線流通與 Zero-Mock。

### Ticket 02: 實裝 Card 19「TDCC 集保千張大戶趨勢卡」 (Component & Visual)
- 建立 `src/components/aiForceDashboard/cards/TdccDistributionCard.tsx`。
- 繪製千張大戶持股比率折線圖與總股東人數半透明柱狀圖（雙軸 SVG）。
- 實裝波段起漲（大戶增+散戶減）與接刀警戒徽章。
- **單元測試**：編寫 `TdccDistributionCard.test.ts` 驗證雙軸投影極值與空狀態呈現。

### Ticket 03: 實裝 Card 20「月營收成長卡」與 ETF 智慧自適應 (Component & Visual)
- 建立 `src/components/aiForceDashboard/cards/MonthlyRevenueCard.tsx`。
- 繪製近 12 個月單月營收長條圖，以顏色區分 YoY 正負成長率，標註創歷史新高 (ATH)。
- 整合 ETF 自適應邏輯：0050 等標的切換為資產規模與配息殖利率視圖。
- **單元測試**：編寫 `MonthlyRevenueCard.test.ts` 驗證個股月營收與 ETF 自適應切換。

### Ticket 04: 美股微觀動能結構獨立與單位幣別完全隔離 (US Alignment)
- 修改 `InstitutionalFlowCard.tsx` 與 `ChipsSummaryCard.tsx`：美股標的隱藏外資投信表格，替換為「美股微觀量價動能 (MFI/OBV)」專屬儀表。
- 確保所有量能單位在美股顯示為「股」、計價幣別顯示為「USD」。
- **單元測試**：編寫美股 NVDA/AAPL 注入測試，確保 0 假張數、0 假外資。

### Ticket 05: 頂部搜尋框 30ms 防抖即時下拉補全與快捷標籤 (UX Enhancement)
- 修改 `HeaderMarketBar.tsx`：整合本地 `/api/market/symbols` API。
- 實裝 30ms 防抖搜尋下拉清單，支援代碼與中文名稱即時搜尋。
- 常駐核心標的快速切換膠囊 (`0050`, `2330`, `2454`, `NVDA`, `AAPL`)。
- **單元測試**：編寫 `HeaderMarketBar.test.ts` 驗證下拉搜尋與標籤點擊切換。

### Ticket 06: 主 K 線多週期聚合切換 (日 K / 週 K / 月 K) 與分項時效標籤
- 在 `KLineChartCard.tsx` 頂部增設【日 K | 週 K | 月 K】切換鈕。
- 實裝日 K 聚合為週 K / 月 K 的記憶體快速聚合演算法與均線重算。
- 在各卡片微觀腳註標明發布基準日（As-of Date）。
- **單元測試**：編寫多週期聚合邏輯與 K 線渲染測試。

### Ticket 07: 端到端 E2E 整合驗收與技術債閉環 (E2E & Debt Resolution)
- 執行台股 0050、2330 與美股 NVDA 的端到端整合測試。
- 標記技術債 `0042` 與 `0044` 為 `RESOLVED`。
- 更新交接手冊與 `CONTEXT.md`。

---

## Acceptance Criteria

1. **真實 TDCC 集保呈現**：查詢台股 2330 或 0050，卡片 19 能正確讀取 SQLite `tw_tdcc_distribution` 並繪製雙軸圖，不出現任何合成隨機值。
2. **個股月營收 vs ETF 自適應**：
   - 查詢 2330 時，卡片 20 呈現近 12 個月營收長條圖與 YoY 成長率。
   - 查詢 0050 時，卡片 20 智慧識別為 ETF，顯示規模/配息殖利率視圖，杜絕查無營收報錯。
3. **美股完全零假數據**：查詢 NVDA 或 AAPL 時，卡片 08/15 不得出現外資、投信、自營商假張數，完全切換為美股微觀動能指標。
4. **搜尋體驗飛躍**：在搜尋框輸入「台積電」，30ms 內出現包含「2330 台積電」的下拉提示，點擊可直接載入。
5. **品質閘門**：`npm test` 100% 綠燈通過，`npm run build` TypeScript 0 錯誤。
