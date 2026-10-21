# 0195 任務工作區：AI 主力戰情室 Layer 6 雙子堆疊重構、Card 21 估值卡導入與 Card 15 寬幅 Sparkline

## 1. 關聯文檔
* **GitHub Parent Issue：** [#290](https://github.com/judragon005/stock-note/issues/290)
* **規格書：** [`docs/specs/0195-ai-force-dashboard-layout-reorganization-card21-valuation-and-chips-sparkline-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0195-ai-force-dashboard-layout-reorganization-card21-valuation-and-chips-sparkline-spec.md)
* **架構決策 (ADR)：** [`docs/adr/0195-ai-force-dashboard-layout-reorganization-card21-valuation.md`](file:///d:/APP/股票紀錄/docs/adr/0195-ai-force-dashboard-layout-reorganization-card21-valuation.md)
* **規格狀態：** `APPROVED` / `TRIAGED`

---

## 2. 任務票券索引 (12 Micro-Tickets)

* [x] [`issues/01A-card19-tw-symbol-and-retail-scissors.md`](./issues/01A-card19-tw-symbol-and-retail-scissors.md) — Card 19 台股標的確認與散戶持股剪刀差
* [x] [`issues/01B-card19-us-13f-and-short-float.md`](./issues/01B-card19-us-13f-and-short-float.md) — Card 19 美股 13F 機構持股與 Short Float 放空籌碼卡
* [x] [`issues/02A-card15-layout-half-and-sparkline.md`](./issues/02A-card15-layout-half-and-sparkline.md) — Card 15 佈局 1/2:1/2 寬幅重構、0 軸分水嶺與連續動態標籤
* [x] [`issues/02B-card15-us-micro-volume-price.md`](./issues/02B-card15-us-micro-volume-price.md) — Card 15 美股微觀量價數據管線與對稱 Sparkline
* [x] [`issues/03-card13-us-macro-sentiment.md`](./issues/03-card13-us-macro-sentiment.md) — Card 13 美股宏觀情緒激活 (CNN Fear & Greed / VIX / 10Y)
* [x] [`issues/04A-card21-types-and-tw-valuation.md`](./issues/04A-card21-types-and-tw-valuation.md) — Card 21 資料模型定義與台股個股動態估值
* [x] [`issues/04B-card21-us-valuation-and-30pct-tax.md`](./issues/04B-card21-us-valuation-and-30pct-tax.md) — Card 21 美股個股估值與扣除 30% 預扣稅實質殖利率
* [x] [`issues/04C-card21-loss-making-ps-and-etf-premium.md`](./issues/04C-card21-loss-making-ps-and-etf-premium.md) — Card 21 虧損股 PS 切換與 ETF 折溢價率警戒自適應
* [x] [`issues/05A-energy-sentiment-twin-card.md`](./issues/05A-energy-sentiment-twin-card.md) — EnergySentimentTwinCard 緊湊雙子容器實作與 Alpha 共振仲裁標籤
* [x] [`issues/05B-layer6-grid-topology-250px.md`](./issues/05B-layer6-grid-topology-250px.md) — Layer 6 四欄等高網格拓撲重構與 250px 防破版佈局對齊
* [x] [`issues/06A-prompt-digest-valuation-integration.md`](./issues/06A-prompt-digest-valuation-integration.md) — 全域外聯提示詞中樞整合 (Prompt Digest 估值與情緒注入)
* [x] [`issues/06B-term-tooltip-and-full-e2e-regression.md`](./issues/06B-term-tooltip-and-full-e2e-regression.md) — 金融術語庫補全與全量戰情室 E2E 回歸測試驗收

