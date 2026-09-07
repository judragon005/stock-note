# v7.9.0 籌碼時序動態播放修正、美股 CMF 日 K 管線連接與本地歷史籌碼增量儲存系統

本目錄為 PRD #0079 之本機票券鏡像，依據 Matt Pocock `/to-tickets` 規範進行任務拆解。

## 🎯 核心目標

1. 修復時序播放器「假跑」Bug：時間軸推進時，泡泡實體坐標即時響應 `currentDateIndex` 產生真實位移，彗星尾巴漸進展開。
2. 修復美股 CMF 計算斷鏈 Bug：在庫美股載入 30 日歷史 K 棒計算真實 CMF，消除 Y=0 死線。
3. 全市場焦點模式支援美股 Top 30 核心巨頭。
4. 建立本地 IndexedDB 歷史籌碼增量快取庫（以時間換資料，100% 免費）。

## 📋 任務清單 (Task Breakdown)

| 票券編號 | 標題 | 狀態 | 負責模組 |
| :--- | :--- | :--- | :--- |
| [#0079](issues/0079.md) | [Epic] 籌碼時序播放修復、美股 CMF 打通與本地歷史增量庫 | `completed` | 全模組統籌 |
| [#01](issues/01-temporal-playback-dynamic-position-and-progressive-trails.md) | 時序播放泡泡動態坐標響應與漸進式彗星尾巴切片 | `completed` | `SmartMoneyBubbleChart.tsx` |
| [#02](issues/02-us-stock-cmf-daily-candles-pipeline.md) | 在庫持倉美股日 K 棒自動注入與真實 CMF 資金流計算 | `completed` | `ChipsWorkspace.tsx` / `smartMoneyEngine.ts` |
| [#03](issues/03-us-market-movers-top30-universe.md) | 全市場模式美股 Top 30 焦點清單與跨市場切換支援 | `completed` | `ChipsWorkspace.tsx` |
| [#04](issues/04-local-incremental-chips-storage-engine.md) | 本地 IndexedDB 歷史籌碼增量補齊與持久化快取管線 | `completed` | `smartMoneyFetcher.ts` |
