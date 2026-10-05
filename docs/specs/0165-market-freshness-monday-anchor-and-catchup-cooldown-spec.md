# 規格書 0165：市場新鮮度週一定錨修復與追趕回補冷卻防線 (Market Freshness Monday Anchor Fix and Catchup Cooldown Spec)

## Problem Statement

在 Vite 開發環境下，終端機出現每隔約 40 秒無限重複執行 `[MarketCatchup] 偵測到本機資料庫過期，啟動背景追趕回補...` 的死循環。經第一性原理與行為日誌溯源，確認由以下兩大缺陷所致：
1. **週一盤前/盤中定錨交易日回推缺陷 (Monday Non-Trading Day Boundary Bug)**：
   在 `scripts/market-sync/market-freshness-service.cjs` 中，`getMarketAnchorDate` 對平日未達盤後結算時間（台股 15:00、美股 17:00）的場景，直接無條件 `target.setDate(target.getDate() - 1)`。當時間處於週一開盤前或盤中時，減 1 天會回退至**週日（非交易日）**。由於日 K 資料庫在週末非交易日絕不可能有數據（最新僅到上週五），導致系統在週一永遠判定資料庫落後過期 (`isStale: true`)。
2. **背景追趕回補缺乏冷卻時間防線 (Missing Catchup Cooldown / Debounce Gate)**：
   在 `scripts/market-sync/vite-market-middleware.cjs` 中，`triggerCatchupTask` 僅依賴 `isCatchingUp` 布林旗標。當耗時約 40 秒的全市場歷史回補執行完畢並釋放旗標後，前端組件（如 `useMarketCatchupSync`）收到完成通知或使用者切換分頁，再次向 `/api/market/sync-status?catchup=true` 查詢。由於定錨計算依然落入「過期」，中介層在毫無冷卻時間限制下立即再次觸發全市場回補，造成 CPU 與磁碟 I/O 持續處於高負載死循環。

## Solution

1. **修正交易日定錨演算法 (`market-freshness-service.cjs`)**：
   - 在未達盤後結算時間回推前一交易日時，新增星期判定：若當前為週一（`day === 1`），應回退 3 天至上週五（`target.setDate(target.getDate() - 3)`）；其餘平日（週二至週五）保持回退 1 天。
   - 確保台股（TW）與美股（US）之預期錨定日期（`anchorDate`）在週一盤前與盤中皆正確指向上週五。
2. **引入追趕回補冷卻保護機制 (`vite-market-middleware.cjs`)**：
   - 在 `triggerCatchupTask` 內增加基於 `lastCatchupTime` 的最低冷卻時間（預設 10 分鐘，`CATCHUP_COOLDOWN_MS = 10 * 60 * 1000`）。
   - 若距離上次回補完成或啟動未滿冷卻時間，即使市場資料判定過期，亦防禦性略過回補觸發，杜絕任何條件下的高頻重複回補。
3. **完善測試保護網 (`marketFreshnessService.test.ts` & `viteMarketMiddleware.test.ts`)**：
   - 補齊台股與美股在「週一盤前」、「週一盤中」定錨日退至「上週五」之邊界單元測試。
   - 驗證中介層在冷卻時間內重複收到 `catchup=true` 請求時不重複觸發背景回補任務。

## User Stories

1. As a developer running `npm run dev` on a Monday morning, I want the system to recognize that last Friday is the latest settled trading day, so that my local database is not erroneously marked as stale.
2. As a user operating the app during trading hours, I want the market catchup task to have a cooldown period, so that my machine is not pinned at 100% disk and CPU usage due to runaway background syncs.
3. As a test engineer, I want deterministic tests verifying Monday market anchor transitions for both TW and US markets, so that regressions on non-trading day boundaries are permanently prevented.
4. As an API consumer using `useMarketCatchupSync`, I want `/api/market/sync-status` to return stable and accurate `isStale` status without flipping into infinite reload loops.

## Implementation Decisions

1. **交易日定錨修正邏輯 (Monday Anchor Date Logic)**:
   - 取得基準時間對應時區之本地星期（`day = local.getDay()`）：
     - `0` (週日): 退 2 天至週五。
     - `6` (週六): 退 1 天至週五。
     - `1` (週一) 且未達結算時間: 退 3 天至上週五。
     - 其餘平日（週二至週五）且未達結算時間: 退 1 天至前一交易日。
   - 適用於台股與美股，保持簡潔無副作用的純函數設計。
2. **冷卻保護門檻 (Cooldown Guard)**:
   - 定義 `CATCHUP_COOLDOWN_MS = 10 * 60 * 1000`（10 分鐘）。
   - 在 `triggerCatchupTask` 中：若 `Date.now() - lastCatchupTime < CATCHUP_COOLDOWN_MS`，印出防護提示日誌並直接 `return`。
3. **零破壞性與向下相容**:
   - `/api/market/sync-status` 回傳的 JSON 結構、前端 Hook 契約 100% 不變。

## Testing Decisions

- **好測試的標準**: 僅透過公開介面驗證外部行為，不依賴模組私有變數或內部實作細節。
- **測試縫隙 (Test Seam)**:
  - **Seam 1 (核心領域縫隙 - `marketFreshnessService.test.ts`)**:
    - 驗證台股週一 10:00 台北時間回傳上週五日期。
    - 驗證美股週一 12:00 紐約時間回傳上週五日期。
    - 驗證週一盤後（如 15:30）正常回傳週一當日。
  - **Seam 2 (冷卻保護整合縫隙 - `viteMarketMiddleware.test.ts`)**:
    - 驗證中介層在冷卻時間內不重複觸發回補任務。

## Out of Scope

- 引入複雜的跨國休市假期行事曆庫（保持 KISS 原則，休市情況由既有資料庫最新交易日自適應覆蓋）。
- 修改前端 `useMarketCatchupSync.ts` 的請求邏輯或 UI 呈現。
