# 02 — corporate_action_calendar 建表 DDL 單一來源收斂

**What to build:** 由湖倉核心模組匯出單一 `ensureCorporateActionCalendarTable` 建表函式，美股基本面攝取模組改為呼叫該共用函式並移除本地重複 DDL，確保台美雙市場共用一致 Schema。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 湖倉核心模組匯出單一 `ensureCorporateActionCalendarTable` 函式
- [ ] 美股基本面攝取模組刪除本地重複 `CREATE TABLE IF NOT EXISTS corporate_action_calendar` DDL 並改為引用共用函式
- [ ] 驗證建表與索引結構與原實作 100% 等價且測試全綠
