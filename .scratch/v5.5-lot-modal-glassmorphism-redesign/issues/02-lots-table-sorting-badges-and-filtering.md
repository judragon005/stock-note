# 子票券 #02: 批次明細表格升級（動態排序、長短期標籤、年份過濾）

- **關聯 PRD**: `docs/specs/0038-lot-modal-glassmorphism-redesign-and-ux-enhancements.md` (AC-3, AC-4, AC-5)
- **所屬主票券**: `issue-0038.md`
- **分流標籤**: `ready-for-agent`

---

## 🎯 任務目標
1. 批次明細表格改寫為具備清晰邊框、Padding、斑馬紋與懸停高亮的現代化樣式。
2. 數值與價格欄位靠右對齊並套用 `var(--font-mono)` 等寬字型，修正文字黏連缺陷。
3. 實作表頭動態點擊排序（`buyDate`、`remainingShares`、`buyPrice`、`unitCost`、`unrealizedPnL`、`holdingDays` 升/降冪）。
4. 實作「長短期稅務持有期」動態膠囊標籤（綠色長期 $\ge 365$ 天、藍色短期）。
5. 實作「年份快速過濾晶片」（`全部` / 各年份切換）。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] 批次表格數值靠右對齊，日期與股數絕不黏連。
- [ ] 點擊各表頭欄位能精準觸發升冪 / 降冪排序切換，並顯示排序箭頭指示。
- [ ] $\ge 365$ 天標記為綠色長期，$< 365$ 天標記為藍色短期。
- [ ] 切換年份晶片能即時篩選對應年份買進之批次。
