# 03 — 座標映射統一、Y 軸分母保護與時序「象限躍遷 (Quadrant Crossover)」轉折捕捉

**Parent:** #418 (Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格)

**What to build:**
升級 `smartMoneyEngine.ts` 核心量化坐標與轉折捕捉演算法：
1. 導出純函式 `mapToAxisCoordinate(val, maxAbs, power = 0.7)`，將當日主座標與歷史 `trail` 軌跡座標統一為相同的非線性冪次映射，消除除以 `2500` 造成的座標跳躍。
2. Y 軸分母 `maxAbsShares` 計算時排除 ETF（或設定 `15,000` 張保護上限），釋放中小型普通股在 Y 軸的垂直動態範圍。
3. 實作 `detectQuadrantCrossover` 轉折捕捉：比對 $T-1 \to T$ 象限變化，標註 `🚀 潛伏點火首日 (ACCUMULATION ➔ BREAKOUT)`、`🎣 回檔續買`、`🚨 轉入派發首日` 與 `💣 轉入棄守首日`。

**Blocked by:** 02 — 物理碰撞排斥演算法校準、半徑感知中軸邊界與 Stale Reference 修復

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 主泡泡座標與 `trail` 歷史軌跡節點座標縮放尺度完全對齊，無邊界硬頂死在 `±75` 的異常。
- [ ] 模擬單日買超 150,000 張之 ETF 存在時，一般個股（買超 500 張）仍具備正常 Y 軸座標展延。
- [ ] 正確辨識並輸出 `QuadrantCrossoverType` 轉折標籤，並在 `smartMoneyEngine.test.ts` 補齊單元測試。

