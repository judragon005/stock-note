# v8.25.0 交接手冊：肌肉書僮真實日 K 受控並發增量回補與本地持久化加速架構 (HANDOFF)

## 1. 本次迭代完成摘要 (Executive Summary)

- **核心目標**：
  1. 徹底修復肌肉書僮在非自訂清單池（如台股市值 50、美股 50、在籍持股）中，因硬編碼限制而從未發起日 K 回補、導致畫面永久卡在「🟡 回補中...」的嚴重缺陷。
  2. 將全量歷史抓取（`period1=0`）重構為短期增量區間請求（本地已有則僅補「最後日期 - 7 天」，本地為空則抓 180 天），體積縮小 90% 以上，下載耗時由 2~3 秒壓至 150~200ms。
  3. 導入受控並行回補隊列（Concurrency = 3，間隔 60ms 節流），每完成一檔即時寫入 IndexedDB 與畫面，實現流水般平滑更新。
  4. 頂部提供「日 K 本地快取狀態與動態進度條」，透明化呈現就緒百分比並支援「🔄 增量同步最新收盤」。
- **成果數據**：
  - 全專案 57 個測試套件、649 個單元測試 100% 綠燈通過。
  - `npm run build` TypeScript 型別檢查 0 錯誤，生產環境打包構建成功。

---

## 2. 關鍵架構與代碼變更清單 (File Changes)

1. **`src/engine/historicalOhlcvBackfill.ts`**：
   - 匯出 `calculateIncrementalPeriod1(existingCandles, nowSec)`：本地已有日 K 時往回推算 7 天緩衝，本地為空預設 180 天。
   - `backfillSymbolOhlcvAndIndicators` 導入增量 `period1`，並將合併結果自動持久化至 IndexedDB。
2. **`src/components/MuscleBookerWorkspace.tsx`**：
   - 移除 `selectedPool === 'CUSTOM_WATCHLIST'` 之單一目標池限制，讓所有池均能自動受控並發回補。
   - 新增 `syncState` 與並行佇列（Concurrency = 3，間隔 60ms），完成一檔即時更新 `cachedCandlesMap`。
   - 頂部新增「日 K 本地快取狀態與動態進度條」UI，支援手動觸發 `handleTriggerManualSync`。
3. **`src/engine/historicalOhlcvBackfill.test.ts` & `src/components/MuscleBookerWorkspace.test.ts`**：
   - 補齊 `calculateIncrementalPeriod1` 各種情境測試。
   - 補齊本地快取就緒百分比運算測試。

---

## 3. 測試與驗證指標 (Verification & TDD)

- 單元測試指令：`npm test`（57 passed, 649 passed, 0 failed）
- 打包構建指令：`npm run build`（tsc 0 錯誤，Vite build 成功）

---

## 4. 關聯文檔

- 規格書：[`docs/specs/0106-muscle-booker-incremental-backfill-and-local-cache-spec.md`](docs/specs/0106-muscle-booker-incremental-backfill-and-local-cache-spec.md)
- 架構決策：[`docs/adr/0106-muscle-booker-incremental-backfill-and-local-cache.md`](docs/adr/0106-muscle-booker-incremental-backfill-and-local-cache.md)
- 本地票券：[`.scratch/v8.25.0-muscle-booker-incremental-backfill-and-local-cache/issues/`](.scratch/v8.25.0-muscle-booker-incremental-backfill-and-local-cache/issues/)
