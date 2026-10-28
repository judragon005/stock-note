# 03 — 除息生命週期修復與在籍股利保護 (Dividend Lifecycle & Ex-Date Smoothing)

**What to build:**
修復除息發放日官方字典 `OFFICIAL_TW_PAY_DATE_MAP` 命中失效問題（補傳 `symbol`）。在除息基準日持有、但在入帳日前已平倉標的，保留在籍應收股利權益。排除已在 `trades` 中手動登記之配息，杜絕重複計算；排除未除息 (`UPCOMING_EX`) 誤納入除息平滑補償。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 官方字典中之台股除息標的正確帶出實際發放日，不再回退預設 30 天
- [x] 除息後當日全數賣出股票，未入帳前「應收股利」依然能看見該筆配息權益
- [x] 手動登記過該筆配息後，應收股利自動沖銷，淨值不重複膨脹
- [x] 尚未除息之標的不再進行除息平滑補償
