# Issue #03: 全市場模式美股 Top 30 焦點清單與跨市場切換支援

## 狀態
`ready-for-agent`

## 說明
在 `ChipsWorkspace.tsx` 的全市場模式中，當市場過濾切換為美股（US）時，載入美股核心代表性焦點 Top 30（含 NVDA, AAPL, MSFT, TSLA, AMZN, GOOGL, META, AMD, AVGO, QQQ, SPY 等），計算動能與 CMF，展現美股聰明錢星圖。

## 驗收標準
1. 全市場模式支援【全部】、【台股】、【美股】市場篩選。
2. 切換至美股時，能看到 30 檔美股權值與科技巨頭的四象限分佈。
