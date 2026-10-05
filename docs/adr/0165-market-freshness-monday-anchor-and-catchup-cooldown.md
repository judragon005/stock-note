# ADR 0165：市場新鮮度週一定錨修復與追趕回補冷卻防線架構決策 (Market Freshness Monday Anchor Fix and Catchup Cooldown)

## 狀態 (Status)

已接受 (Accepted) - 2026-10-05

## 背景與問題脈絡 (Context & Problem Statement)

在 Vite 開發環境下，終端機出現每隔約 40 秒無限重複執行 `[MarketCatchup] 偵測到本機資料庫過期，啟動背景追趕回補...` 的死循環。經行為日誌溯源與第一性原理剖析，確認由以下兩大缺陷所致：
1. **週一定錨非交易日回退缺陷**：`scripts/market-sync/market-freshness-service.cjs` 的 `getMarketAnchorDate` 在未達盤後結算時間時無條件回退 1 天。當遇到週一開盤前或盤中時，減 1 天會退至**週日（非交易日）**。由於日 K 資料庫在週末非交易日絕不可能有數據（最新僅到上週五），導致系統在週一永遠判定資料庫落後過期 (`isStale: true`)。
2. **缺乏冷卻時間防線**：`scripts/market-sync/vite-market-middleware.cjs` 的 `triggerCatchupTask` 僅依賴 `isCatchingUp` 布林鎖。回補跑完後狀態解除，前端組件重查 `/api/market/sync-status?catchup=true`，又立即重新觸發 40 秒全市場回補，陷入無窮迴圈。

## 決策內容 (Decision Drivers & Outcomes)

1. **修正交易日定錨演算法 (`market-freshness-service.cjs`)**：
   - 在未達盤後結算時間時，若當前基準日為週一（`day === 1`），明確回退 3 天至上週五（`target.setDate(target.getDate() - 3)`）。
   - 其餘平日（週二至週五）保持回退 1 天至前一交易日。
   - 同步適用於台股（TW）與美股（US）。
2. **引入追趕回補冷卻保護機制 (`vite-market-middleware.cjs`)**：
   - 定義全域冷卻時間 `CATCHUP_COOLDOWN_MS = 10 * 60 * 1000`（10 分鐘）。
   - 封裝純判定函數 `isCatchupInCooldown(lastTime, now, cooldownMs)`，供單元測試獨立檢驗各時間邊界。
   - 在 `triggerCatchupTask` 檢查距離上次執行未滿冷卻期時，防禦性跳過回補並印出提示日誌，徹底終結重複觸發死循環。
3. **零破壞性與向下相容**：
   - 前端 API 契約、回傳結構與 Hook 100% 維持原樣，無任何破壞性變更。

## 測試與驗收結果 (Validation)

- **單元測試 (Vitest)**：`src/engine/marketFreshnessService.test.ts` 與 `src/engine/viteMarketMiddleware.test.ts` 新增測試案例，包含週一盤前、盤中、盤後與 10 分鐘冷卻邊界測試，全案 179 個測試檔案、1386 個測試案例 100% 綠燈通過。
- **建置驗證 (Build)**：`npm run build` 成功完成，TypeScript 0 錯誤。
