# v7.8.0 籌碼泡泡圖自適應相對縮放、圓形防碰撞排斥算法與聚光燈佈局系統

本目錄為 PRD #0078 之本機票券鏡像，依據 Matt Pocock `/to-tickets` 規範與專案原則進行任務拆解。

## 🎯 核心目標

解決全市場法人焦點 Top 30 模式下，泡泡在上下邊界擠成水平一直線（硬截斷上限過低）與泡泡圓形嚴重重疊遮蔽代碼數字的痛點，建立高可讀性、零外部龐大依賴之自適應分佈與 2D 防碰撞排斥佈局系統。

## 📋 任務清單 (Task Breakdown)

| 票券編號 | 標題 | 狀態 | 負責模組 |
| :--- | :--- | :--- | :--- |
| [#0078](issues/0078.md) | [Epic] 籌碼泡泡圖自適應縮放、防碰撞排斥與聚光燈佈局 | `completed` | 全模組統籌 |
| [#01](issues/01-adaptive-power-law-scaling-and-safe-margins.md) | 自適應動態冪次縮放公式與 25% 呼吸緩衝安全區 | `completed` | `smartMoneyEngine.ts` |
| [#02](issues/02-2d-circle-collision-relaxation-engine.md) | 2D 圓形幾何排斥純函數演算法與象限守恆守門員 | `completed` | `smartMoneyEngine.ts` |
| [#03](issues/03-svg-chart-collision-integration-and-spotlight-hover.md) | SVG 圖表接入防碰撞坐標、DOM 置頂與滑鼠聚光燈高亮 | `completed` | `SmartMoneyBubbleChart.tsx` |
| [#04](issues/04-market-movers-spread-and-end-to-end-verification.md) | 全市場模式行情散度優化與端到端 100% 測試驗證 | `completed` | `ChipsWorkspace.tsx` / Tests |
