# 04 — 台美費城半導體 (^SOX)、台積電 ADR (TSM) 溢折價率與四大指數波段乖離傳導鏈 (Cross-Market SOX, TSMC ADR Premium & Four-Index 20MA/60MA Swing Transmission)

**What to build:**
後端與前端戰情室同步納入費城半導體指數 (`^SOX`)、台積電 ADR (`TSM`) 對 `2330.TW` 之 5:1 匯率折算價與溢折價率 (%)，以及台美四大核心指數 (`^TWII`, `^SOX`, `^GSPC`, `^IXIC`) 的 20MA（月線）/ 60MA（季線）位階與 20MA 乖離率 (%)；同時接入 `marketStatusEngine` 顯示台美開休市雙時鐘（自動感知美東夏/冬令時間與台美休市日）及跨夜領先傳導提示。

**Blocked by:** 01 — 戰情室元件預重構與台美紅綠漲跌主題色全面對齊, 03 — 已配置加密 API 金鑰池自動水合與 /api/market/macro 多源權威總經接線

**Status:** ready-for-agent

- [x] `calculateTsmcAdrPremium(tsmUsd, tw2330Twd, usdToTwd)` 精確以 5:1 換算台積電 ADR 折合台幣價與溢折價率 (%)
- [x] 戰情室呈現費城半導體 (`^SOX`)、加權指數 (`^TWII`)、標普 (`^GSPC`) 與納指 (`^IXIC`) 之漲跌幅、20MA/60MA 位階與 20MA 乖離率
- [x] 頂部整合 `getTwMarketStatus` 與 `getUsMarketStatus` 顯示台美即時開休市狀態與當地時間

