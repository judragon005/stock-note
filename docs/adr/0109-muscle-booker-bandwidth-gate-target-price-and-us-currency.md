# 0109. 肌肉書僮布林帶寬審查硬門檻 (Bandwidth <= 8%)、作戰看板目標價對齊與美股 US$ 貨幣別標示架構 (Muscle Booker Bandwidth Gate, Target Price Alignment & US Currency)

- **狀態**：ACCEPTED
- **日期**：2026-09-09
- **議題**：落實肌肉書僮核心心智模型——「非單純風益比 $\ge 2.0$，更需帶寬 $< 8.0\%$ 極致收斂且方向確立方可進場」；解決上方看板漏標目標價與風益比格式 Bug；統一美股標的價格前綴為 `US$` 並消除下方表格截斷。

---

## 背景與問題陳述 (Context & Problem Statement)

在肌肉書僮動能雷達上線後，使用者深度審查時提出三大關鍵反饋：
1. **買進決策缺乏帶寬硬門檻 (Bandwidth Gate Missing)**：
   - 使用者手寫紅字明確叮囑：**「不是單純風益比 $\ge 2.0$，還要帶寬 $< 8.0\%$，同時方向確立」**。
   - 原引擎在 `evaluateMuscleBookerAction` 中，只要突破箱頂且 20MA 向上就判定為 `BUY`，忽略了布林帶寬若處於發散（例如帶寬 $12\% > 8\%$）已屬行情末端或過度擴張，切忌追高，必須安全降級為 `HOLD`（觀望）。
2. **上下作戰資訊不一致 (Information Inconsistency)**：
   - 上方「今日買進先鋒」卡片展示了現價、防守價與風益比，但**漏掉了目標價**（下方表格展開有 `目標價: $397.61`），導致使用者無法直觀評估獲利空間。
   - 上方風益比文字拼裝出現 `🔥 風益比: 1:1:6.0R` 重複冒號字元。
   - 下方表格原寫死 `.slice(0, 15)`，造成第 16 檔之後標的在下方無法對照。
3. **美股貨幣別混淆 (Currency Formatting)**：
   - 美股標的顯示如 `$368.16`，與台股 `$` 符號混淆。使用者要求：**「在美股顯示的時候，希望它的貨幣別加上 US」**（例如 `US$ 368.16`）。

---

## 決策方案 (Decision)

1. **布林帶寬審查硬門檻 (`evaluateMuscleBookerAction`)**：
   - 審查條件：在突破箱頂（BREAKOUT_UP）且 20MA 向上時，強制檢查 `bbands.bandwidth <= 8.0`。
   - 安全降級：若 `bbands.bandwidth > 8.0`，即使站上箱頂，一律降級為 `HOLD`（「🟡 觀望 (帶寬未收斂)」），並於主理由明確標示：「帶寬未極致收斂 (X% > 8.0%)，非壓縮爆發起點，切忌追高」。
   - 精確進場：只有同時滿足「帶量突破箱頂」、「帶寬極致收斂 ($\le 8.0\%$)」、「20MA 向上」且「風益比 $\ge 2.0$」四重共振，方可發出 `BUY` 決策。

2. **作戰卡片目標價補齊與風益比格式修復**：
   - 上方買進先鋒卡片補齊目標價展示：`目標: {formatCurrencyPrice(item.actionDecision.targetPrice, item.market)}`。
   - 修正風益比格式字串，直接使用引擎標準化輸出之 `{item.actionDecision.riskRewardRatio}R`，杜絕重複 `1:`。
   - 下方表格移除 `.slice(0, 15)` 硬截斷，支援完整標的對照。

3. **美股貨幣別統一標示 (`formatCurrencyPrice`)**：
   - 建立高階貨幣格式化器：
     ```typescript
     export const formatCurrencyPrice = (price?: number, market?: 'TW' | 'US'): string => {
       if (price === undefined || price === null || isNaN(price)) return '-';
       const formatted = price >= 1000 ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price.toFixed(2);
       return market === 'US' ? `US$ ${formatted}` : `$${formatted}`;
     };
     ```
   - 全面套用於作戰看板、三色導航儀與均線扣抵表格之現價、防守價、目標價與扣抵價。

---

## 結果與影響 (Consequences)

### 正向影響 (Positive)
- **回歸短線聖經靈魂**：嚴格落實「壓縮、爆發、方向確立」的交易紀律，杜絕擴張末段追高風險。
- **作戰資訊 100% 垂直對齊**：上方作戰看板與下方表格的現價、防守價、目標價、風益比完全一致。
- **貨幣別清晰無歧義**：美股標的全面標記 `US$`，台股標的標記 `$`，使用者體驗大幅躍升。
- **高標準工程質量**：全專案 57 套件、654 個單元測試 100% 綠燈通過，TypeScript 0 型別錯誤，Vite 生產構建無瑕疵。
