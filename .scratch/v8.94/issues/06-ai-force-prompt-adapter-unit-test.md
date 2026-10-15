# Ticket 06: 編寫 aiForceToPromptDigestAdapter 專用單元測試

## 1. 任務目標
為 `src/engine/aiForcePromptAdapter.ts` 撰寫完整的單元測試 `src/engine/aiForcePromptAdapter.test.ts`，涵蓋台股真實報表、美股報表、ETF 標的與邊界空報表等所有分支。

## 2. 修改範圍
* 新增檔案：`src/engine/aiForcePromptAdapter.test.ts`
  - 測試案例 1：完整台股報表（2330）映射驗證，確認外資、投信、融資與均線特徵正確抽取。
  - 測試案例 2：美股報表（NVDA）映射驗證，確認市場標籤標記為 US。
  - 測試案例 3：持股部位脫敏計算驗證（獲利續抱、佔比級距）。
  - 測試案例 4：缺漏資料與空物件安全性驗證。

## 3. 驗收標準 (AC)
- [ ] 執行 `npx vitest run src/engine/aiForcePromptAdapter.test.ts` 100% 通過。
- [ ] 覆蓋率達標，無未捕獲之邊界例外。
