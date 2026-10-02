# 19 — Canvas 決策卡向量排版、Badge 繪製與 PNG 匯出管線

**What to build:** 
在 `src/engine/dashboardCanvasExporter.ts` 擴充卡片與下載管線：
1. 繪製主力多空雷達評級徽章、處置/注意警示 Badge（帶發光圓角邊框）。
2. 排版繪製 7 步核心筆記（買進理由、目標價、停損價、關鍵支撐箱體）。
3. 實作 `exportCanvasToPngBlob(canvas): Promise<Blob>` 並透過 `URL.createObjectURL` 觸發下載檔案 `equity-decision-card-<symbol>.png`。
4. 於 `src/components/aiForceDashboard/HeaderExportBar.tsx` 串接點擊「下載儀表板 PNG」觸發此下載管線，淘汰純提示 Toast。

**Blocked by:** 18 — 原生 Canvas 向量金融面板與版面配置核心, 15 — 步驟 7 投資筆記結構與 7 步全量 Prompt 聚合引擎, 17 — 觀察名單自動歸檔與持倉目標價/停損價雙向回填

**Status:** ready-for-agent

- [ ] 繪製文字多行自動換行與安全內距
- [ ] 支援處置警示徽章向量繪製
- [ ] 觸發一鍵純前端下載 PNG
- [ ] 單元測試 100% 覆蓋
