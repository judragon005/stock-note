# Ticket #02: 投資組合總覽 (Portfolio) 核心看板與庫存表格 UI/UX 升級

## 🎯 目標 (Objective)
升級投資組合總覽頁面（SummaryCards、AllocationChart、HoldingsTable），大幅提升金融數值掃描易讀性、資產配置視覺層次與持股表格操作體驗。

## 📋 任務清單 (Tasks)
- [x] 重構 `src/components/SummaryCards.tsx`：
  - 總資產市值與當日損益大字等寬排版 (Tabular Numbers)。
  - 損益卡片柔和漸變邊框（台股紅/綠 與 國際綠/紅 雙主題完美相容）。
  - 淨槓桿率、XIRR、質押維持率、利息收入膠囊整合。
- [x] 重構 `src/components/AllocationChart.tsx`：
  - 市場分佈 (台股/美股/現金) 比例 HUD 晶片與三段式微漸變進度條。
  - 樹狀圖、權重清單、再平衡模擬器切換按鈕統一。
- [x] 重構 `src/components/HoldingsTable.tsx`：
  - 持倉中 / 已平倉 / 全部總覽 三態膠囊與計數器。
  - 表格標頭現代深色排版與行懸停微光反饋。
  - 快速買進加碼、賣出平倉微膠囊按鈕群。

## 🛡️ 驗收標準 (Acceptance Criteria)
- [x] 庫存計算、除息平滑、外匯拆解、技術訊號膠囊與 XIRR 透視 100% 保持正常。
- [x] TypeScript 編譯 0 錯誤。
- [x] 單元測試全量通過。
