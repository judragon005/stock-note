# 05 — 前端三級瀑布流真實資料管線與 100% Zero-Mock 假資料清洗

**Parent:** #418 (Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格)

**What to build:**
重構 `smartMoneyFetcher.ts` 與 `ChipsWorkspace.tsx` 資料載入層：
1. 實作三級瀑布流：優先從 `/api/market/chips-snapshot` 讀取 SQLite 快照，次選靜態 `tw_market_summary.json` + IndexedDB，最後線上 API 兜底。
2. 徹底移除 `ChipsWorkspace.tsx` 的假數據公式：`idx % 4 === 1` 人工背離、`estPrice = 100`、`factor * (idx % 2 === 0 ? 0.3 : -0.2)` 假軌跡與 `2026-08` 假 K 線。
3. 空持倉 (`holdings = []`) 初始化時自動切換至 `MARKET` 視圖，消滅空畫布盲區。
4. 保持既有 Fetcher 單元測試中傳入 `mockFetch` 時的路徑 100% 向下相容。

**Blocked by:** 01 — 後端本機 SQLite 湖倉雙市場完整快照端點與單邊殘缺日防禦, 04 — ETF 造市套利隔離、投量比與連續買賣超 (Streak) 聚合引擎

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 本地開發模式下，全市場 Top 30 標的 100% 來自真實 SQLite 收盤價與漲跌幅。
- [ ] 歷史 5 日軌跡節點 100% 對齊真實歷史日 K 漲跌幅，無隨機或奇偶日微擾動。
- [ ] 新用戶無持倉打開籌碼星圖時，自動展示全市場法人焦點，無白畫面或全空泡泡。
- [ ] 既有 `smartMoneyFetcher.test.ts` 與 `ChipsWorkspace.test.ts` 100% 綠燈通過。

