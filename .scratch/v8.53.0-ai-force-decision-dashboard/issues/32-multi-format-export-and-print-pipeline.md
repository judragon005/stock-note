# 32 — 多格式圖表匯出與原生列印管線

**What to build:**
實作頂部 5 大匯出按鈕功能：下載儀表板 PNG、下載全部圖表 PNG、下載資料 CSV（包含 DDE 注入防護）、下載總結報告 HTML 與原生列印 / 匯出 PDF 樣式適配。

**Blocked by:**
31 — 底部 5 大任務視圖切換器與面板整合

**Status:** completed

- [x] 支援 SVG 轉 Canvas 匯出高解析度 PNG 圖片
- [x] CSV 匯出包含完整行情與量化數據，且具備防注入處理
- [x] 生成獨立可離線查看之 HTML 總結報告
- [x] 適配 `@media print` 列印與 PDF 匯出無遮擋排版
- [x] 單元測試覆蓋 CSV 與 HTML 導出內容生成
