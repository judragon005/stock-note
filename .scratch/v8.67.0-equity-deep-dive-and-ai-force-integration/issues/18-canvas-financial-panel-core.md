# 18 — 原生 Canvas 向量金融面板與版面配置核心

**What to build:** 
建立 `src/engine/dashboardCanvasExporter.ts`。實作純原生 HTML5 `<canvas>` 向量繪製管線（1920x1080, 2x Retina）：
1. 繪製深色專業金融面板背景（深灰深藍漸層、細緻網格格線）。
2. 頂部繪製標的代碼、公司名稱、即時現價、漲跌金額與漲跌百分比（紅漲綠跌或自訂色系）。
3. 繪製「AI 戰情室 × 7 步深度投研決策卡」專屬標題與產出時間戳。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 純前端原生 Canvas API 繪製，零外部依賴
- [ ] 支援 2x devicePixelRatio 高解析度抗鋸齒渲染
- [ ] 座標排版純函式化，便於單元測試驗證
- [ ] 單元測試 100% 覆蓋
