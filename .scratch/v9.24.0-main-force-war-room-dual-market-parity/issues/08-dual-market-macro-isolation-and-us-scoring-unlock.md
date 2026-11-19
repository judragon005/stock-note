# 08 — 雙市場總經隔離與美股核心評分數學解鎖 (Card 02 / 05 / 09 / 11 / 12 / 14 / 16 / 18)

**Parent:** #592 (Spec 0239)
**What to build:** 徹底修復報表引擎跨市場污染：嚴格依 `market` 隔離 `twMacroData`（僅 TW）與 `usMacroData`（僅 US）並設定 `marketSentiment.isUsMarket`，統一美股總經欄位命名且相容舊別名；實作雙市場統一能力與流動性適配（TW 張 vs US 股數/美元成交額），並將 `usMicrostructure`（MFI / OBV / RVOL / VWAP 乖離 + 13F/Short Float 加權）全面注入 Card 02、05、09、11、12、14、16、18，解除美股分數封頂與台股用語殘留。
**Blocked by:** 02 — 單一權威資產分類器 (resolveAssetClass)、名稱解析參數校正與雙市場結算時區引擎, 04 — 台股總經衍生品採集 (TAIFEX Big5 期貨 OI / P/C Ratio / 融資維持率) 與逐欄非空合併, 06 — 美股基本面與 13F 湖倉表 (us_fundamentals_daily)、Yahoo quoteSummary Crumb 聚合與美股歷史配息
**Status:** ready-for-agent

- [ ] 台股標的生成之報表 `marketSentiment.isUsMarket === false` 且 `usMacroData === undefined`（徹底杜絕台股遭美股視圖劫持）；美股標的僅帶 `usMacroData` 且無 `twMacroData` 洩漏，缺 CNN 分數時不捏造 `'中性'`。
- [ ] 美股多頭微結構標的於 Card 11（`chipHealth`、`institutionalSupport`）脫離 50% 鎖死、於 Card 02 可觸發 `AI BULLISH`、於 Card 12 可突破 60 分亮出 `GREEN` 綠燈並產出對應情境仲裁（不再 100% 落入「指標多空分歧」）。
- [ ] Card 05、11、14 與 Card 18 流動性門檻依市場區分台股（張）與美股（股數/成交額），低量美股（如日均 3,000 股）不再誤判高流動性；美股 Card 14 不再因缺乏台股三大法人而遭扣完整度分。
- [ ] 美股 Card 18 產出美股專屬機構動能總評動詞與文案（含 `$` 與 `股`），絕不出現「法人近 5 日合計 +0 張」或「元」；Card 09 依美股無漲跌幅 ATR% 校準波動風險；Card 16 美股摘要文案改為價量微結構語意。
