# 06 — 前端 ZavySlowWealthWorkspace 全量假數據拔除、誠實空狀態與端到端驗收

**Parent:** [#478](https://github.com/judragon005/stock-note/issues/478)

**What to build:**
在 `App.tsx` 與 `ZavySlowWealthWorkspace.tsx` 中完整連通 `/api/market/macro`、`/api/market/breadth`、真實美元匯率與質押借貸帳本；徹底拔除 `51.5 / 53.8 / 1.31` 等前端寫死常數，無資料或連線異常時誠實顯示 `-- (尚無資料)`；確保三個鏡頭與 10 秒彈窗之數據 100% 來自本地 SQLite 與免費免 Key API，通過 `npm test` 與 `npm run build` 驗收。

**Blocked by:** [#483](https://github.com/judragon005/stock-note/issues/483) (Ticket 05)

**Status:** ready-for-agent

- [ ] 在 `App.tsx` 中將真實的 `usdToTwdRate`、`loans`（質押借貸帳本）、`receivableDividends` 傳入 `ZavySlowWealthWorkspace`
- [ ] 在 `ZavySlowWealthWorkspace.tsx` 中徹底拔除 `macroSnapshot` 與 `marginStatus` 的寫死初始數字，改為從 `/api/market/macro` 與 `/api/market/breadth` 真實更新
- [ ] 支援 `marginStatus` 動態接收後端真實回傳的大盤回撤、融資減幅與去槓桿比率，消除前端死碼
- [ ] 將後端回傳的動態布林通道下軌與利空鈍化標記注入 `generateZavyAnalysisReport`
- [ ] 在 `ZavyMacroCompassCard.tsx`、`ZavyMarketBreadthCard.tsx` 與 `ZavyDualTrackDecisionCard.tsx` 中處理空值誠實展示（`--`），絕不私下假造預設數字
- [ ] 執行全量 `npm test`（100% 通過）與 `npm run build`（TypeScript 0 錯誤）端到端驗收

