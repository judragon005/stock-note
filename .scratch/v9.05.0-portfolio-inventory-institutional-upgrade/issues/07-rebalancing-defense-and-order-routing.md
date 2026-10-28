# 07 — 再平衡容忍帶防護、非目標持股全額賣出與下單路由 (Rebalancing Defense & Order Routing)

**What to build:**
修復再平衡容忍帶 `&&` 邏輯判定，解決 5% 門檻失效問題。個股再平衡時，對未在目標配置清單中之在倉標的，主動產出全部減碼賣出 (`SELL`) 建議。修正 `RebalancingView` 注水現金重複加總問題。修正 `TradeModal` 標的代碼正則，完整支援 `00679B`、`00632R` 等英數混合台股 ETF。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 資產配置偏離度未達容忍帶門檻時，再平衡引擎不產出無意義之頻繁微幅交易指令
- [x] 目標配置設定為 A、B，但在倉持有 C，再平衡建議清單中明確包含全額賣出 C 的指令
- [x] 在交易彈窗輸入 `00679B`，系統正確識別為台股市場（TWD），不會誤跳美股
