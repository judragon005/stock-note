# 001 — pending-settlement-card-single-row-component-refactoring

**What to build:**
重構 `src/components/PendingSettlementCard.tsx` 為單行條列式 (1 Row 1 Item) 元件。以橫向 Flex 佈局取代窄幅卡片，包含三段式資訊區塊：
1. **左側時序區**：交割日期（日曆圖示 + 日期）、時序倒數膠囊（`今日到期`、`明日到期`、`N 天後`、`逾期 N 天`）、交易類別徽章（`股票買進`、`股票賣出`、`現金股息`、`利息收入` 等）。
2. **中間資訊區**：券商交割戶名稱（加粗）+ 詳細備註與標的說明（支援自動省略與 Tooltip 懸浮完整資訊）。
3. **右側操作區**：高對比等寬字體金額（正數綠色、負數紅色）+ 「一鍵核銷」按鈕。

**Blocked by:** None — can start immediately

**Status:** closed

- [x] 實作 `getCategoryBadge(type, category)` 類別標籤與配色對照
- [x] 實作 `getCountdownBadge(daysUntilSettlement)` 剩餘天數倒數膠囊計算
- [x] 重構 `PendingSettlementCard` 為水平展開單行 Flex 條列佈局
- [x] 加入 Tooltip 與超長文字省略機制，徹底杜絕多筆並排時字元直立斷裂
