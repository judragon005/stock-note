# 01 — Card 03 多維度判讀：法人與籌碼雙軸量化子函式 (TDD)

**What to build:**
在 `src/engine/multiDimensionRadarEngine.ts` 實作法人與籌碼軸之計分子函式，並在 `src/engine/multiDimensionRadarEngine.test.ts` 驗證：
1. **法人軸 (`calculateInstitutionalScore`)**：
   - 輸入：`institutionalFlow: InstitutionalFlowData`、`market: MarketType`。
   - 邏輯：
     - 若為台股且有法人資料：
       - 近 20 日法人累計買賣超 (`cumulativeTotalShares`) > 2,000 張 ➔ 85 分；> 500 張 ➔ 70 分；> 0 張 ➔ 58 分。
       - 近 20 日累計 < -2,000 張 ➔ 20 分；< -500 張 ➔ 35 分；< 0 張 ➔ 45 分。
       - 最新一日若為「土洋合買」再 +10 分（上限 95）；「土洋齊賣」再 -10 分（下限 10）。
     - 若為美股或無三大法人資料：以 50 分為基準，依收盤是否站上 VWAP 調節 45~55 分。
2. **籌碼軸 (`calculateChipsScore`)**：
   - 輸入：`institutionalFlow: InstitutionalFlowData`。
   - 邏輯：
     - 近 5 日法人合計淨買超 > 1,000 張 ➔ 85 分；> 200 張 ➔ 70 分；> 0 ➔ 60 分。
     - 近 5 日合計淨賣超 < -1,000 張 ➔ 25 分；< -200 張 ➔ 35 分；< 0 ➔ 45 分。
     - 若無資料回退 50 分。
3. 嚴格邊界鉗制於 `[0, 100]`。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 法人大量買超且土洋合買輸出 85~95 分
- [x] 法人大量賣超且土洋齊賣輸出 10~25 分
- [x] 美股或無籌碼資料回傳合理基準 45~55 分
- [x] 籌碼軸近 5 日大買輸出 70~85 分，大賣輸出 25~35 分
- [x] 單元測試 100% 綠燈
