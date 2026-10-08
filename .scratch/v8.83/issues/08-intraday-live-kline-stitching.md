# Ticket 08: 戰情室盤中與未結算時態即時 K 棒動態縫合 (Spec 0170)

## 1. 任務核心 (Core Objective)
在 `src/engine/aiForceDashboardEngine.ts` 中精確劃分盤前、盤中 (09:00~13:30)、盤後未結算 (13:30~15:00) 與盤後已結算 (15:00+) 四個時間狀態。當處於未結算期且具備有效即時行情時，動態構造當日（如 2026-10-08）最新虛擬日 K 追加至 `candles` 最末端。

## 2. 目標檔案 (Target Files)
- `src/engine/aiForceDashboardEngine.ts`
- `src/engine/aiForceDashboardEngine.test.ts`
- `src/types/aiForceDashboard.ts`

## 3. 動態縫合演算法 (Intraday Stitching Algorithm)
1. 檢測時間狀態機：
   - 透過 `getMarketSettlementStatus(market, referenceDate)` 取得 `isSettled` 與 `anchorTradingDate`。
2. 若 `!settlement.isSettled`（如 10/08 13:30~15:00）：
   - 基礎歷史 K 棒過濾至前一結算日（10/07）。
   - 若外部傳入 `realtimeQuote?.price > 0`：
     - 動態構造一根即時 K 棒：
       `date: formatDateToYMD(today)`（即 2026-10-08）
       `open: realtimeQuote.open || realtimeQuote.price`
       `high: realtimeQuote.high || Math.max(realtimeQuote.price, open)`
       `low: realtimeQuote.low || Math.min(realtimeQuote.price, open)`
       `close: realtimeQuote.price`
       `volume: realtimeQuote.volume || 0`
       `isIntraday: true`
     - 追加至 `effectiveCandles` 末端。
3. 標題列 `HeaderMarketBar` 與指標計算：
   - `latestTradingDate` 顯示為當日（2026-10-08），並標註「盤中即時 / 盤後撮合中」。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 單元測試模擬 10/08 13:40（已過 13:30 收盤但未到 15:00 結算），驗證產出之報表日 K 包含 2026-10-08 當日收盤價。
- [ ] 既有所有回退與定錨測試維持 100% 綠燈。
