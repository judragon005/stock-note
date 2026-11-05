# 02 — 物理碰撞排斥演算法校準、半徑感知中軸邊界與 Stale Reference 修復

**Parent:** #418 (Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格)

**What to build:**
修復 `smartMoneyEngine.ts` 之 `resolveBubbleCollisions` 與 `SmartMoneyBubbleChart.tsx` 狀態參考：
1. 重疊推斥力計算改用未擾動之真實圓心距 `rawDist`，消除因覆寫 `dx, dy` 導致虛擬 `dist` 暴增吃掉推斥力的缺陷。
2. 象限中軸鎖定邊界加上半徑保護 `midX ± (radius + 2)` 與 `midY ± (radius + 2)`，徹底根除半徑達 36px 之大球跨象限穿透現象。
3. `SmartMoneyBubbleChart` 將 `selectedBubble` state 重構為 `selectedSymbol: string | null`，每次 render 從當前影格動態查找最新泡泡資料，解決時序回放浮窗 Stale Reference 與播放計時器閉包重建問題。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 兩顆重疊泡泡在 8 輪迭代內穩定排斥開來，排斥後距離 `dist >= r1 + r2`。
- [ ] 即使單一象限塞入 25 顆泡泡，所有球體邊緣（`cx ± radius`, `cy ± radius`）皆不穿透 X=0 與 Y=0 十字中軸線。
- [ ] 時序自動播放時，釘住的 Tooltip 浮窗資料與座標即時隨當前影格連動更新，無舊參考殘留。
- [ ] 既有 `smartMoneyEngine.test.ts` 與 `SmartMoneyBubbleChart.test.ts` 相關測試 100% 綠燈通過。

