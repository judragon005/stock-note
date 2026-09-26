# 06 — Card 13 市場情緒：動態參數映射與實裝掛載 (TDD)

**What to build:**
在 `src/engine/aiForceDashboardEngine.ts`：
1. 整合呼叫既有的 `src/engine/marketSentimentEngine.ts` 中的 `estimateMarketSentiment()`。
2. 萃取動態日 K 與籌碼參數：
   - `priceChangePercent`：即時或日 K 最新漲跌幅。
   - `institutionalNetRatio`：近 5 日法人累計買賣超相對成交量比例。
   - `mainForceConcentration`：VWAP 乖離率與大戶比重映射。
3. 輸出真實 `MarketSentimentData`，並取代報表中的靜態 50 分中性預設值。

**Blocked by:** None

**Status:** completed

- [x] 大漲且法人大買時，情緒狀態正確呈現 'GREED' 且指數 > 65
- [x] 重挫且破線時，情緒狀態正確呈現 'FEAR' 且指數 < 35
- [x] 單元測試 100% 綠燈
