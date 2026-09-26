# 02 — Card 03 多維度判讀：趨勢與動能雙軸量化子函式 (TDD)

**What to build:**
在 `src/engine/multiDimensionRadarEngine.ts` 實作趨勢與動能軸之計分子函式，並在 `src/engine/multiDimensionRadarEngine.test.ts` 驗證：
1. **趨勢軸 (`calculateTrendScore`)**：
   - 輸入：最新 K 線 (`KlineCandleItem`)、主力成本 (`mainForceCost: number`)。
   - 邏輯：
     - 均線多頭排列檢測：`close > ma5 && ma5 > ma10 && ma10 > ma20 && ma20 > ma60` 給予基礎 85 分；站上 MA20 且 MA5>MA20 給予 75 分；收盤低於 MA60 給予 30 分。
     - VWAP 乖離率修正：`vwapBias = (close - mainForceCost) / mainForceCost * 100`。
       - `vwapBias > 5%` +10 分；`vwapBias < -5%` -10 分。
     - 限制在 `[0, 100]`。
2. **動能軸 (`calculateMomentumScore`)**：
   - 輸入：最新 K 線 (`KlineCandleItem`)、日 K 數列 (`candles`)。
   - 邏輯：
     - KD 指標：`K > D` 且 `K < 80` 給予 +10 分；`K < D` 且 `K > 20` 給予 -10 分；KD 低檔超跌反彈 (`K < 20`) +5 分。
     - RSI 指標：RSI 在 55~70 強勢區給予 75 分；RSI > 80 過熱調降至 60 分；RSI < 30 超跌給予 40 分。
     - 量能放大：當日成交量相對 20 日均量倍數 `volRatio > 1.5` 且紅 K，動能 +15 分。
3. 嚴格邊界鉗制於 `[0, 100]`。

**Blocked by:** None

**Status:** completed

- [x] 均線四線多頭排列且站上主力成本得 85~95 分
- [x] 均線空頭排列破季線得 20~35 分
- [x] 帶量長紅且 KD 黃金交叉時動能顯著高於無量盤整
- [x] 單元測試 100% 綠燈
