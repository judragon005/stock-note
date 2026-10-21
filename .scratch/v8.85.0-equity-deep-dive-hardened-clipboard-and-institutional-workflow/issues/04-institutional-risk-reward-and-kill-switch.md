# Ticket 04: 券商與買方法人風控升級：即時 R-Multiple 計算、論點證偽條款 Kill-Switch 與借券 SBL 警示

## 關聯規格
- Spec: `docs/specs/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow-spec.md` (Story C / AC US-07, US-08, US-09)

## 問題背景
現有 7 步投研引擎為單向散戶定性框架，缺少買方法人建倉必看的非對稱風報比（R-Multiple）、缺少基本面破壞時的強制停損安全閥（Kill-Switch），且籌碼 Prompt 忽略了台股外資放空最關鍵的借券賣出（SBL）與處置股票流動性折價。

## 任務細節
1. 修改 `src/types/equityDeepDive.ts`：
   - 擴充 `InvestmentMemoRecord`，新增 `thesisInvalidation?: string`（核心論點失效條件 / 證偽開關）、`targetPositionWeight?: number`。
2. 修改 `src/engine/equityDeepDiveEngine.ts`：
   - 升級步驟 4（市場沒說的事）：若為台股，Prompt 自動提示「檢視外資借券賣出餘額與券資比異常」；若為處置股票，提示「處置分盤流動性凍結與預留滑價空間」。
   - 升級步驟 6（籌碼解讀）：加入主力借券避險與大戶籌碼集中度分析提問。
   - 升級步驟 7（投資筆記範本）：新增「核心論點失效條件（Kill-Switch）」。
3. 修改 `src/components/equityDeepDive/EquityDeepDiveModal.tsx`：
   - 即時計算 R-Multiple 風報比：
     $$\text{RiskRewardRatio} = \frac{\text{目標價} - \text{現價}}{\text{現價} - \text{停損價}}$$
   - 在目標價與停損價下方渲染動態風報比徽章（$\ge 3.0R$ 綠色「優良機構風報比」、$2.0 \sim 3.0R$ 藍色「合理風報比」、$< 2.0R$ 紅色「警示：風報比過低」）。
   - 在表單中新增「核心論點失效條件（證偽開關 Kill-Switch）」輸入框，並一併持久化。

## 驗收標準
- [x] 單元測試 `equityDeepDiveEngine.test.ts` 覆蓋新增的 Prompt 範本與欄位。
- [x] 在 Modal 輸入現價 100、目標價 130、停損價 90，正確顯示 `3.00R (優良機構風報比)`。
- [x] 儲存並重新開啟 Modal，`thesisInvalidation` 欄位內容被完整復原。
