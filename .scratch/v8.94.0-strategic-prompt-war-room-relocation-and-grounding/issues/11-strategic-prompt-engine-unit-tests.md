# Ticket 11: 提示詞引擎全維度單元測試升級 (strategicPromptEngine.test.ts)

## 1. 任務目標
升級 `src/engine/strategicPromptEngine.test.ts`，全量覆蓋 Spec 0181 新增的字串工程特徵：時態標籤、確定性算術、紅隊反討好指令、台美股雙軌隔離。

## 2. 修改範圍
* `src/engine/strategicPromptEngine.test.ts`:
  - 測試案例 1：驗證台股 Prompt 包含時態分割聲明 (`market_time_dimension`)。
  - 測試案例 2：驗證算術停損價 (`pre_calculated_pivots`) 數值正確。
  - 測試案例 3：驗證反討好指令存在於 Prompt。
  - 測試案例 4：驗證美股標的 Prompt 乾淨，無台股專屬法人資券欄位。

## 3. 驗收標準 (AC)
- [ ] 執行 `npx vitest run src/engine/strategicPromptEngine.test.ts` 100% 綠燈通過。
- [ ] 所有新特徵均有嚴格斷言防禦。
