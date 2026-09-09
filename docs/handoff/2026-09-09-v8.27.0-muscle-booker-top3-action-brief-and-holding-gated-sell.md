# V8.27.0 交接文件 (Handoff Documentation)

## 版本主題

肌肉書僮動能雷達：今日核心作戰指令 (Top 3 買進先鋒 vs 在庫持股限定賣出) 與自適應色彩主題

---

## 交付成果概述

1. **今日核心作戰指令看板 (Top 3 Action Directives)**：
   - 位於肌肉書僮雷達核心視覺區（三色操盤導航儀上方）。
   - **左欄【🟢 今日買進先鋒 (Top 3 BUY)】**：精選風益比 $\ge 2.0$ 標的，依數值由大到小降序排列，最多呈現前 3 檔；無標的時顯示優雅空狀態。
   - **右欄【🔴 在庫賣出停損 (Holding-Gated SELL)】**：嚴格限定在庫持股（`shares > 0` 且 `action === 'SELL'`），顯示在庫股數、原防守線與停損原因；若在庫持股均安全無破線，顯示「0 檔 · 🟢 目前在籍持股均在防守線之上，無持股需賣出 (持倉安全)」。
2. **三色導航儀與持股警戒聯動**：
   - 在導航儀賣出卡片中加入 `🚨 在庫` 標籤，明確區分在籍持股與市場觀察股。
3. **動態主題色彩自適應**：
   - 買進卡片與標籤全面綁定 `var(--gain-color)`、`var(--gain-bg)`、`var(--gain-border)`。
   - 賣出卡片與標籤全面綁定 `var(--loss-color)`、`var(--loss-bg)`、`var(--loss-border)`。
   - 完美相容台股模式（紅漲綠跌）與國際/美股模式（綠漲紅跌）。
4. **測試覆蓋與品質把關**：
   - 單元測試套件 `MuscleBookerWorkspace.test.ts` 新增 Top 3 買進、在庫賣出限定、0 檔安全狀態驗證。
   - 57 個測試套件、653 個單元測試 100% 綠燈通過。
   - `npm run build` 0 TypeScript 型別錯誤。

---

## 相關文件與變更追蹤

- PRD 規格書：[docs/specs/0108-muscle-booker-top3-action-brief-and-holding-gated-sell-spec.md](file:///d:/APP/股票紀錄/docs/specs/0108-muscle-booker-top3-action-brief-and-holding-gated-sell-spec.md)
- 架構決策記錄：[docs/adr/0108-muscle-booker-top3-action-brief-and-holding-gated-sell.md](file:///d:/APP/股票紀錄/docs/adr/0108-muscle-booker-top3-action-brief-and-holding-gated-sell.md)
- 本地任務票券：[01-holding-gated-sell-computation-logic.md](file:///d:/APP/股票紀錄/.scratch/v8.27.0-muscle-booker-top3-action-brief-and-holding-gated-sell/issues/01-holding-gated-sell-computation-logic.md)、[02-top3-combat-command-board-ui.md](file:///d:/APP/股票紀錄/.scratch/v8.27.0-muscle-booker-top3-action-brief-and-holding-gated-sell/issues/02-top3-combat-command-board-ui.md)、[03-traffic-light-matrix-holding-tag-alignment.md](file:///d:/APP/股票紀錄/.scratch/v8.27.0-muscle-booker-top3-action-brief-and-holding-gated-sell/issues/03-traffic-light-matrix-holding-tag-alignment.md)、[04-unit-tests-and-build-verification.md](file:///d:/APP/股票紀錄/.scratch/v8.27.0-muscle-booker-top3-action-brief-and-holding-gated-sell/issues/04-unit-tests-and-build-verification.md)（全數 CLOSED）
