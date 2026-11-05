# 04 — ETF 造市套利隔離、投量比與連續買賣超 (Streak) 聚合引擎

**Parent:** #418 (Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格)

**What to build:**
升級 `src/engine/chipsAggregator.ts`：
1. 擴充 `aggregateMultiDayChips`：計算外資與投信連續買賣超天數 (`foreignStreak` / `trustStreak`)，正數為連買、負數為連賣。
2. 結合真實成交張數 (`volumeLots`) 計算真實「投量比 (`trustToVolumeRatio` = trustNetShares / volumeLots * 100)」與「法人買賣超金額 (`netFlowAmountTwd`)」。
3. 升級 `getTopMomentumSymbols`：預設篩選普通個股 (`!isEtfSymbol`)，支援 `excludeEtf` 參數，並在美股市場切換為美股機構 CMF 吸籌/派發排行。

**Blocked by:** 01 — 後端本機 SQLite 湖倉雙市場完整快照端點與單邊殘缺日防禦

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 5 日內連買 4 天但最後一天倒貨的標的，正確輸出 `trustStreak = -1`，真實反映轉折。
- [ ] 「投量比」計算嚴格使用成交「張數」，無 1000 倍縮放錯誤。
- [ ] `getTopMomentumSymbols` 在台股預設不含高股息/債券 ETF，在美股模式正常返回美股焦點排行。
- [ ] 於 `src/engine/chipsAggregator.test.ts` 新增並通過完整測試。

