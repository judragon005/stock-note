# 06 — Financial Safety, Solvency & Net Cash Engine

**What to build:**
實作財務結構與清償能力計算模組 `src/engine/financialSafetyEngine.ts`。計算負債比率 (Debt Ratio)、速動比率 (Quick Ratio，嚴格剔除存貨與預付款)，以及真實淨現金水位（$\text{Net Cash} = \text{現金及約當現金} - \text{有息負債}$）。當流動資產中存貨比例過高時，精準破解虛假流動比率。

**Blocked by:** 01-financial-types-and-schema.md

**Status:** ready-for-agent

- [x] 實作負債比率、速動比率與淨現金水位計算純函式
- [x] 實作利息保障倍數評估（若利息費用可得）
- [x] 當速動比率 < 100% 且淨現金 < 0 時輸出安全性警戒標籤
- [x] 單元測試驗證零負債、零現金與存貨佔比高達 80% 時之安全性真實評級
