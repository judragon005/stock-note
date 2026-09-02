# 子票券 #03: 節稅沖銷對照智慧儀表板（最佳模式高亮）與沖銷歸因視圖

- **關聯 PRD**: `docs/specs/0038-lot-modal-glassmorphism-redesign-and-ux-enhancements.md` (AC-6, AC-8)
- **所屬主票券**: `issue-0038.md`
- **分流標籤**: `ready-for-agent`

---

## 🎯 任務目標
1. 升級「💡 節稅沖銷對照 (Tax Comparison)」頁籤為 4 格橫向卡片式比較儀表板（移動平均 vs FIFO vs LIFO vs HIFO）。
2. 自動標註 **👑 最佳節稅推薦模式 (Best Tax Efficiency)**，並計算相比移動平均「可省下/遞延之已實現獲利差額」。
3. 升級「📜 歷史賣出沖銷歸因」視圖，採用樹狀展開或層次卡片清晰呈現每筆賣出沖銷了哪些買進批次。
4. 撰寫組件單元測試，確保建置 0 TypeScript 錯誤與測試 100% 通過。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] 節稅對照頁籤清晰並列 4 種會計方法指標，最佳模式有金色/翠綠色高亮徽章。
- [ ] 歷史沖銷歸因視圖排版精美無文字黏連。
- [ ] `npm test` 與 `npm run build` 100% 綠燈通過。
