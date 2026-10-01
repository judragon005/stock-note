# 12 — 美股微觀量價主力替代演算法 (US Volume Microstructure Quant Engine)

**What to build:**
在 `src/engine/multiDimensionRadarEngine.ts` 與 `src/engine/volumeProfileEngine.ts` 中擴充美股量化主力資金演算法。
針對美股市場 (market = 'US') 缺乏官方三大法人買賣超之特性：
1. 計算長天期 VWAP 成本階梯偏離率：以收盤價相對於 20 日與 60 日 VWAP 偏離幅度評估機構底倉厚度。
2. 整合 OBV (能量潮指標) 與 MFI (資金流量指數 14)：量化資金淨流入/流出力道。
3. 偵測大單異常量 (Volume Spikes)：單日成交量超過 20 日均量 2 倍且為長紅棒時標記主力吸籌。
4. 將上述微觀量價指標標準化映射為 0~100 的「機構籌碼評分 (Institutional Flow Score)」，無縫銜接六維雷達圖之法人維度。

**Blocked by:** 11 — 前端 marketCacheLoader 接入本地 API 與離線降級

**Status:** completed

- [x] 實作 `calculateUsMicrostructureInstitutionalScore(candles: DailyCandle[]): number`。
- [x] 驗證當股價站上 VWAP 且 MFI > 60 時，主力籌碼分數顯著高於空頭排列標的。
- [x] 確保計算結果在 0~100 之間，不出現 NaN 或超出範圍異常。
- [x] 戰情室六維雷達在美股標的上能正確渲染出有意義的機構評分與等級。
- [x] 單元測試 `src/engine/multiDimensionRadarEngine.test.ts` 驗證美股量價替代演算法之準確性與邊界值 100%。
