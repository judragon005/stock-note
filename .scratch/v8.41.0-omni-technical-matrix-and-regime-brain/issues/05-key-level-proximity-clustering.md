# 05 — Key Level Proximity Clustering Algorithm

**What to build:** 
實作關鍵價位密集聚集演算法 `calculateKeyLevelClusters`。整合 Pivot Points、Fibonacci Levels、Bollinger Bands 與 Darvas Box，將價位相距在 1.5% 誤差內的相鄰點位合併為「密集壓力帶 (Resistance Cluster)」與「密集支撐帶 (Support Cluster)」，標記重疊來源（例如：`箱頂 10.51 + 布林上軌 10.54`）。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 型別定義新增 `PriceCluster`、`ClusterZone` 與 `KeyLevelClusters`
- [x] 實作近鄰聚類演算法，輸出第一壓力帶、次級阻力帶、短線支撐帶與結構底線
- [x] 單元測試驗證相距 0.28% 之箱頂與布林上軌成功聚合為單一 Resistance Cluster
