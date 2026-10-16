# Issue #258 任務細緻拆解 (Micro-Tickets Breakdown)

本任務集對齊 Issue [#258](https://github.com/judragon005/stock-note/issues/258)、[Spec 0184](../../../docs/specs/0184-market-backfill-smart-skip-retry-and-eta-spec.md) 與 [ADR 0184](../../../docs/adr/0184-market-backfill-smart-skip-retry-and-eta.md)，依據**切片原則（Vertical Slice & KISS）** 將台股歷史回補引擎優化細緻拆分為 **6 個獨立可驗收的 Micro-Tickets**，落實 TDD 紅-綠-重構循環。

---

## Ticket 清單總覽

| 票券編號 | 類型 | 模組標題 | 影響範圍 | 驗收標的 | 狀態 |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Ticket 01** | `Core/Calendar` | 盤中時間守衛與交易日曆引擎重用 | `backfill-tw-history-web.cjs` | 15:30 前自動定錨昨日，法定休市日 0 請求排除 | ✅ **已完成** |
| **Ticket 02** | `Core/Filter` | 櫃買 (TPEx) 權證代碼排除與兩市標準對齊 | `backfill-tw-history-web.cjs`<br/>`market-sync-core.cjs` | 排除 6 碼 7 開頭之櫃買權證，收盤行情檔數收斂 | ✅ **已完成** |
| **Ticket 03** | `Core/Network` | 官方端點指數退避重試與單邊缺失隔離 | `market-sync-core.cjs`<br/>`backfill-tw-history-web.cjs` | 共用 `retryFetch`，暫態重試 3 次，單邊缺失列入清單 | ✅ **已完成** |
| **Ticket 04** | `Lakehouse/Cache`| SQLite 雙指標健康快取秒級略過 (Smart Skip) | `backfill-tw-history-web.cjs` | 4 碼股票 ≥ 1800 且籌碼 ≥ 2000 秒級略過，支援 `--force` | ✅ **已完成** |
| **Ticket 05** | `Engine/Obs` | 即時 ETA 預估引擎與終端機日誌分解 | `backfill-full-market-history.cjs`<br/>`backfill-tw-history-web.cjs` | 終端機與全域狀態同步輸出預計剩餘時間與完成時刻 | ✅ **已完成** |
| **Ticket 06** | `UI/UX & Vite` | 前端進度條 ETA 呈現與 Vite Proxy 降噪 | `MarketScheduleHubSection.tsx`<br/>`vite.config.ts` | 進度條顯示 ETA，Vite proxy 攔截連線重置消除紅字 | ✅ **已完成** |


---

## 各 Ticket 細部規格

### Ticket 01: 盤中時間守衛與交易日曆引擎重用
- **目標**：在 `scripts/market-sync/backfill-tw-history-web.cjs` 中拔除手寫的六日判斷，直接重用 `scripts/market-sync/trading-calendar-engine.cjs` 的現成輪子 `isTwTradingDay` 與 `getPreviousTradingDay`。
- **邊界規則**：
  - 起始日定錨：若未傳入 `endDateStr`，取得當前時間 `now`。若今日 `isTwTradingDay(now)` 且本地時間 $\ge 15:30$，起始日為今日；否則起始日自動定錨為 `getPreviousTradingDay(now)`。
  - 候選清單：`while (result.length < daysCount)` 迴圈僅收錄 `isTwTradingDay()` 為真之實質交易日，國定假日與春節封關直接跳過，不排入清單，不發送任何 HTTP 請求。
  - 語意修正：日曆為休市唯一權威。若日曆判定為交易日但官方 API 回傳查無資料，標記為 `[官方無資料（異常）]` 並推入 `failedDates`，絕不再輸出 `[休市日] 略過`。
- **測試接縫**：`src/engine/backfillTwHistoryWeb.test.ts`。

### Ticket 02: 櫃買 (TPEx) 權證代碼排除與兩市標準對齊
- **目標**：在 `scripts/market-sync/backfill-tw-history-web.cjs`（及 `parseTpexDailyQuotesWithTransactions`）中排除櫃買中心認購/認售權證標的。
- **過濾規則**：
  - 櫃買權證代碼特徵：長度為 6 碼純數字且以 `7` 開頭（如 `700001`~`739999` 等認購售權證）。
  - 在遍歷 TPEx 1430 資料列時，若正規化代碼符合 `/^7[0-9]{5}$/`，直接 `continue` 略過。
  - 使櫃買與上市端（`ALLBUT0999`）標準齊平，單日有效入庫收盤檔數由原本 ~8,000 檔收斂至約 2,400 檔核心標的（普通股、主要 ETF、可轉債），大幅削減 70% 無效記錄。
- **測試接縫**：`src/engine/backfillTwHistoryWeb.test.ts`。

### Ticket 03: 官方端點指數退避重試與單邊缺失隔離
- **目標**：將 `scripts/market-sync/sync-tw-market.cjs` 中現有的 `retryFetch` 搬移至 `scripts/market-sync/market-sync-core.cjs` 匯出共用；`backfill-tw-history-web.cjs` 改用共用 `retryFetch`。
- **重試與隔離邊界**：
  - 僅對暫態錯誤（`ECONNRESET`、`ETIMEDOUT`、HTTP 請求逾時、HTTP 5xx）執行最多 3 次重試，重試間隔為 $2000 \times \text{attempt}$ 毫秒。
  - 不可重試錯誤（HTTP 4xx、官方業務查無資料）立即拋出，不浪費重試。
  - 單邊缺失保護：若平日交易日發生 `twseQuotesCount > 0 && tpexQuotesCount === 0`（或反之），判定為單邊缺失，不視為成功交易日，該日期推入 `failedDates` 隔離清單，回補最後集中彙整，嚴禁偽成功入庫。
- **測試接縫**：`src/engine/backfillTwHistoryWeb.test.ts`。

### Ticket 04: SQLite 雙指標健康快取秒級略過 (Smart Cache Skip)
- **目標**：在 `scripts/market-sync/backfill-tw-history-web.cjs` 的 `fetchAndIngestTwDailyData` 入口處加入雙指標健康度查驗。
- **驗證規則**：
  - 查詢 SQL：
    ```sql
    SELECT COUNT(*) AS stockCount FROM daily_candles WHERE date = ? AND symbol GLOB '[1-9][0-9][0-9][0-9]';
    SELECT COUNT(*) AS chipCount FROM tw_institutional_chips WHERE date = ?;
    ```
  - 快取命中放行條件：`stockCount >= 1800 && chipCount >= 2000` 且未指定 `force: true`。
  - 達標時直接回傳 `{ date: dateStr, isTradingDay: true, quotesCount: stockCount, chipsCount: chipCount, cached: true }`，終端機輸出 `✔ 快取命中已在庫 ⚡ 略過`，不觸發網路請求與 3 秒冷卻延遲。
- **測試接縫**：`src/engine/backfillTwHistoryWeb.test.ts`。

### Ticket 05: 即時 ETA 預估引擎與終端機日誌分解
- **目標**：在 `scripts/market-sync/backfill-full-market-history.cjs` 與 `backfill-tw-history-web.cjs` 中實作時間推算與細緻日誌。
- **計算項目**：
  - 已耗時：$\Delta T = \text{Date.now()} - \text{startedAt}$。
  - 平均天耗時：$T_{\text{avg}} = \frac{\Delta T}{\text{completedDays}}$。
  - 預計剩餘時間：$\text{remainingMs} = (\text{totalDays} - \text{completedDays}) \times T_{\text{avg}}$。
  - 預計完成時間：$\text{etaDate} = \text{new Date}(\text{Date.now()} + \text{remainingMs})$。
  - 全域狀態 `backfillGlobalStatus` 暴露 `estimatedRemainingMs` 與 `etaFormatted`（如 `剩餘約 8 分鐘 (預計 10:45 完成)`）。
  - 終端機進度輸出精確分解：
    `[進度 14.8% | 37/250 | 剩餘約 8 分鐘 (預計 10:45 完成)] 處理日期: 2026-08-27 ... ✔ 成功 [上市: 1365 檔 | 上櫃: 1042 檔] [籌碼: 2238 檔]`。
- **測試接縫**：`src/engine/backfillFullMarketHistory.test.ts`。

### Ticket 06: 前端進度條 ETA 呈現與 Vite Proxy 降噪
- **目標**：在 `src/components/MarketScheduleHubSection.tsx` 中嵌入 ETA 預估時間標籤；在 `vite.config.ts` 中配置代理錯誤攔截器。
- **實作項目**：
  - 在前端進度條百分比旁，若 `backfillStatus.etaFormatted` 存在且任務正在執行中，渲染彩色徽章：`預估剩餘：約 X 分鐘 (預計 HH:mm 完成)`。
  - 在 `vite.config.ts` 的 Yahoo Finance proxy 配置加入 `onError` 處理器，攔截 `ECONNRESET`，以簡短警告取代紅色堆疊追蹤。
- **驗收標準**：
  - 全專案 `npm test` 通過率 100%。
  - `npm run build` TypeScript 0 錯誤。
