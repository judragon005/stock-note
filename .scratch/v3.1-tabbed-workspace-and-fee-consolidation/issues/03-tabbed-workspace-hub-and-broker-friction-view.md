# Ticket #3: [UI/UX] 活頁本工作台 (Tabbed Workspace Hub) 與獨立券商摩擦中心視圖

- **狀態**: Completed
- **規格書**: [SPEC-0014](../../../docs/specs/0014-tabbed-workspace-and-broker-fee-consolidation.md)
- **架構決策**: [ADR-0014](../../../docs/adr/0014-tabbed-workspace-and-broker-fee-consolidation.md)

---

## 任務目標 (Objective)
重構主頁面長度與佈局，導入現代玻璃擬態「活頁本 (Tabbed Workspace)」導覽架構，將整個系統劃分為三大視圖（📊 投資組合總覽、📜 交易歷史帳本、⚡ 券商與摩擦成本中心），提供獨立內嵌操作體驗與狀態記憶。

---

## 實作範圍 (Scope)
1. **活頁導覽列元件 (`src/components/WorkspaceTabs.tsx`)**：
   - 定義 3 大頁籤：`portfolio` (📊 投資組合總覽與持倉), `ledger` (📜 歷史交易帳本), `friction` (⚡ 券商與摩擦成本中心)。
   - 支援現代發光指示條、Badge 標註與平滑切換動畫。
2. **券商與摩擦中心內嵌面板 (`src/components/BrokerAndFrictionHub.tsx`)**：
   - 整合原本的 4 大摩擦指標看板、券商帳戶 CRUD 清單與衝擊分析，在獨立頁籤中直接呈現，不需依賴彈窗。
3. **App 佈局與狀態記憶 (`src/App.tsx`)**：
   - 管理 `activeTab` 狀態並持久化於 LocalStorage。
   - 依據 `activeTab` 條件渲染對應活頁內容。
4. **Header 精簡與快速跳轉**：
   - 點擊 Header 的「摩擦成本」或「券商設定」按鈕時，可直接平滑切換至 Tab 3。

---

## 驗收條件 (Acceptance Criteria)
- [ ] 3 大活頁能流暢切換且視覺效果具現代高質感。
- [ ] 券商管理與摩擦成本分析可在 Tab 3 內直接進行編輯與試算。
- [ ] 重新整理頁面後，能正確恢復上次停留在哪一個 Tab。
