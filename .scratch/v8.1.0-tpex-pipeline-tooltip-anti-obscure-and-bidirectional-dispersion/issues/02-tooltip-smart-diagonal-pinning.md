# Issue #02: Tooltip 象限對角智慧避讓演算法 (Smart Diagonal Pinning)

## 狀態

eady-for-agent

## 說明
1. 依據 ctiveBubble 的畫布坐標動態決定浮窗停靠角落：
   - 當泡泡在左側 ( < \text{midX}$) 時停靠至右側；在下側 ( > \text{midY}$) 時停靠至上方或對角。
2. 確保被懸浮或選中的泡泡 100% 露出，杜絕自己擋住自己。
