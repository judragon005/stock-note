# 技術債 #0012: 資產配置目標偏離 (Drift) 試算與再平衡補單推薦器 (Target Allocation Drift & Rebalancing)

- **狀態**：`RESOLVED`（已於 v7.0.0 / PRD #0065 完整實作）
- **優先級**：`P3`
- **發現來源**：專業金融軟體架構審查 (Financial Software Engineering Audit)
- **建立日期**：2026-08-26
- **解決日期**：2026-09-02
- **標籤**：`Portfolio` · `Rebalancing` · `Asset-Allocation` · `Workflow`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統具備 `AllocationChart.tsx`（市場/幣別/產業佔比圓餅圖）與 `TreemapChart.tsx`（個股市值與損益樹狀圖）。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **缺乏目標資產配置模型 (Target Asset Allocation)**：原本僅能「被動呈現」當前資產佔比，無法讓投資人設定「目標比例」（例如：美股核心 50%、台股權值 30%、債券/現金 20%）。
  2. **缺乏偏離度 (Drift) 與再平衡下單建議**：當某類資產因大漲或大跌偏離目標權重時，系統無法自動計算「偏離百分比」與「建議買賣金額/股數」。
* **解決方式**：
  已於 **PRD #0065** 完整建立：
  - `src/types/allocation.ts`：雙軌目標模型與再平衡型別。
  - `src/engine/rebalancingEngine.ts`：偏離度分析、定期注水加碼、全量買賣再平衡與下單顆粒度換算。
  - `src/components/RebalancingView.tsx` 與 `src/components/AllocationChart.tsx`：深度整合目標配置與再平衡工作台。

---

## 3. 實作驗證結果 (Implementation & Verification)

- **單元測試**：`src/engine/rebalancingEngine.test.ts` 7 項測試 100% 通過。
- **全量測試**：437 項測試 100% 通過，`npm run build` TypeScript 0 錯誤。
