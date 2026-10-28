# 01 — App 頂層管線貫通、除息平滑補齊與券商帳戶金流隔離

**What to build:**
修復 `App.tsx` 調用 `calculateHistoricalNavSeries` 時之關鍵管線斷層。將 `receivableDividends`（應收股利）與 `selectedAccountId` 傳入，使 Spec 0206 之除息平滑補償機制生效，消除除息月份之虛假淨值摔落；同時於單一券商篩選生效時，正確過濾傳入 `PortfolioGrowthChart` 的 `cashTransactions`，使 XIRR 績效分析與淨值曲線均僅反映該券商之獨立表現。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 在 `src/App.tsx` 中的 `historicalNavSeries` 計算中傳入 `receivableDividends`
- [x] 在 `src/App.tsx` 中的 `historicalNavSeries` 計算中傳入 `selectedAccountId`
- [x] 在 `src/App.tsx` 中向 `PortfolioGrowthChart` 傳入對齊 `selectedAccountId` 之 `scopedCash`
- [x] 撰寫單元測試驗證傳入 `selectedAccountId` 與 `receivableDividends` 後，資產淨值平滑且獨立隔離
