# 肌肉書僮帶寬審查硬門檻、目標價一致性與美股 US$ 標示交接手冊 (v8.28.0 Handoff)

## 1. 本次迭代任務摘要

- **分支名稱**：`feature/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency`
- **對應規格書**：`docs/specs/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency-spec.md`
- **對應 ADR**：`docs/adr/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency.md`
- **對應本地票券**：`.scratch/v8.28.0-muscle-booker-bandwidth-gate-target-price-and-us-currency/issues/` (01~04 號，均已 CLOSED)

---

## 2. 核心架構變更與修復

### 2.1 買進決策強制布林帶寬審查硬門檻 (Bandwidth <= 8%)
- 在 `src/engine/muscleBookerEngine.ts` 之 `evaluateMuscleBookerAction` 中：
  - 突破箱頂（BREAKOUT_UP）且 20MA 翻揚時，優先審查 `bbands.bandwidth <= 8.0`。
  - 若 `bbands.bandwidth > 8.0`，安全降級為 `HOLD`（「🟡 觀望 (帶寬未收斂)」），主理由明確標示：「帶寬未極致收斂 (X% > 8.0%)，非壓縮爆發起點，切忌追高」。
  - 確保僅有真正「壓縮、爆發、方向確立」之標的進入 `BUY` 決策。

### 2.2 上方看板目標價補齊與風益比格式修正
- 在 `src/components/MuscleBookerWorkspace.tsx`：
  - 「今日買進先鋒」卡片補齊目標價：`目標: {formatCurrencyPrice(item.actionDecision.targetPrice, item.market)}`。
  - 修復重複字元 Bug：消除 `1:1:6.0R`，正確輸出為 `1 : 6.0R`。
  - 下方均線扣抵表格移除 `.slice(0, 15)` 硬截斷，支援所有標的完整對照。

### 2.3 美股貨幣別統一標示 `US$`
- 實作 `formatCurrencyPrice(price?: number, market?: 'TW' | 'US')` 函數：
  - 美股標的：統一輸出 `US$ {price}`（例如 `US$ 368.16`）。
  - 台股標的：統一輸出 `$ {price}`（例如 `$1,010`）。
  - 全面套用於作戰看板、三色導航儀與表格所有價格欄位。

---

## 3. 測試與構建綠燈清單

- **單元測試**：57 個測試套件、654 個測試案例 100% 通過（`src/engine/muscleBookerEngine.test.ts` 14 tests 通過、`src/components/MuscleBookerWorkspace.test.ts` 20 tests 通過）。
- **型別與構建**：`npm run build`（tsc + vite build）零錯誤通過。

---

## 4. 下一步維護建議

- 盤後或盤中觀察使用者清單，若有任何特殊股票之布林帶寬極限值需要客製化調整，可藉由 `bbands.bandwidth` 門檻做設定。
