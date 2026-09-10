# 07 — 穿透式總曝險遞歸加權聚合演算法 (Look-Through Exposure Aggregator)

**What to build:**
實作核心純函數聚合引擎 `calculateLookThroughExposure(...)`。接收使用者所有活躍持倉 `HoldingPosition[]` 與當前 USD/TWD 匯率，逐檔解構持倉：若為一般個股，計入其 `directMarketValue`；若為收錄之 ETF，將其市值按成分股權重拆解分配至各底層公司之 `indirectMarketValue`，並記錄來源 ETF 與貢獻金額。最後計算出整戶對各公司的「實質總曝險金額」與佔「整戶 NAV 之穿透百分比」。未收錄 ETF 優雅保留為獨立標的。

**Blocked by:** 
- 04 — 無損審計調整單分錄生成與會計相容機制 (Non-Destructive ADJUSTMENT Trade Entry)
- 06 — 台美核心主流 ETF 權重種子庫與型別模型 (ETF Holdings Seed Registry & Schema)

**Status:** ready-for-agent

- [ ] 正確計算直接買進台積電與透過 0050、006208、00923 間接持有的穿透總和
- [ ] 支援跨市場美股 ETF (如 VT, SPY) 之美元折算台幣市值穿透計算
- [ ] 輸出 `LookThroughExposure[]`，按實質總曝險由大至小排序
- [ ] 單元測試於 `src/engine/lookThroughEngine.test.ts` 驗證多 ETF 重疊持股之數學加權精確度
