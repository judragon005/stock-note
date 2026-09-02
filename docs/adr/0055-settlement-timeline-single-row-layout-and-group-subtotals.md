# ADR 0055: 在途資金交割時序排程單行條列化與分組小計架構決策 (Settlement Timeline Single-Row Layout & Group Subtotals)

## 狀態 (Status)

Accepted (已接受並實作)

## 背景與問題脈絡 (Context)

在「在途資金交割時序排程看板 (Settlement Timeline)」中，原先採用 CSS Grid 自適應多欄佈局（`repeat(auto-fit, minmax(280px, 1fr))`）。當某個時序分組（如「未來排程」）筆數較多（例如 4 筆以上）時，卡片寬度遭到嚴重壓縮，導致券商名稱（如「永豐大戶投 (2折/低消20元)」）文字被擠壓成單字直立斷行，完全破壞使用者閱讀體驗。同時，項目缺乏鮮明的時序倒數徽章與金流類別標籤，且各時間分組未提供區間資金淨額小計。

## 決策內容 (Decisions)

1. **全面轉向單行條列式佈局 (1 Row 1 Item)**：
   - 廢除時序區塊內的多欄 CSS Grid，改採垂直排列（`flex-direction: column`）的單行條列結構。
   - 保障每筆在途款項享有完整的橫向寬度，杜絕字元擠壓與垂直斷行。
2. **多維度視覺標籤與狀態膠囊**：
   - 左側：交割日期（日曆圖標 + 日期）+ 倒數膠囊（`今日到期`、`明日到期`、`N 天後`、`逾期 N 天`）+ 類別徽章（`股票買進`、`股票賣出`、`現金股息` 等）。
   - 中間：券商帳戶（加粗）+ 詳細備註（支援 Tooltip 與省略）。
   - 右側：等寬字體金額（正綠負紅）+ 一鍵核銷按鈕。
3. **時序分組小計與升冪排序**：
   - 維持五大時間區塊（🔴 逾期 / ⚡ 今日 / 📅 明日 / 🗓️ 本週 / 🔮 未來）。
   - 在各分組標題右側即時動態計算該組「淨現金流小計」（`小計: +NT$ ...`）。
   - 各分組內部嚴格按交割日由近至遠升冪排序。

## 影響與效益 (Consequences & Benefits)

- **優點**：
  - 徹底解決文字擠壓與閱讀障礙，大幅提升資訊掃視效率與 UI 質感。
  - 時序倒數膠囊與類別標籤提供極佳的決策輔助。
  - 分組小計讓用戶一眼掌握各週期之資金流動壓力。
- **影響範圍**：
  - `src/components/PendingSettlementCard.tsx`
  - `src/components/CashLedgerWorkspace.tsx`
  - `docs/specs/0055-settlement-timeline-single-row-layout-and-group-subtotals.md`
