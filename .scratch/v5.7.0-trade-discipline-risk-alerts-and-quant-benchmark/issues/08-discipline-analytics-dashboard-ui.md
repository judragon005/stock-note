# 子任務票券 #08: 全局紀律執行率與犯錯排行統計儀表板 (Discipline Analytics Dashboard UI)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/components/ClosedPositionsSummary.tsx`

---

## 🎯 任務目標
1. 在 `ClosedPositionsSummary.tsx` 頂部統計指標區塊擴充紀律風控量化維度：
   - 🎯 **全局紀律執行率**：遵守計畫之平倉筆數 / 已覆盤總筆數 $\times 100\%$。
   - ⭐ **平均紀律星級**：所有覆盤交易之平均評分。
   - ⚠️ **高頻犯錯排行榜 (TOP 3)**：統計最常發生的犯錯類型次數。
   - 💰 **紀律對比**：「守紀律平均損益」vs「違規平均損益」對比提示。

---

## 驗收標準
- [ ] 當無覆盤資料時，呈現友善的「尚未填寫覆盤」空狀態引導。
- [ ] 統計數據計算精確，無 NaN 或除以零異常。
