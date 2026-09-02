# 子任務票券 #06: 持股清單風控狀態標籤與距離 Tooltip (Holdings Table Risk Badges UI)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/engine/calculator.ts`
  - `src/components/HoldingsTable.tsx`

---

## 🎯 任務目標
1. 升級 `src/engine/calculator.ts`：
   - 於計算 `HoldingPosition` 時，整合標的最新的有效停損/停利計畫，呼叫 `evaluateRiskStatus` 與 `calculateRiskDistances` 產生 `riskMetrics`。
2. 升級 `src/components/HoldingsTable.tsx`：
   - 在個股代碼旁或現價旁顯示風控標籤：
     - 🚨 `觸及停損`（跌破停損線）
     - 🎯 `達標停利`（超越停利線）
     - ⚠️ `接近停損`（離停損點 $\le 3\%$）
     - 💡 `接近停利`（離停利點 $\le 3\%$）
   - 搭配 Tooltip 顯示具體停損價、停利價與距離百分比。

---

## 驗收標準
- [ ] 當現價變更時，風控標籤能即時響應切換。
- [ ] 既有持股表格排序、模式切換（券商/總報酬）與沖銷明細完全相容。
