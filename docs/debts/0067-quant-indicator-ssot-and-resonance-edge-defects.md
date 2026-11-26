# Debt 0067: Card 01 與 Card 01B 日 K 指標口徑分裂收斂、重複技術指標歸一化與共鳴引擎邊界修復 (Wave 2)

- **優先級 (Priority)**: `P1`
- **狀態 (Status)**: `RESOLVED` (Spec 0249 / ADR #0249 / Issue `#613`)
- **發現來源**: Spec 0247 五路正交法醫審計 (Issue `#609`)
- **標籤**: `Quant` · `DataIntegrity` · `AiForceDashboard` · `DRY` · `Wave2`
- **預計觸發時機**: Wave 2（規劃為 `Spec 0249`，與 [Debt 0064](0064-war-room-resonance-and-tdcc-smells-consolidation.md) 及 [Debt 0051](0051-projected-cashflow-dynamic-calendar-profile-learning.md) 一併清償）

---

## 背景與現況

1. **Card 01 主圖 vs Card 01B 共鳴卡日 K RSI/KD/MACD 口徑分裂**：
   - 日 K 時框下 `KLineChartCard` 跳過 `enrichCandlesWithOscillators`，直接顯示 `aiForceDashboardEngine.ts` 手算之簡易 SMA RSI(14) 與無最小期數保護之早期 KD/MACD，而 `TechnicalResonanceCard` 採 `klineOscillatorEngine.ts` 之 Wilder RSI(14) 與 `requireMinPeriod: true`，造成同螢幕上下兩卡數值矛盾。
2. **全引擎三套重複技術指標與交易成本常數分裂**：
   - MACD/KD、RSI、OBV、ATR、VWAP 各自存在 3 份平行實作，其中 `omniIndicatorEngine.ts` 在全平盤無漲跌時將 RSI 誤回傳 `100`（應為 `50`）；`rebalancingEngine.ts` 硬編碼手續費／證交稅且漏算台股 20 元低消與 ETF 0.1%/0% 稅率。
3. **`technicalResonanceEngine.ts` 8 項邊界邏輯缺陷與 Debt 0051 三重斷鏈**：
   - 包含盤中零量時間基準分裂、KDJ 鈍化遮蔽高檔死叉／低檔金叉、`WARN` 燈號計入 `neutralCount` 致警報蒸發、`VOLATILITY_SQUEEZE` 權重與文案矛盾、空頭總評漏檢 `!hasConflict`、WARN 失效防線方向反轉、`computeHistoricalWinRate` 缺 `fwd.close <= 0` 守衛。
   - `projectedCashflowEngine.ts` 靜態常數蓋過 `historicalPayoutMonths`、`4.5%` 假殖利率對美股大盤高估 3.5–10 倍，且 SQLite 美股 `corporate_action_calendar` 僅 3 檔。

## 建議演進方向

1. 確立 `klineOscillatorEngine.ts` 為全站唯一 MACD/KD/Wilder RSI 計算源，使 Card 01 與 Card 01B 日 K 偏差 $\Delta = 0.00$，並補建 `klineOscillatorEngine`、`technicalResonanceEngine`、`darvasBoxEngine` 獨立測試。
2. 配合 Debt 0064 拆解 `buildTechnicalResonance` 並一次修復 8 項邊界漏洞；配合 Debt 0051 修正優先級、以 TTM 真實配息取代固定 4.5% 並補齊持有美股按需配息入庫。
