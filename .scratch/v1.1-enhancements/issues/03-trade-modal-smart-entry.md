# 03 — 智慧交易錄入、標的建議與券商手續費折數試算 (Smart Trade Entry)

**What to build:**
升級 `src/components/TradeModal.tsx`。加入台美股熱門標的建議（Autosuggest）與使用者歷史代碼自動記憶；新增台股券商手續費折扣下拉與自訂（不打折、6 折、5 折、2.8 折、自訂折數），連動自動試算實收手續費；新增連續記帳模式。

**Blocked by:** 01-calculator-and-yoc

**Status:** completed

- [x] 內建台美熱門標的字典並整合歷史交易記錄，實現即時輸入智慧下拉建議。
- [x] 支援手續費折數選擇與自訂，自動帶入 `calculateTaiwanFee` 算出手續費。
- [x] 支援「連續記帳」開關，送出後自動清空股數與價格，保留日期與市場以便接續錄入。
