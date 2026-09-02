# Ticket #01: 應收股利與除息日至發放日平滑補償引擎 (TDD)

## 🎯 任務目標 (對應技術債 #0014)
在 `src/types/dividend.ts` 定義 `ReceivableDividend` 與平滑型別，並於 `src/engine/receivableDividendEngine.ts` 實作純函式計算引擎，精準計算除息日至發放日 (`exDate <= today < payDate`) 的待入帳應收股息，並提供持倉未實現損益平滑補償。

---

## 🛠️ 實作要點
1. **型別定義** (`src/types/dividend.ts`)：
   - 定義 `ReceivableDividend` 介面（含 `symbol`, `name`, `market`, `currency`, `exDate`, `payDate`, `sharesHeldOnExDate`, `cashDividendPerShare`, `estimatedGrossDividend`, `estimatedTaxOrFee`, `estimatedNetDividend`, `estimatedNetDividendInTWD`, `status`）。
2. **純函式計算模組** (`src/engine/receivableDividendEngine.ts`)：
   - `calculateReceivableDividends(holdings, corporateEvents, existingTrades, todayStr, exchangeRate)`：自動比對持倉與公司行動除息事件，過濾出尚未在 `existingTrades` 中登錄且發放日尚未逾期過久的應收股息。
   - `calculateSmoothedUnrealizedPnL(holding, receivableDividends)`：計算持股含應收股利的平滑未實現損益與報酬率。
3. **測試驅動開發 (TDD)**：
   - 編寫 `src/engine/receivableDividendEngine.test.ts`，測試台股/美股除息日除息、持有股數判定、跨幣別換算與扣稅處理。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] 支援台股 (預設 28 天發放或官方發放日) 與美股除息發放週期。
- [ ] 跨除息日持股判定精確，已入帳交易自動排除（不重複列計）。
- [ ] 單元測試 100% 綠燈，覆蓋所有邊界狀況。
