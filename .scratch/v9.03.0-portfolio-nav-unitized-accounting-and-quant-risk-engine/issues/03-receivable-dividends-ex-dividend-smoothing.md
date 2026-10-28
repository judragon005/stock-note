# 03 — 應收股利 (Receivable Dividends) 除息空窗平滑補償

**What to build:**
解決除息日（Ex-Date）與現金股利實際入帳發放日（Pay-Date）之間長達 3~4 週的空窗期假跳水凹洞。除息日股價自然下調導致市值減少，但在現金尚未入帳前，系統應認列應收股利資產 (`receivableDividends`) 納入每日總資產中；當發放日股利現金入帳時，自動沖銷應收股利，實現總淨資產曲線平滑過渡，徹底消除除息旺季長達一個月的假性 MDD。

**Blocked by:** Ticket 02

**Status:** DONE

- [x] 擴充 `src/types/stock.ts` 中 `PortfolioDailySnapshot` 新增 `receivableDividends?: number` 欄位
- [x] 擴充 `calculateHistoricalNavSeries` 支援傳入 `receivableDividends?: ReceivableDividend[]`
- [x] 逐日計算在 `exDate <= date < payDate` 期間將應收金額折算基幣加計至 `totalNAV`
- [x] 在 `payDate` 當日隨股息現金入帳沖銷應收資產
- [x] 於 `src/engine/historicalNav.test.ts` 驗證除息日至發放日之間 NAV 走勢平滑無凹洞
