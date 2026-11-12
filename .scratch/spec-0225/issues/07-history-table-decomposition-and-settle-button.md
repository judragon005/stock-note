# 07 — `DividendHistoryTable.tsx` 明細表、YOC 成本殖利率與「一鍵已入帳」按鈕

**What to build:**
將歷史股利明細、標的貢獻榜與對帳抽屜抽出為獨立子組件 `DividendHistoryTable.tsx`，在表格與貢獻榜中注入 YOC 欄位、實質填息標籤，並在待入帳項目提供「一鍵已入帳」按鈕。

**Blocked by:** 01 — ETF 分流推估 (+23天/+28天) 與「一鍵已入帳」資料流, 02 — YOC (成本殖利率) 與實質填息/貼息標籤計算模組

**Status:** ready-for-agent

- [ ] 獨立抽出 `src/components/dividend/DividendHistoryTable.tsx`。
- [ ] 明細與貢獻榜完整呈現 YOC % 與 `[實質填息]` / `[貼息中]` 狀態標籤。
- [ ] 待入帳項目提供快捷「一鍵已入帳」微按鈕觸發回調。
- [ ] 保留既有明細搜尋、年度過濾與對帳抽屜功能。

