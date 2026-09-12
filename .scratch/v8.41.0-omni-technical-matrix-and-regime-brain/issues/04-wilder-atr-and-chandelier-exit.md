# 04 — Wilder ATR(14) & Chandelier Dynamic Trailing Exit Engine

**What to build:** 
實作真實波幅 ATR(14) 運算引擎與吊燈動態移動停損點（Chandelier Exit）。使用 J. Welles Wilder 平滑演算法計算 14 日真實波幅；以過去 22 日最高價減去 2.5 倍 ATR(14) 計算多頭動態防守線，並在股價波動時自適應調整保護區間。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 型別定義新增 `AtrResult` (含 `atr14`、`chandelierExit`、`volatilityPercentage`)
- [x] 於 `omniIndicatorEngine.ts` 實作 `calculateAtrAndChandelierExit`
- [x] 單元測試驗證 True Range 計算與 Wilder 平滑之準確性，以及無歷史資料時的安全回退
