# 07 — 在倉持股瀕臨破防雙重預警與大盤 Regime 真接通

**What to build:**
1. 在工作區調用 `omniIndicatorEngine.evaluateMarketRegime`，真正接通大盤空頭自適應門檻（大盤偏空時門檻提高至 3.0R 且非極強 RS 禁止進場），不再讓防線懸空失效。
2. `ActionDirectivesHUD.tsx` 在庫持股警戒升級為雙重過濾：收錄「已破防 (`currentPrice < defensePrice`)」與「瀕臨破防 (`bufferPercent <= 1.5%`)」，消除持股只剩 0.5% 緩衝卻顯示全數守穩的假安全感。

**Blocked by:** 06 — 均線扣抵表分頁器與單卡 React.memo 級聯隔離

**Status:** ready-for-agent

- [x] 工作區調用大盤歷史數據並傳入 `marketRegime`
- [x] HUD 在庫警戒加入「瀕臨破防 (Buffer ≤ 1.5%)」判定與橘紅警示
- [x] 單元測試驗證大盤空頭門檻提高與持股雙重預警
