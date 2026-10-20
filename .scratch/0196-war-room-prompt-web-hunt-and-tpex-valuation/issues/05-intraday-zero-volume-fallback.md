# 05 — 盤中即時量價一致性回退防禦

**What to build:**
修正盤中即時成交量為 0 時輸出 `<volume_shares>0</volume_shares>` 導致外部 AI 產生「現價暴跌但成交量 0 張」之量價衝突假警報。當判定為盤中且無量時，自動回退標註前一交易日收盤量。

**Blocked by:** 04 — 籌碼均量比例尺計算與「待同步」語義誠實化

**Status:** ready-for-agent

- [ ] 在 `src/engine/aiForcePromptAdapter.ts` 與 `src/engine/strategicPromptEngine.ts` 偵測 `settlementStatus === 'INTRADAY_UNSETTLED'` 且 `volumeShares <= 0`。
- [ ] 輸出為 `盤中撮合中 (前一交易日收盤量: ${lastSettledVolume} 張)`。
- [ ] 撰寫單元測試驗證盤中無量情境下，Prompt 內絕不出現 0 張成交量的誤導標籤。
