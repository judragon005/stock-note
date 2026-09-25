# 08 — 成交量價位分佈 (Volume Profile) 演算法引擎

**What to build:**
實作 Volume Profile 純計算引擎：將歷史 K 線與成交量依據價格區間桶（Price Bins）進行量能累積，計算壓力區、大量成交區、密集成交區、橫平區、支撐區的價格範圍與百分比佔比。

**Blocked by:**
01 — 核心型態定義與工作區導航註冊

**Status:** completed

- [x] 將最高價與最低價自適應切割為 N 個價格桶
- [x] 將成交量加權累積並識別出 Point of Control (POC) 與各特徵區間
- [x] 各區間百分比總和守恆為 100%
- [x] 單元測試覆蓋極端均一價格、單一巨量等邊界情況
