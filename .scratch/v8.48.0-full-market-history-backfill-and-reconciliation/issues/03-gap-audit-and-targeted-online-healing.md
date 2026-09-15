# 03 — 差距稽核與高性價比按日靶向線上補漏模組 (Gap Audit & Targeted Online Healing)

**What to build:**
實作資料品質稽核與補漏模組：
1. 實作「第一層稽核」：比對個股數據與大盤日曆，精確識別出缺失日期、損壞欄位與最新尾端落後天數，輸出 `backfill_gaps_audit.json`。
2. 實作「第三層靶向補漏」：針對全市場共同缺失或近期落後的交易日，**嚴禁逐檔打 API**，統一呼叫 TWSE/TPEx 全市場單日總表 API（MI_INDEX + T86 + stk_wn1430 + daily_trade），單日僅需 4 次請求即可補齊全市場 2,200+ 檔標的。
3. 實作「第四層隔離防護」：下市或已除檔標的（回傳 404）自動歸入黑名單隔離清單，終止無效重試。

**Blocked by:** Ticket 02

**Status:** ready-for-agent

- [x] 實作差距稽核邏輯並輸出 `backfill_gaps_audit.json`
- [x] 實作全市場單日批次線上補漏邏輯（含指數退避與速率限制器）
- [x] 實作下市與失效標的隔離名冊，避免重複發送無效請求
