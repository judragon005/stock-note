# 子任務票券 #07: 平倉標的賽後覆盤檢討卡片 (Closed Discipline Review Card UI)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/components/ClosedPositionsSummary.tsx`
  - `src/utils/storage.ts`

---

## 🎯 任務目標
1. 升級 `ClosedPositionsSummary.tsx`：
   - 當使用者在已平倉表格點擊展開單檔平倉標的時，呈現「📝 賽後覆盤檢討卡片」。
   - 支援勾選「是否遵守交易計畫 (Yes/No)」。
   - 支援選擇犯錯行為標籤（追高、凹單、過早停利、情緒化重押、盲目進場等）。
   - 支援 1 ~ 5 顆星紀律評分 ⭐。
   - 支援填寫學習心得與檢討筆記。
2. 覆盤內容直接綁定該標的最後一筆平倉 `TradeRecord`，並持久化至 IndexedDB / LocalStorage。

---

## 驗收標準
- [ ] 覆盤紀錄填寫後即時儲存，重整頁面後內容完好無缺。
