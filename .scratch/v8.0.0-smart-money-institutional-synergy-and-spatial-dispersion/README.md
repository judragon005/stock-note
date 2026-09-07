# v8.0.0 聰明錢二維空間正交排斥散度、時序影格圖卡即時同步與機構共振決策系統

本目錄為 PRD #0080 之本機票券鏡像，依據 Matt Pocock `/to-tickets` 規範進行任務拆解。

## 🎯 核心目標

1. 徹底破除照片 1 中泡泡被串在一條水平死線上的缺陷，引入二維正交空間排斥（上下浮動），實現蜂巢狀自然錯開，並以半徑收斂與小球置頂解決大球遮小球。
2. 徹底修復照片 2 中圖卡數值鎖死最新一天的未來資料偏誤，實現 Tooltip 數據與當前播放影格（currentDateIndex）100% 即時聯動跳動。
3. 導入專業券商與基金經理人「機構共振模型」，精準識別「⚡ 土洋對作激戰」與「🚀 土洋合買抬轎」，消除代數相加為零的金融失真。

## 📋 任務清單 (Task Breakdown)

| 票券編號 | 標題 | 狀態 | 負責模組 |
| :--- | :--- | :--- | :--- |
| [#0080](issues/0080.md) | [Epic] 二維空間正交排斥、時序圖卡同步與機構共振系統 | `ready-for-agent` | 全模組統籌 |
| [#01](issues/01-2d-orthogonal-dispersion-and-small-bubble-zindex.md) | 2D 正交空間排斥演算法、半徑收斂與小球優先頂層繪製 | `ready-for-agent` | `smartMoneyEngine.ts` / `SmartMoneyBubbleChart.tsx` |
| [#02](issues/02-temporal-tooltip-frame-data-sync.md) | 圖卡 (Tooltip) 數值隨播放進度實時跳動與動態診斷重算 | `ready-for-agent` | `SmartMoneyBubbleChart.tsx` |
| [#03](issues/03-institutional-synergy-tug-of-war-model.md) | 專業券商土洋對作/土洋合買共振態識別與集中度優化 | `ready-for-agent` | `smartMoneyEngine.ts` / `types/stock.ts` |
