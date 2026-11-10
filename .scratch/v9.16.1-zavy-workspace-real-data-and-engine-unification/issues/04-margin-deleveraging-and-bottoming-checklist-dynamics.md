# 04 — 台股融資去槓桿殘缺日過濾、0050 大盤回撤 Fallback 與動態布林/利空鈍化檢核

**Parent:** [#478](https://github.com/judragon005/stock-note/issues/478)

**What to build:**
後端在計算近 60 日融資去槓桿比率時，自動過濾掉未同步完整之殘缺交易日（`HAVING COUNT(margin_balance) >= 1500`），並在無 `^TWII` 時自動以代表性指數 ETF `0050`（美股為 `SPY`）日 K 計算大盤波段最大回撤；同時基於該大盤日 K 動態計算 60D/200D 布林通道下軌位階與「近 5 日最低價未再破近 20 日低點」之利空鈍化標記，隨 `/api/market/breadth` 端點一併回傳，徹底消滅落底核對表的寫死常數。

**Blocked by:** [#481](https://github.com/judragon005/stock-note/issues/481) (Ticket 03)

**Status:** ready-for-agent

- [ ] 在 `scripts/market-sync/sqlite-db-core.cjs` 的融資餘額聚合查詢中加上 `HAVING COUNT(margin_balance) >= 1500`（若總筆數較少環境則 fallback 至無 HAVING 限制），排除未同步完整上市股票之殘缺日，消除 `-81.2%` 假減幅
- [ ] 大盤近 60 日最高點與回撤計算優先查詢 `^TWII`，若查無資料則自動 Fallback 查詢資料庫內有完整日 K 的 `0050`（美股使用 `SPY`），真實計算大盤波段回撤百分比
- [ ] 基於大盤日 K 收盤價序列，動態計算 60MA/200MA 布林通道下軌（`MA - 2 × SD`），當最新價格 `<= middleBand` 且接近或跌破 `lowerBand` 時標記 `isAtBollingerLowerBand: true`
- [ ] 檢核近 5 日大盤最低價是否未跌破前 20 日波段最低價，動態計算 `isBadNewsDivergenceObserved`（利空鈍化不破底）
- [ ] 將真實的 `taiexMaxDrawdown`、`marginReductionPercent`、`marginDeleveragingRatio`、`isAtBollingerLowerBand` 與 `isBadNewsDivergenceObserved` 納入 `/api/market/breadth` 回傳 JSON
- [ ] 編寫單元測試驗證殘缺融資日過濾、`0050` 回撤計算與布林/利空鈍化演算法之正確性

