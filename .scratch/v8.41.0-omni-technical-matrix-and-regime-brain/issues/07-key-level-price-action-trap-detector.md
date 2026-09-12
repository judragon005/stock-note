# 07 — Key Level Price Action Trap Detector (Bull/Bear Traps)

**What to build:** 
實作關鍵點位價格行為偵測 `detectPriceActionTraps`。當最新 K 線位於壓力區間且出現長上影線（上影線長度 > 實體長度 2 倍），或盤中創高但收盤跌回壓力線下方時，判定為「箱頂誘多假突破 (Bull Trap)」，觸發 `ALERT_BULL_TRAP`；支撐區長下影線判定為假跌破破底翻。

**Blocked by:** 05 — Key Level Proximity Clustering Algorithm

**Status:** ready-for-agent

- [x] 型別定義新增 `PriceActionTrapResult`
- [x] 實作燭線實體、上影線、下影線與壓力帶交集的誘多假突破偵測邏輯
- [x] 單元測試驗證箱頂長上影線墓碑線精確標記 Bull Trap 警訊
