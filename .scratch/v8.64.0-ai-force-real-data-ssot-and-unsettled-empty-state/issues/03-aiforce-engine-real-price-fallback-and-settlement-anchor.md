# 03 — 引擎價格造假淘汰、盤中定錨昨收與降級防呆 (AiForce Engine Real Price Fallback & Settlement Anchor)

**What to build:**
重構 `aiForceDashboardEngine.ts`。徹底廢除 `createDefaultAiForceReport` 內寫死的 `price = 150.0` 及衍生之 +1.80、成交量 2,681 等捏造數值；接入 `getMarketSettlementStatus`，在盤中未結算（15:00 前）時將標籤標示為「前日收盤價」並定錨於上一交易日。若外部查有至少 1 根歷史日 K，以最後一根有效日 K 作為真實昨收基準；若完全無資料，數值安全回退為 `-` 並標記 `isDataPending: true`，各卡片呈現防呆等待狀態。

**Blocked by:** 01 — 資訊列說明文字真實動態綁定, 02 — 淘汰 2,100 元假 K 棒與無日 K 科技感 Empty State 視圖

**Status:** completed

- [x] `createDefaultAiForceReport` 移除 `price = 150.0` 與寫死成交量/漲跌等假數據。
- [x] 接入 `getMarketSettlementStatus`，確保未結算時 `isSettled: false`，標籤為「前日收盤價」並定錨於前一交易日。
- [x] 若有 1~4 根日 K，以最後一根日 K 作為基準；若無日 K，安全呈現無資料或破折號 `-`。
- [x] `aiForceDashboardEngine.test.ts` 與 `HeaderMarketBar.test.ts` 驗證單元測試 100% 綠燈。

