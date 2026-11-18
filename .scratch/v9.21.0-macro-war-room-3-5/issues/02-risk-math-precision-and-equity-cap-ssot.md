# 02 — 風控計量精度修復與單一權益上限基準 (Math Precision & Single Equity Cap SSOT)

**Parent:** #584 (Spec 0235)

**What to build:** 修復個人防護盾與晨報三大計量失真：① 移除 `useWarRoomPortfolioMetrics` 中 `maxDropToleranceTo130Percent` 多餘的 `/ 100`，使 200% 維持率精確輸出 `0.35` (`-35.0%`)；② 補算 `soxStressImpact3PctTWD = Math.round(navTWD * (effectiveSemiWeight / 100) * 0.03)` 與加權 `portfolioBeta`；③ 修正 `1-Day 95% VaR` 計算母體為扣除零波動現金後之實質風險資產市值 (`Math.max(0, navTWD - cashTWD)`)；④ 統一晨報與複製簡報使用 `evaluateMacroDualThermometer(macro).strategicRegime.recommendedEquityCapPercent` 作為唯一建議總倉位上限。

**Blocked by:** 01 — 統一宏觀數據海關正規化器

**Status:** ready-for-agent

- [ ] 維持率 200% 時 `maxDropToleranceTo130Percent` 為 `0.35`（UI 顯示 `-35.0%`）
- [ ] 存在半導體穿透曝險時 `soxStressImpact3PctTWD` 精確等於 `NAV * SemiWeight% * 3%`
- [ ] 高現金部位帳戶之 `1-Day 95% VaR` 顯著低於同淨值滿倉股票帳戶
- [ ] 晨報調倉減碼試算與頂部雙溫度計建議持股上限 100% 一致
- [ ] `useWarRoomPortfolioMetrics.test.ts` 與 `macroAdvisorEngine.test.ts` 全數通過
