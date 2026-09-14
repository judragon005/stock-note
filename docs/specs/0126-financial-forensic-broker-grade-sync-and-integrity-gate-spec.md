# Spec 0126: 穿透式財報戰情室券商級原子同步閘門、舊快取自癒與完整季度哨兵規格 (Financial Forensic Broker-Grade Sync, Cache Integrity Sentry & Quarter Normalization Spec)

## Problem Statement

使用者在實際操作【2327 國巨*】穿透式財報戰情室時，反饋了顯示體驗不佳與數值真空問題，並提出核心訴求：「**如果更新資料需要時間，請延遲顯示，等資料同步了才正式顯示**」：

經審查使用者截圖（圖 1 與圖 2）及底層管線代碼，識別出四大根本病灶：

1. **圖 1 柱狀圖金額單位嚴重錯置（出現 499,910 億天文數字）**：
   - 外部 FinMind/FMP 提供的科目數值為「元 (TWD / USD)」，而前端 `formatCurrencyMillions` 誤將傳入之「元」當作「百萬元」再除以 100，導致本期淨利 54.8 億被換算為 `54,862,560 億` 等荒唐數值；而在特定區間時又全數顯示為 `0 百萬`。
2. **圖 2 大面積數值為空（毛利 38.1%、淨利 0.0%、負債比 -、CFO 0 億、ROE 0.0%）**：
   - **舊快取污染**：先前版本在本地 IndexedDB 存有「只抓單表的舊快取」，`financialReportService` 只要發現本地有記錄就直接讀取返回，從未向遠端拉取三大報表。
   - **未申報空殼季度干擾**：外部 API 提前帶入自結營收月份被歸納為 `2026-Q2`，但該季尚未申報稅後淨利、資產負債與現金流，系統盲目以最後一筆作為 `latestPeriod`，導致淨利率、ROE 算成 0.0%，負債比變成 `-`，CFO 變成 0 億。
3. **缺乏券商級延遲防護與原子加載**：
   - 資料在庫或同步時，缺乏「原子完成校驗閘門 (Atomic Ready Gate)」，在三大報表未 100% 抓齊並校驗無誤前就搶先渲染半殘過渡畫面。
4. **科目別名覆蓋不全**：
   - 資產負債表與現金流量表在不同年度存在不同的申報科目別名（如 `TotalAssets / 資產總額 / 資產合計`、`NetCashInflowFromOperatingActivities` 等），部分科目未命中映射。

---

## Solution

依據 **券商業界常態最佳實踐 (Broker-Grade Standards)** 與 **KISS 原則**，實施四大關鍵防線：

### 1. 券商級原子加載與延遲顯示閘門 (`Atomic Delayed Display & SWR Gate`)
- **嚴格原子同步 (All-or-Nothing)**：
  - 只有在綜合損益表、資產負債表與現金流量表三大報表之 16 項標準科目全部抓齊、清洗、聚合並通過完整性校驗後，才正式寫入資料庫並呈現在畫面上。
  - 在後台抓取或快取校驗期間，彈窗維持**深色毛玻璃骨架屏 (Skeleton Placeholder)**，各區塊維持固定結構與流光效果，不展示任何半殘數值；待資料 100% 完備後，以 0.2s 平滑淡入 (Fade-In) 點亮。
- **快取健康度探針與自動自癒 (`Cache Integrity Probe & Auto-Purge`)**：
  - `loadOrFetchFinancialReport` 加入完整性探針：若本地快取中的記錄所有 CFO 均為 0、或缺少資產負債總額，自動判定為「無效舊快取 (Stale Partial Cache)」，自動於背景重新發起三大表並行請求並覆蓋快取，不再需要使用者手動點擊「重新整理」。

### 2. 正式審計季過濾哨兵 (`Complete Quarter Sentry`)
- **過濾空殼未申報季**：
  - 檢驗季度完整度：若最新季度僅有營收/毛利，但稅後淨利為 0 且資產負債全空（尚未申報之空殼季），系統自動過濾，錨定以**「最新完整申報季 (Latest Audited Quarter)」**作為 0 秒戰報、四大體質卡片、杜邦分析的評估基底。
  - 頂部週期標註明確呈現最新審計季度（例如 `2025-Q2 [正式季報]`），徹底杜絕 `0.0%`、`-` 與 `0 億` 的假陽性數值。

### 3. 金額單位券商標準化換算 (`formatFinancialAmount`)
- 統一以「元」作為基數：
  - 數值絕對值 $\ge 100,000,000$ (1 億)：換算為 `(val / 1e8).toFixed(1) + ' 億'`（例如 `54.9 億`、`-8.8 億`）。
  - 數值絕對值 $1,000,000 \sim 100,000,000$：換算為 `(val / 1e6).toFixed(1) + ' 百萬'`。
  - 數值絕對值 $< 1,000,000$：換算為 `(val / 1e4).toFixed(0) + ' 萬'`。
  - 柱狀圖上方金額標籤與 Tooltip 徹底精準，根除 `499,910 億` 天文數字。

### 4. 台股三大報表科目別名完整覆蓋 (`Alias Whitelist`)
- 損益表：`IncomeAfterTaxes / NetIncome / 本期淨利 / 稅後淨利 / 歸屬於母公司業主之本期淨利`。
- 資產負債表：`TotalAssets / 資產總計 / 資產總額 / TotalLiabilities / 負債總計 / 負債總額 / TotalEquity / 權益總計 / 權益總額 / CashAndCashEquivalents / 現金及約當現金`。
- 現金流量表：`CashFlowsFromOperatingActivities / NetCashInflowFromOperatingActivities / 營業活動之淨現金流入（流出） / 營業活動之現金流量`。

---

## Acceptance Criteria (驗收標準)

1. **金額格式化精準無天文數字 (Formatting Accuracy)**：
   - 傳入 5,486,256,000 元時正確顯示為 `54.9 億`（而非 `54,862,560 億` 或 `499,910 億`）。
   - 傳入負數 -884,300,000 元時正確顯示為 `-8.8 億`。
   - 傳入 50,000,000 元時正確顯示為 `50.0 百萬`。
2. **舊快取自癒與健康度校驗 (Cache Self-Healing)**：
   - 當本地 IndexedDB 存有 CFO 全為 0 或資產為 0 的殘缺快取時，`loadOrFetchFinancialReport` 能自動識別並強制觸發遠端三大表拉取與覆蓋，不展示舊髒資料。
3. **最新審計季過濾防空防呆 (Complete Quarter Resolution)**：
   - 當數據源存在尚未公佈淨利與資產的空殼季度時，系統自動錨定最新完整申報季，四大卡片與 0 秒戰報之毛利率、淨利率、ROE、負債比、CFO 皆有真實有效數值，嚴禁出現 `淨利率 0.0%` 或 `負債比 -` 的假性空白。
4. **延遲顯示與骨架屏體驗 (Atomic Delayed Display)**：
   - 彈窗打開時若資料正在抓取，展示深色毛玻璃骨架屏；資料完全同步驗證後一次性平滑淡入呈現。
5. **回歸測試與構建 (Regression & Build)**：
   - 全量單元測試 100% 綠燈通過。
   - `npm run build` TypeScript 0 錯誤。

---

## Verification Plan

1. **單元測試**：
   - 在 `FinancialTrendsLayer.test.ts` 驗證全新 `formatFinancialAmount` 的億/百萬換算精確度。
   - 在 `financialReportService.test.ts` 驗證快取健康度檢驗與自動自癒重撈機制。
   - 在 `taiwanFinancialPipeline.test.ts` 驗證空殼季度過濾與別名覆蓋。
2. **建置檢查**：執行 `npm test` 與 `npm run build` 確認 100% 通過。
