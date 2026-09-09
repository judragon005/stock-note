# 0110 規格書：肌肉書僮風益比全面統一專業 R 倍數規範 (Muscle Booker Risk-Reward R-Multiple Format Spec)

## 1. 概述 (Overview)

本規格定義肌肉書僮動能雷達中，風益比（Risk-Reward Ratio）顯示格式的全面規範化。徹底解決過去上方說明文字寫「風益比 ≥ 2:1」與下方卡片顯示「🔥 風益比: 1 : 7.9R」之上下方向顛倒矛盾、以及「1 :」與「R」冗贅混搭語病，全面統一為國際交易界標準之「**R 倍數制 (R-Multiple)**」（例如：`7.9R`、`≥ 2.0R`）。

---

## 2. 問題診斷與痛點 (Root Cause & Pain Points)

1. **上下方向矛盾**：
   - 上方文字寫「風益比 ≥ 2:1 優先置頂」（獲利放前面，風險放後面）。
   - 下方卡片卻顯示「🔥 風益比: 1 : 7.9R」（風險放前面，獲利放後面）。
   - 上下方向完全顛倒，造成使用者直覺認知混亂。
2. **格式語病與冗贅字符**：
   - 卡片中拼裝了 `1 :` 同時又在尾部加上 `R`（輸出 `1 : 7.9R`），在量化交易文法上極度怪異。
3. **全局格式未收斂**：
   - 右上角標籤寫 `風益比 ≥ 2.0`、導航儀卡片寫 `1 : 7.9 R`、下方表格展開又寫 `風益比: 1 : 7.9 R`，全站缺乏單一格式規範。

---

## 3. 功能需求與詳細規格 (Functional Specifications)

### 3.1 引擎層標準化 (`src/engine/muscleBookerEngine.ts`)
- `MuscleBookerActionDecision` 中：
  - `riskRewardRatio`：統一格式化為 `${rrRatio}R`（如 `7.9R`、`2.1R`），杜絕多餘的 `1 :`。
  - `riskRewardRatioValue`：保持浮點數數值（如 `7.9`、`2.1`），供排序與硬門檻判定（$\ge 2.0$）。
- `BEGINNER_TOOLTIPS.riskReward`：
  - 修正解說內容，對齊「R 倍數 (R-Multiple)」概念：「💡【股市小白指南】風益比 (Risk-Reward Ratio, 以 R 倍數表示)：代表每承受 1 單位停損風險 (1R)，預期能賺取的獲利倍數。例如 7.9R 代表獲利是潛在停損的 7.9 倍！數值越大越好，通常大於 2.0R 才是高勝算買點。」

### 3.2 畫面層全面統一 (`src/components/MuscleBookerWorkspace.tsx`)
1. **作戰指令看板（今日買進先鋒 Top 3 BUY）**：
   - 說明文字：`突破箱頂且 20MA 扣低走揚，風益比 ≥ 2.0R 優先置頂，勝率與動能俱佳。`
   - 右上角 Badge：`{top3BuyItems.length} 檔 · 風益比 ≥ 2.0R`
   - 買進卡片指標：`🔥 風益比: {item.actionDecision.riskRewardRatio}`（渲染出 `🔥 風益比: 7.9R`）
2. **三色操盤導航儀**：
   - 買進卡片指標：`🔥 風益比: {item.actionDecision.riskRewardRatio}`（渲染出 `🔥 風益比: 7.9R`）
3. **均線扣抵望遠鏡表格**：
   - 展開操盤小抄：`風益比: {item.actionDecision.riskRewardRatio}`（渲染出 `風益比: 7.9R`）

---

## 4. 驗收標準 (Acceptance Criteria)

1. **視覺一致性**：
   - 作戰看板卡片清晰展示 `🔥 風益比: 7.9R`，完全無 `1 :` 冗贅字符。
   - 上方文字與 Badge 統一標示 `風益比 ≥ 2.0R`。
2. **單元測試 100% 綠燈**：
   - 測試中所有 `riskRewardRatio` 驗證改為檢查包含 `R` 且不包含 `1 :`。
   - 全專案 57 個測試套件、654 個測試全數通過。
3. **TypeScript 0 錯誤**：
   - `npm run build` 通過。
