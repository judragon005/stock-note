# 01 — 後端本機 SQLite 湖倉雙市場完整快照端點與單邊殘缺日防禦

**Parent:** #418 (Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格)

**What to build:**
在 `scripts/market-sync/vite-market-middleware.cjs` 建立 `GET /api/market/chips-snapshot` 端點。
從本機 SQLite 湖倉 (`market_history.db`) 批次撈取最近 5 個完整結算日之價量與籌碼快照：
1. 以 `GROUP BY date HAVING COUNT(*) >= 1500 ORDER BY date DESC LIMIT 5` 自動排除單邊殘缺日（如僅有 TPEx 缺 TWSE 之日期）。
2. 關聯 `daily_candles`，將台股 `volume`（股）除以 1000 換算為成交張數 (`volumeLots`)，並以真實收盤價計算 1D/3D/5D 累計漲跌幅與三大法人買賣超。
3. 同步批次取得美股指定代號與焦點股近 25 根日 K，供前端秒算 20D CMF。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `GET /api/market/chips-snapshot?market=TW&days=5` 於本機 SQLite 返回 `< 30ms` 之近 5 個有效交易日快照。
- [ ] 自動過濾單邊殘缺日，保證上市權值股（如 `2330`）與上櫃龍頭股（如 `8299`）同時具備完整籌碼與日 K。
- [ ] 台股成交量單位嚴格換算為張數 (`volumeLots`)，杜絕股數與張數混淆。
- [ ] 於 `src/engine/viteMarketMiddleware.test.ts` 建立端點單元測試並 100% 綠燈通過。

