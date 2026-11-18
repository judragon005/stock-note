# 09 — 手動校準彈窗擴充與 Zavy 慢富工作區跨頁數據打通

**Parent:** #584 (Spec 0235)

**What to build:** 擴充 `MacroQuickCalibrationModal` 補齊 `taiexIndex`、`soxBias20Ma`、`taiexBias20Ma`、`dxy`、`oilPrice`、`cccSpreadOAS`、`usIsmPmi`、`twPmi` 輸入欄位；讓 `ZavySlowWealthWorkspace` 啟動時融合 `getLatestMacroPulseRecord()` 本地校準快照、同時渲染 `/api/market/breadth` 之台股與 **美股 20/60/200MA 多週期寬度**，並提供按鈕直接開啟真實可編輯的校準彈窗（不再僅是唯讀摘要）。

**Blocked by:** 01 — 統一宏觀數據海關正規化器

**Status:** ready-for-agent

- [ ] `MacroQuickCalibrationModal` 支援校準上述 8 項新增欄位並寫入 `macroPulseStorage`
- [ ] `ZavySlowWealthWorkspace` 正確讀取本地校準快照，消除跨頁切換後的 `--` 孤島
- [ ] `ZavyMarketBreadthCard` 同時呈現台股與美股 20/60/200MA 三期寬度
- [ ] Zavy 頁籤可開啟真實數據校準表單並即時重算週期建議
