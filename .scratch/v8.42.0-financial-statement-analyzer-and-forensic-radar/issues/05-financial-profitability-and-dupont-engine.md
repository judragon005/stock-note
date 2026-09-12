# 05 — Profitability Metrics & DuPont Analysis Engine

**What to build:**
實作獲利能力指標純計算模組 `src/engine/financialProfitabilityEngine.ts`。計算近 8 季的毛利率 (Gross Margin)、營業利益率 (Operating Margin)、稅後淨利率 (Net Margin)，並執行 ROE 杜邦三因子拆解（$\text{ROE} = \text{淨利率} \times \text{資產週轉率} \times \text{權益乘數}$），自動評估高 ROE 是否由高負債槓桿虛胖造成。

**Blocked by:** 01-financial-types-and-schema.md

**Status:** ready-for-agent

- [x] 實作三率計算與 YoY / QoQ 連續趨勢變動率純函式
- [x] 實作杜邦三因子拆解純函式，輸出獲利貢獻、效率貢獻與槓桿貢獻分析
- [x] 當權益乘數過高時輸出 `HIGH_LEVERAGE_DRIVEN` 標籤
- [x] 單元測試驗證零營收、負淨利、負權益等極端邊界計算防護
