# 02 — 交易紀錄數值硬性熔斷守門員 (Sanitize Trade Record & Boundary Guard)

**What to build:** 
實作單筆交易紀錄合法性與數值邊界硬性熔斷純函式 `sanitizeTradeRecord(trade: unknown): TradeRecord | null`。防禦畸形數值、溢位及超長字串，確保進入系統之每一筆記錄均符合會計計算與資料庫儲存規範。

**Blocked by:** 01-safe-sanitize-object

**Status:** ready-for-agent

- [x] 校驗 `shares` 必須為有限正數 (`Number.isFinite(s) && s > 0 && s <= 1e9`)，阻斷 `Infinity`, `NaN` 與負數
- [x] 校驗 `price` 必須為有限非負數 (`Number.isFinite(p) && p >= 0 && p <= 1e7`)
- [x] 校驗 `fee` 與 `tax` 必須為有限非負數 (`Number.isFinite(n) && n >= 0 && n <= 1e8`)
- [x] 校驗 `symbol` 必須符合代碼規則 (`/^[A-Za-z0-9.-]{1,12}$/`)
- [x] 字串型別欄位 `note` 強制截斷至 2,000 字元以內，防範記憶體炸彈 DoS
- [x] 陣列型別欄位 `tags` 限制上限最多 20 個標籤，每個標籤字串截斷至 50 字元以內
- [x] 單元測試 100% 覆蓋極端邊界數值、負數、Infinity、超長字串
