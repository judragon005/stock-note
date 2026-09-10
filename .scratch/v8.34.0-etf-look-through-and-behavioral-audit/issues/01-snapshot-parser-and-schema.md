# 01 — 券商快照資料模型與剪貼簿/CSV 文字解析器 (Snapshot Parser & Schema)

**What to build:**
使用者在對賬介面可直接貼上來自各券商網頁/App 或 Excel 的持倉文字（支援 Tab 分隔、逗號分隔與空格分隔）或匯入 CSV。解析器自動辨識表頭欄位（股票代碼、持有股數、成交均價/現價、券商名稱），容錯處理千分位逗號與多餘空白，產出標準化之 `BrokerSnapshotItem[]` 清單。若遇到空行或標題行能智慧忽略，遇非法數值標記單行警告而不崩潰中斷。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 支援解析 Tab 分隔 (TSV)、逗號分隔 (CSV) 與空格分隔之券商持倉剪貼簿文字
- [ ] 能精準擷取 `symbol` (代碼) 與 `shares` (股數)，並自動清除千分位符號 (如 "1,000" -> 1000)
- [ ] 遇非法列或文字標題列時安全跳過，並返回解析成功之 `BrokerSnapshotItem[]`
- [ ] 單元測試於 `src/engine/reconciliationEngine.test.ts` 驗證各券商常用文字格式之解析魯棒性
