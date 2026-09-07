# Issue #02: 2D 圓形幾何排斥純函數演算法與象限守恆守門員

## 狀態
`ready-for-agent`

## 說明
於 `smartMoneyEngine.ts` 實作純函數 `resolveBubbleCollisions`，以 6 輪物理放鬆迭代推開半徑重疊的泡泡，同時加入象限中軸鎖定約束，防止泡泡跨越 $X=0$ 與 $Y=0$。

## 驗收條件 (Acceptance Criteria)
1. 導出函數 `resolveBubbleCollisions(bubbles, width, height, padding)`。
2. 當兩個半徑為 $r_1, r_2$ 的泡泡距離小於 $r_1 + r_2 + 6$ 時，沿連心線方向平滑推開。
3. **象限守恆**：推開過程嚴格受限於原始象限範圍內（例如原本 $cx > \text{midX}$，推開後絕不可變為 $cx \le \text{midX}$）。
4. **畫布邊界安全**：泡泡邊緣不會被擠出 `[padding, width - padding]` 與 `[padding, height - padding]` 之外。
5. 單元測試 100% 覆蓋。
