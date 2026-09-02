# Spec 0061: 減資多源去重、虛擬時序動態扣減與交易帳本股息淨額對齊規格書

## Problem Statement

使用者在進行 9927 泰銘 2025 年減資換發與 2026 年配息補登時，系統出現多重嚴重之會計計算與顯示矛盾：
1. **多資料源減資重複抓取與扣減**：
   - 台灣證交所 (TWSE 官方 API) 登記泰銘減資基準日為 `2025-09-15`（每股退款 2.828051 元，減資比率 28.28051%）。
   - Yahoo Finance API 則將該次減資視為反向分割，登記在恢復買賣日的 `2025-11-13`（換發比例 71.72%，無退款金額）。
   - 智慧掃描引擎未對相近日期（$\le 90$ 天內）的同場次減資換發進行去重合併，導致系統將同一場減資補登兩次（`2025-09-15` 減 2,828 股 + `2025-11-13` 減 2,829 股），造成在倉股數被重複扣減為 7,172 股（正確應為 10,000 股）。
2. **智慧掃描虛擬時序漏扣減資股數**：
   - 在 `scanCorporateActions` 內部，虛擬時序交易池 `virtualTrades` 只累加除權配股與股票分割，遺漏了減資（`CAPITAL_REDUCTION`）之動態扣減。
   - 導致在推算後續配息（2026-10-01）的基準日持股時，虛擬時序累加了未減資前的買進股數，算出了錯誤的 12,829 股基準持股。
3. **歷史交易帳本台股現金股利重複扣除稅費**：
   - 智慧掃描在建立現金股利交易紀錄時，已在 `cashAmount` 填入扣繳二代健保後的實收金額，並在 `tax` 填入健保費。
   - 歷史交易帳本表格在呈現結算金額時再次執行 `cashAmount - tax`，導致健保費被扣了兩次（顯示 61,439 元而非實收 62,792 元），與台股現金流水帳產生矛盾。
4. **減資比率浮點精度截斷導致 1 股誤差 (10,001 股 vs 10,000 股)**：
   - 泰銘 2025 年官方精確減資比率為 `28.28051%`（換發比例 $71.71949\%$），集保換發新股為 $\lfloor 10,000 \times 71.71949\% \rfloor = 7,171$ 股，縮減股數為 $2,829$ 股。
   - 舊系統使用粗略之 `0.2828` 算成換發 $7,172$ 股（縮減 $2,828$ 股，少扣 1 股），導致買回 $2,829$ 股後帳本累積為 $10,001$ 股。

## Solution

1. **多源減資去重與合併**：
   - 在 `fetchLiveCorporateEvents` 整合 Yahoo Finance 與 TWSE/備援庫時，自動識別 $\le 90$ 天內之同場次減資換發，優先採用官方精準基準日與退款金額。
   - 在 `isAlreadyRecorded` 歷史比對中，新增 $\le 90$ 天同類型減資之重複防護。
2. **虛擬時序動態扣減減資股數**：
   - 將 `CAPITAL_REDUCTION` 納入 `virtualTrades` 時序池，確保後續配息計算以減資後之動態精準在倉股數為基準。
3. **修復歷史交易帳本重複扣稅**：
   - 在 `TradeHistoryTable.tsx` 中，台股現金股利若已給定實收淨額 `cashAmount`，直接以 `cashAmount` 呈現結算金額，杜絕二次扣減 `tax`。
4. **官方減資比率精度升級**：
   - 將系統內建備援庫之減資比率提升至官方 6 位精準小數 `0.2828051`，確保 10,000 股精準換發 7,171 股、縮減 2,829 股，消除 1 股誤差。

## User Stories

1. As a 投資人, I want 智慧掃描自動辨識並合併同一場次的官方減資與 Yahoo Finance 換發事件, so that 我的交易帳本不會被重複補登兩筆減資紀錄。
2. As a 投資人, I want 智慧掃描在回溯計算除息基準日持股時，能動態正確扣減減資縮減之股數, so that 預估配息金額與成交股數 100% 符合我當時的真實持股。
3. As a 投資人, I want 歷史交易帳本的股息結算金額與台股現金流水帳的預計入帳金額完全一致, so that 不會因二代健保補充保費被扣除兩次而產生帳目疑慮。
4. As a 投資人, I want 系統支援官方 6 位小數之高精準減資換發比例計算, so that 大額或千股整批持股在減資換發後不會因無條件捨去規則而產生 1 股之誤差。

## Implementation Decisions

- **減資合併比對視窗 (Deduplication Window)**：
  - 設定為 90 天（涵蓋除權息減資基準日與恢復買賣上市日的時間差）。
- **時序交易池 (Virtual Trades Protocol)**：
  - 在 `scanCorporateActions` 內部，對於未入帳的 `CAPITAL_REDUCTION` 事件，生成虛擬交易物件 `{ type: 'CAPITAL_REDUCTION', shares: estimatedShares }` 推入 `virtualTrades`。
- **股息呈現口徑對齊 (Dividend Display Alignment)**：
  - `TradeHistoryTable.tsx`：
    ```ts
    const divDisplay = isUS
      ? (t.cashAmount ?? (t.shares * t.price))
      : (t.cashAmount && t.cashAmount > 0 ? t.cashAmount : (t.shares * t.price) - (t.tax || 0) - (t.fee || 0));
    ```

## Testing Decisions

- **測試縫隙 (Test Seams)**：
  1. [`src/engine/corporateActionScanner.test.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.test.ts)
     - 測試 TWSE 減資與 Yahoo Finance 換發事件去重。
     - 測試減資後買回、次年除息持股回溯計算（10,000 股 $\to$ 減資 2,829 股 $\to$ 買回 2,829 股 $\to$ 2026 配息精確以 10,000 股計算 50,000 元，健保費 1,055 元，實收 48,945 元）。
     - 測試減資重複記錄防護（$\le 90$ 天標記為 `isAlreadyRecorded = true`）。
  2. [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx)
     - 驗證台股股息結算金額顯示與 cashAmount 對齊。

## Out of Scope

- 修改美股 ADR 股息 30% 預扣稅之計算邏輯。
- 修改手動新增交易彈窗的底層校驗機制。
