# 09 — 季配與月配股利年化 YOC 尺度校準 (Annualized YOC Scale Calibration)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
升級 `DividendHistoryTable` 的殖利率計算機制。依據標的配息頻率（季配 $\times 4$、月配 $\times 12$、半年配 $\times 2$）動態將單次配息年化後再計算 YOC，消除台積電單季顯示 0.4% 的視覺尺度失真，呈現具備財務認知可比性的真實年化成本殖利率（台積電正確顯示 1.6%）。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 在 `DividendHistoryTable` 建立/呼叫頻率年化加權因子邏輯
- [ ] 傳入 `calculateYieldOnCost` 的單股配息金額調整為年化金額（單次金額 $\times$ 年配次數）
- [ ] 驗證月配 ETF（如 00929）、季配權值股（如 2330 台積電）在歷史明細表中呈現正確年化 YOC
- [ ] 更新 `src/components/dividend/DividendHistoryTable.test.tsx` 相關 YOC 年化單元測試
