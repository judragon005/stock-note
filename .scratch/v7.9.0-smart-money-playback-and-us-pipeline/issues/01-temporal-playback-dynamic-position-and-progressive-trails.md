# Issue #01: 時序播放泡泡動態坐標響應與漸進式彗星尾巴切片

## 狀態
`ready-for-agent`

## 說明
修復 `SmartMoneyBubbleChart.tsx` 中泡泡渲染硬性鎖死在最後一天的問題。依據 `currentDateIndex` 讀取 `b.trail[currentDateIndex]` 的時序坐標，並將彗星尾巴切片為 `0..currentDateIndex`。

## 驗收標準
1. 當 `currentDateIndex` 變化時，泡泡 $(cx, cy)$ 實質改變。
2. 彗星尾巴長度隨日期進度逐點延伸，第 0 日不顯示尾巴，之後逐日伸長。
3. 加入平滑 CSS 動畫，播放時有流暢運動感。
