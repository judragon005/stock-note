# 04 — 實裝「下載全部圖表 PNG」實體圖檔批次匯出 (Real All Charts PNG Batch Export)

**What to build:**
1. 修改 `src/components/aiForceDashboard/HeaderExportBar.tsx` 與 `src/engine/exportReportPipeline.ts`：
   - 淘汰純 Toast Mock：移除原本僅彈出 `已將全量 SVG 圖表打包快照至下載佇列` 的虛假代碼。
   - 實作實體批次匯出函數 `triggerAllChartsDownload(symbol: string)`：
     - 抓取頁面中所有核心量化圖表（主 K 線圖、多維度雷達、量價分佈、風險蛛網、預測錐形、VWAP 成本結構等）的 `<svg>` 元素。
     - 透過 `XMLSerializer` 與 HTML5 Canvas 將每個 SVG 轉為高解析度 PNG 圖片資料。
     - 觸發實體圖檔下載（支援逐圖自動下載或封裝），讓使用者真正獲得分析圖表檔案。
2. 匯出過程提供清晰的 Loading 狀態與成功下載 Toast。

**Blocked by:** None

**Status:** completed

- [x] 於 `exportReportPipeline.ts` 實作 `triggerAllChartsDownload` 實體圖表序列化與匯出邏輯。
- [x] 於 `HeaderExportBar.tsx` 中將 `ALL_CHARTS_PNG` 動作完整綁定實體匯出函式。
- [x] 撰寫單元測試驗證 SVG 抓取與 Canvas 匯出調用鏈。
