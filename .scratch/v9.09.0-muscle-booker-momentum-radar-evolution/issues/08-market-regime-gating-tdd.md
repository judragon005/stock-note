# 08 — 大盤體系 Regime 多空閘門與自適應門檻 (Market Regime Gating TDD)

**What to build:**
實作機構法人與肌肉書僮的大局觀防禦，避免空頭市場盲目抄底：
1. 傳入基準大盤狀態（讀取 `dualMomentumEngine.ts` 之 `safeHavenTriggered` 或加權/標普指數日 K）：
2. 自適應動態門檻：
   - **大盤多頭 (Normal)**：維持標準 2.0R 風益比門檻。
   - **大盤空頭 (Defensive / Bear)**：
     - 風益比硬門檻自適應提升至 **3.0R**。
     - 且個股必須滿足 `rsRank === 'EXTREME_STRONG'`（逆勢抗跌領頭羊），否則強制降級為 `HOLD: 🟡 觀望 (大盤偏空，動能門檻提高至 3.0R)`。
3. 撰寫單元測試覆蓋多頭環境標準放行與空頭環境門檻自適應提升。

**Blocked by:** Ticket 07

**Status:** open

- [x] 在 `evaluateMuscleBookerAction` 擴充 `marketRegime?: 'BULL' | 'BEAR' | 'NEUTRAL'` 參數
- [x] 空頭環境動態將 `minRiskRewardRatio` 由 2.0 提升至 3.0
- [x] 空頭環境檢驗個股相對強度 RS，非極強標的一律降級為觀望
- [x] 編寫單元測試驗證大盤空頭與多頭切換時的動態風控閘門

