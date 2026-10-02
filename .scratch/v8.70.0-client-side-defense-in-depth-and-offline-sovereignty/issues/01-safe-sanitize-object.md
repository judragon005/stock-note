# 01 — 原型污染防禦安全對象消毒器 (Safe Sanitize Object)

**What to build:** 
實作零外部依賴的原型污染安全消毒器 `safeSanitizeObject<T>(obj: T): T`。遞迴遍歷傳入的資料結構，嚴格剔除所有鍵名為 `__proto__`、`constructor`、`prototype` 的惡意屬性。產生物件底層使用 `Object.create(null)` 或純淨 Object，確保全域原型鏈不可被竄改。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 支援純量數值、字串、布林值、null/undefined 之直接回傳
- [x] 支援陣列內部元素之遞迴消毒
- [x] 嚴格剔除物件屬性中的 `__proto__`、`constructor`、`prototype`
- [x] 確保處理含有惡意原型載荷時，`Object.prototype` 永遠不會被污染
- [x] 單元測試 100% 覆蓋深度巢狀物件與原型鏈攻擊載荷
