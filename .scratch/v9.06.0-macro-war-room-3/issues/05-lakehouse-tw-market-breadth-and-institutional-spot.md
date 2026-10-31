# 05 — 本地 SQLite 湖倉台股大盤騰落廣度（識破拉積盤）與三大法人現貨籌碼聚合 (Lakehouse Taiwan Market Breadth, Narrow TSMC Trap & Institutional Spot Aggregation)

**What to build:**
後端 `/api/market/macro` 直接對本地 SQLite Lakehouse (`daily_candles` 與 `tw_institutional_chips`) 進行毫秒級全市場聚合，在戰情室呈現「上市櫃上漲 vs 下跌家數比」、「全市場站上 20MA 月線比例 (%)」與「三大法人現貨合計買賣超（億）」；當加權指數上漲但下跌家數顯著多於上漲家數時，自動標示「⚠️ 拉積盤警訊（賺指數賠價差）」，並與外資期貨未平倉構成「期現貨雙向對照」。

**Blocked by:** 03 — 已配置加密 API 金鑰池自動水合與 /api/market/macro 多源權威總經接線

**Status:** ready-for-agent

- [x] SQLite 聚合計算全市場最新交易日之上漲家數、下跌家數、平盤家數與站上 20MA 比例 (%)
- [x] 當大盤指數上漲但下跌家數超過上漲家數 1.3 倍時，自動識別為 `NARROW_TSMC_TRAP`（拉積盤警訊）
- [x] 聚合外資、投信、自營商上市櫃現貨買賣超金額（億），與外資台指期未平倉同框對照

