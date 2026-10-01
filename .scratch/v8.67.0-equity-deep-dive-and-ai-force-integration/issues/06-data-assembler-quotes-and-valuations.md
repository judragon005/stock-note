# 06 — 本地湖倉數據裝配器：行情價量、本益比與殖利率

**What to build:** 
在 `src/engine/equityDeepDiveAssembler.ts` 實作行情與估值裝配純函式 `assembleQuoteValuationData(candles, quote, valuation)`。提取即時現價、前收價、漲跌幅、成交量、近四季 EPS、本益比 (PE)、股價淨值比 (PB) 與現金殖利率。當部分資料缺失時，提供健全的預設值與容錯文字。

**Blocked by:** 05 — 7 步投研資料契約與型別定義

**Status:** ready-for-agent

- [ ] 正確計算並格式化當前市價、漲跌幅與成交量（股/張換算）
- [ ] 支援從日 K 或即時報價聚合估值指標
- [ ] 數值異常時（如負本益比、空值）提供機構級「N/A (虧損)」提示
- [ ] 單元測試 100% 覆蓋
