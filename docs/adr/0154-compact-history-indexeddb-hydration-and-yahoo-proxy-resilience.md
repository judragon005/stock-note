# ADR 0154: 全市場歷史日 K 本地緊湊快取注入 IndexedDB 與 Yahoo 代理防限流降級架構 (Spec 0154)

- **狀態**：`ACCEPTED`
- **日期**：2026-09-30
- **決策者**：judragon005, Antigravity Agent
- **關聯規格**：[SPEC-0154](../specs/0154-compact-history-indexeddb-hydration-and-yahoo-proxy-resilience-spec.md)
- **關聯 Issue**：[Issue #136](https://github.com/judragon005/stock-note/issues/136)

---

## 背景與問題意識 (Context)

在「AI 主力戰情室」淘汰硬編碼價格偽造 (SPEC-0152) 之後，系統回歸 100% 真實數據渲染。但在實際盤中實測時，面臨外部 API 限流與本地歷史數據斷鏈的雙重挑戰：

1. **外部 Yahoo Finance API 遭遇 HTTP 429 限流**：透過 Vite 本地代理請求 Yahoo Chart API 時，由於缺少標準瀏覽器請求標頭或被邊緣伺服器頻率控管，全面回傳 429，導致日 K 即時拉取中斷。
2. **本地 17.5 MB 緊湊歷史日 K 數列斷鏈**：專案公開目錄在 V8.48.0 (Spec 0134) 即已備妥覆蓋 2,356 檔標的歷史日 K 的 `public/market-cache/tw_market_ohlcv_compact.json`，但前端僅載入單日收盤價，未將歷史長日 K 注入瀏覽器 IndexedDB，造成 Yahoo 429 失敗時無本地快取可供降級。
3. **無效代碼筆誤缺乏指引**：使用者誤輸入不存在之代碼（如 `004EA`）時，系統籠統顯示數據串接中，缺乏友善防呆提示。

---

## 決策內容 (Decisions)

1. **本地緊湊歷史日 K 按需加載與單例快取 (On-Demand Compact History Hydration)**：
   - 於 `marketCacheLoader.ts` 實現 `loadSymbolCompactHistory(symbol)`，按需從 `tw_market_ohlcv_compact.json` 解析指定個股並轉為標準 `DailyCandle[]`。
   - 內部建立模組級單例 Promise 快取，避免同一 Session 內重複發送 HTTP 請求與重複反序列化 17.5 MB 大型 JSON。
   - 若讀取失敗自動重置快取，支援後續自癒重試。
2. **歷史數列與每日盤後總表增量無縫合流 (History + Daily Summary Fusion)**：
   - 於 `historicalOhlcvBackfill.ts` 升級降級管線：當 Yahoo Finance 回傳 429 且 IndexedDB 根數 < 5 時，自動提取本地 compact 歷史日 K 與每日 16:00 盤後更新之 `tw_market_summary.json` 最新收盤價，透過 `mergeDailyCandles` 去重升冪合併，重新計算技術指標並持久化至 IndexedDB。
3. **Vite 代理層防護與 Fast-Fail (Vite Proxy Header Hardening)**：
   - 在 `vite.config.ts` 中為 `/api/yahoo` 配置合規之桌面 Chrome `User-Agent` 與 `Referer`。
   - 遇到 429 狀態碼時立即 Fast-Fail，迅速切換至本地資料庫，杜絕介面長時間阻塞。
4. **無效代碼診斷與精確 Empty State 提示**：
   - 在 `AiForceDashboardView.tsx` 中增加代碼有效性核對：若標的無日 K 且查無官方名稱（如 `004EA`），精確提示使用者「⚠️ 查無此台股標的代碼，請確認代碼是否輸入正確（如 00403A、2330）」。

---

## 決策後果 (Consequences)

### 正面效益 (Positive)
- **高可用零斷鏈**：即使外部 Yahoo API 全面掛掉或 429 限流，使用者查詢 `00403A`、`2330` 或 `0050` 等 2,356 檔台股時，主 K 線、18 張 Bento 卡片與「任務五：原始資料表」仍能 100% 透過本機歷史資料庫正常呈現。
- **極致效能與輕量**：採用按需隨選讀取，首頁啟動時完全不佔用 17.5 MB 記憶體。
- **資訊透明與新手友好**：清楚標記「本地盤後歷史資料庫」，筆誤時給予具體代碼確認提示，徹底消除猜忌。

### 潛在限制與權衡 (Trade-offs)
- 本地緊湊快取資料庫依賴 `scripts/market-sync/backfill-local-csv.cjs` 或每日盤後同步更新；若有全新上櫃掛牌公司且尚未納入 compact 資料庫，則需依賴外部 API 正常連線。
