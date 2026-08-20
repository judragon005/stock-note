# 01 — 時序回溯與公司行動會計核心 (Date Holding Resolution & Corporate Action Engine)

**What to build:**
擴充 `src/types/stock.ts`、`src/engine/calculator.ts` 與 `src/utils/storage.ts`。實作依特定交易日期推算持股之 `getHoldingsAsOfDate()`、單筆股數純計算函式 `applyTradeToShares()`，並支援除權配股、股票分割、現金/虧損減資、現金增資之會計成本與資本返還累計邏輯，配合 TDD 確保 100% 通過。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] 擴充 `TradeType` 包含 `STOCK_DIVIDEND`, `STOCK_SPLIT`, `CAPITAL_REDUCTION`, `CAPITAL_INCREASE`。
- [x] 實作 `getHoldingsAsOfDate(trades, targetDate, symbol)` 與 `applyTradeToShares(currentShares, trade)`。
- [x] 實作除權配股成本稀釋、分割倍數調整、現金減資退款扣減本金與增資認購成本累計。
- [x] 擴充 `storage.ts` 支援公司行動欄位之 CSV 匯出匯入與 JSON 驗證。
- [x] 單元測試（包含基準日回溯、除權息、減資退款等）100% 通過。
