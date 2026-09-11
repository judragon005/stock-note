# Ticket 04: 借貸編輯彈窗新增前次繳息基準日手動維護通道

## 🎯 任務目標
在 `src/components/LoanModal.tsx` 中，新增選填之「前次繳息/還款基準日 (`lastInterestPaymentDate`)」維護欄位，提供使用者手動校正或建立歷史借貸合約之靈活性。

---

## 🛠️ 具體變更要點
1. **狀態與表單欄位**：
   - 新增 `lastInterestPaymentDate` 狀態，初始帶入 `initialLoan?.lastInterestPaymentDate || ''`。
   - 在「借款起日」旁或下方新增輸入控制項：
     - Label: `前次繳息/還款基準日 (選填，留空預設與起日相同)`。
     - Type: `date`。
2. **保存時注入**：
   - 若有填寫且有效，則保存至 `LoanRecord.lastInterestPaymentDate`。
   - 若為空字串，則設為 `undefined` 或與 `startDate` 一致。
3. **借貸卡片連動**：
   - 編輯保存後，卡片立即以此日期重算「計息天數」與「當前應返還利息」。

---

## ✅ 驗收標準
- [ ] 編輯借貸時可手動將前次繳息日改為特定日期（如 `2026-09-10`）。
- [ ] 保存後借貸卡片立即動態更新計息天數與利息總額。
