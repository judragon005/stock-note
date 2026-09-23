# 04 — 股利收益日誌與現金流全景介面升級 (Dividend Log View UI/UX Enhancement)

**What to build:**
於 `src/components/DividendLogView.tsx` 實現對帳與篩選功能：
1. **當年度實領股息卡片 (KPI 1) 對帳強化**：
   - 保留主數值 `NT$ currentYearDividendsTWD.toLocaleString()`（實領淨額）。
   - 在卡片下方加入對帳小字：`應發毛額 NT$ {report.currentYearGrossTWD.toLocaleString()} | 扣繳稅費 -NT$ {report.currentYearTaxTWD.toLocaleString()}`。
   - 加入 Info Tooltip 說明：「券商 APP 若顯示毛額，請核對此處應發總額；差額為二代健保 (2.11%) 與美股預扣稅款。」，徹底解決使用者核對 600,745 元 vs 576,307 元的困惑。
2. **月度現金流柱狀圖 Tooltip 標示精準化**：
   - 明確標示「📅 {selectedYear} 年 {m.monthLabel} 實領入帳」。
3. **歷史現金股利入帳明細表年度連動開關**：
   - 於明細表標題/搜尋區加入過濾開關：`[當年度 (${selectedYear})] / [全歷史]`（預設選定「當年度」）。
   - 當選定「當年度」時，僅顯示 `effectivePayDate.startsWith(selectedYear)` 之紀錄，使下方列表與上方 KPI / 柱狀圖數據 100% 對齊。

**Blocked by:** Ticket 01, Ticket 02

**Status:** closed
- [x] 在 KPI 卡片 1 渲染應發毛額與稅費對帳資訊與 Tooltip
- [x] 於月度現金流柱狀圖 Tooltip 優化入帳月份文案
- [x] 在歷史明細表加入「當年度 / 全歷史」切換按鈕並實現過濾邏輯
- [x] 驗證搜尋功能在兩種年度模式下運作正常
