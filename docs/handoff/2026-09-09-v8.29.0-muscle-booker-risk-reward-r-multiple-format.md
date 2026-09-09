# 肌肉書僮風益比全面統一專業 R 倍數規範交接手冊 (v8.29.0 Handoff)

## 1. 本次迭代任務摘要

- **分支名稱**：`fix/0110-muscle-booker-risk-reward-r-multiple-format`
- **對應規格書**：`docs/specs/0110-muscle-booker-risk-reward-r-multiple-format-spec.md`
- **對應 ADR**：`docs/adr/0110-muscle-booker-risk-reward-r-multiple-format.md`
- **對應本地票券**：`.scratch/v8.29.0-muscle-booker-risk-reward-r-multiple-format/issues/` (01~03 號，均已 CLOSED)

---

## 2. 核心架構變更與修復

### 2.1 引擎層輸出標準化
- 在 `src/engine/muscleBookerEngine.ts`：
  - `riskRewardRatio` 欄位全面改為 `${rrRatio}R`（例如 `7.9R`、`2.0R`），消除多餘的 `1 :`。
  - `BEGINNER_TOOLTIPS.riskReward` 對齊 R 倍數概念與 2.0R 門檻。

### 2.2 工作區 UI 全局對齊
- 在 `src/components/MuscleBookerWorkspace.tsx`：
  - 看板說明文字：「突破箱頂且 20MA 扣低走揚，風益比 ≥ 2.0R 優先置頂，勝率與動能俱佳。」
  - 看板右上角 Badge：`{top3BuyItems.length} 檔 · 風益比 ≥ 2.0R`。
  - 看板卡片：`🔥 風益比: {item.actionDecision.riskRewardRatio}` ➔ 直接輸出 `🔥 風益比: 7.9R`。
  - 三色操盤導航儀與表格儲存格：直接渲染 `{item.actionDecision.riskRewardRatio}`，不再外掛多餘空格或重複 R。

---

## 3. 測試與驗證成果

- 單元測試：`src/engine/muscleBookerEngine.test.ts` (14/14 passed) 與 `src/components/MuscleBookerWorkspace.test.ts` (20/20 passed)。
- 全量單元測試：57 套件、654 個測試案例 100% 綠燈通過。
- TypeScript 構建：`npm run build`（tsc + vite build）0 錯誤通過。
