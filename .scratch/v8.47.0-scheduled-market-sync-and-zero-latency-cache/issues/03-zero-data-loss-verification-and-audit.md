# 03 — 防漏水稽核與死信補跑機制 (Zero-Data-Loss Verification & Dead-Letter Retry)

**What to build:**
落實使用者要求的「確保所有資料都已更新完畢，不可以有遺漏」。整合休市日曆過濾機制，判斷週末與法定國定假日，自動標記休市跳過；對於交易日，執行嚴格的「預期覆蓋清單 vs 實收清單」比對。若發現遺漏標的，自動壓入 Dead-Letter Queue 進行退避重試（最多 3 次）。抓取任務結束後產出稽核報告 `sync_audit_report.json`。

**Blocked by:** Ticket 01, 02

**Status:** ready-for-agent

- [x] 整合台灣 (TWSE) 與美國 (NYSE/NASDAQ) 官方休市日曆，國定休市日自動標註 `MARKET_CLOSED` 並跳過
- [x] 實作標的覆蓋率檢驗器：計算總標的數、成功數、遺漏數與覆蓋率百分比
- [x] 實作 Dead-Letter Retry 機制：失敗標的自動重試 3 次
- [x] 生成稽核報告 `sync_audit_report.json`（記錄執行時間、耗時、覆蓋率、成功/失敗檔數清單）
- [x] 測試驗證斷網或單一標的錯誤時之重試與容錯隔離機制
