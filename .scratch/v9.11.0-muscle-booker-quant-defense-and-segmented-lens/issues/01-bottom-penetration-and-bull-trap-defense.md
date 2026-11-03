# 01 — 破底翻基準校正為箱底與墓碑倒錘假突破一票否決

**What to build:**
1. 校正 `isBottomPenetrationRebound` 破底翻之判定基準：必須為跌破達瓦斯箱底 `boxLower`（`current.low < boxLower` 且 `current.close >= boxLower`），且當天下影線佔實質振幅 ≥ 50%，方確立為破底翻洗盤買點；絕不可將常態回踩 MA20 誤判為破底翻。
2. 突破當日調用 `detectPriceActionTraps`，一旦偵測到上影線長度 > 實體 1.5 倍之墓碑倒錘線 (Bull Trap / 射擊之星)，強制一票否決買進（輸出 `AVOID` 墓碑誘多警告），保全本金避免追高被倒貨。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] `darvasBoxEngine.ts` 內破底翻判定基準校正為 `boxLower`，並補足單元測試
- [x] `muscleBookerEngine.ts` 內突破邏輯引入 `detectPriceActionTraps` 檢驗墓碑倒錘線
- [x] 單元測試驗證墓碑線出現時 100% 阻斷買進輸出 AVOID
- [x] 單元測試驗證回踩 MA20 絕不觸發破底翻
