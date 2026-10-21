# Ticket 17: 戰情室底層卡片集成測試：跨 5 大任務視圖常駐驗收

## 1. 任務目標
在 `src/components/aiForceDashboard/AiForceDashboardView.test.tsx` 中新增端到端集成測試，驗證「AI 戰情提示詞與外聯中樞」在戰情室中的正確渲染與跨視圖常駐。

## 2. 修改範圍
* `src/components/aiForceDashboard/AiForceDashboardView.test.tsx`:
  - 測試案例 1：驗證主力戰情室預設渲染底層外聯提示詞卡片。
  - 測試案例 2：切換至 `TASK_2_TECHNICAL_ALERTS` 與 `TASK_3_KD_MA`，驗證提示詞卡片仍正常存在於 DOM 中。
  - 測試案例 3：驗證預設包含一鍵複製按鈕與脫敏開關。

## 3. 驗收標準 (AC)
- [ ] 執行 `npx vitest run src/components/aiForceDashboard/AiForceDashboardView.test.tsx` 100% 通過。
- [ ] 斷言嚴謹，防止未來改版誤刪。
