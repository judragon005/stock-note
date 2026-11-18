# ADR 0235: 宏觀戰情室 3.5 統一數據總線、風控計量精度與一鍵執行閉環

- **狀態**：已採用 (Accepted)
- **日期**：2026-11-18
- **關聯規格與票券**：Spec 0235 / GitHub Issue #584

## 背景與問題
戰情室 3.0 累積了四項結構性痛點：(1) 前端 `sanitizeMacroRecord` 未映射 `/api/market/macro` 的 `camelCase` / `snake_case` 鍵名導致靜默退回常數；(2) `maxDropToleranceTo130Percent` 多除以 `100`、`1-Day 95% VaR` 未扣除零波動現金、且晨報與簡報混用舊版單軌持股上限；(3) `WarRoomWorkspace.tsx` 膨脹至 2,266 行並重複渲染三套防護盾（含 `privacyMode` 明文外洩）；(4) 戰情室與 Zavy 慢富工作區呈現跨頁數據孤島。

## 決策
1. **統一宏觀數據海關 (`macroPulseStorage.ts`)**：實作 `normalizeMacroAliases` 雙向鍵名無損映射與 `mergeMacroSnapshot` 保值合併，動態重算 `vixLevel` / `fearAndGreedLevel`，並接通 FRED 真實信貸裂痕（`cccSpreadOAS` / `igSpreadOAS` / `breakeven10y`）與製造業週期指標及 `/api/market/breadth` 台美三期寬度。
2. **風控計量精度與單一權益上限基準 (SSOT)**：統一 `maxDropToleranceTo130Percent` 為 `0~1` 比例、`soxStressImpact3PctTWD` 依 `totalNavTwd` × 穿透半導體權重% × 3% 計算、1-Day 95% VaR 母體扣除現金、全頁及晨報簡報統一採用雙溫度計 `recommendedEquityCapPercent`。
3. **暗艙修枝與組合式子元件重構**：移除 L6/L8 重複卡片與重複按鈕；抽出 `MarketPulseAndCanariesCard`、`WarRoomMorningBriefCard`、`DualMomentumRotationCard`、`CatalystCalendarCard`、`useWarRoomMacroSync` 與 `warRoomBriefBuilder`，將 `WarRoomWorkspace.tsx` 收斂至 `<= 600` 行並全面貫通 `privacyMode` 與 `GLOBAL / TW / US` 視角聯動。
4. **跨頁校準共享**：擴充 `MacroQuickCalibrationModal` 8 項欄位並與 `ZavySlowWealthWorkspace` 共享 `macroPulseStorage` 快照與台美多週期寬度。
