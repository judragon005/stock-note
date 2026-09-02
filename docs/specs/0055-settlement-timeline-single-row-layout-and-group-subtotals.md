# 需求規格說明書 (PRD #0055)：在途資金交割時序排程單行條列化與分組小計 (Settlement Timeline Single-Row Layout & Group Subtotals)

## Problem Statement

在資產帳務與在途交割管理中，「在途資金交割時序排程 (Settlement Timeline)」扮演預警資金缺口與掌握交割款到期日的核心角色。然而，在既有排版與呈現機制上面臨以下痛點：

1. **多欄網格擠壓導致文字直立斷裂 (Grid Column Squishing)**：
   - 原先採用自適應網格 `repeat(auto-fit, minmax(280px, 1fr))`，當某一時序分組（如「未來排程」）包含 4 筆以上項目時，卡片寬度被壓縮至極限，導致券商帳戶名稱（如「永豐大戶投 (2折/低消20元)」）文字被擠壓成單字直立換行，完全無法正常閱讀。
2. **缺乏直觀的時序倒數與類別標籤 (Lack of Visual Hierarchy & Badges)**：
   - 項目僅展示日期字串與備註，缺乏即時倒數膠囊（如「今日到期」、「明日到期」、「3 天後」、「逾期 2 天」）以及鮮明的金流類別標籤（「股票買進」、「股票賣出」、「現金股息」、「利息收入」等），降低了掃視效率。
3. **分組缺乏金額小計 (Missing Group Subtotals)**：
   - 各時序區塊（逾期、今日、明日、本週、未來）僅顯示筆數，未提供該區塊內的「預估淨現金流小計」，使用者無法一眼看出特定時間區段內的資金出入淨額。

---

## Solution

將在途資金交割時序排程全面升級為「**單行橫向條列式清單 (1 Row 1 Item)**」，並導入多維度視覺標籤與分組小計：

1. **單行條列式排版 (Single-Row List Layout)**：
   - 捨棄多欄網格，將各分組內的項目改為垂直單行排列（`flex-direction: column`），每一筆在途款項佔據完整橫向寬度，確保所有文字有足夠的呼吸感且絕不直立換行。
2. **多維度分欄與視覺膠囊標籤**：
   - **左側時序區**：展示交割日期（日曆圖標 + 日期）+ 時序倒數膠囊（高亮警示逾期/今日/明日/剩餘天數）+ 交易類別徽章（買入紅底、賣出綠底、股息綠底等）。
   - **中間資訊區**：券商交割戶名稱（加粗易讀）+ 詳細交易備註與標的說明（支援自動省略與 Tooltip 懸浮提示）。
   - **右側操作區**：高對比等寬字體金額（正數綠色、負數紅色）+ 「一鍵核銷」按鈕（支援一鍵切換狀態）。
3. **時序分組小計與升冪排序 (Group Subtotals & Ascending Sort)**：
   - 保留五大時間緊急度分組（🔴 已逾期 / ⚡ 今日 / 📅 明日 / 🗓️ 本週 / 🔮 未來）。
   - 於各分組標題右側即時計算展示「**分組小計淨額**」（例如 `小計: +NT$ 966,814`）。
   - 各分組內部嚴格按照交割日期升冪排序（由近至遠）。

---

## User Stories

1. 作為一名有多筆股票交易待交割的投資人，我希望在時序看板中每一筆交割款都整齊獨立成行，字體正常水平排列，不再被壓扁成難以閱讀的直條。
2. 作為一名需要快速確認資金到期日的用戶，我希望一眼看到「今日到期」、「明日到期」或「3 天後」的倒數膠囊，以及「股票買進」或「現金股息」的類別標籤，以便立即做出調度決策。
3. 作為一名關注本週與未來資金缺口的用戶，我希望在「本週排程」與「未來排程」的標題看到分組小計淨額，快速掌握未來需要準備多少扣款資金。
4. 作為一名交割完成的用戶，我希望能在單行條目右側點擊「一鍵核銷」，將款項狀態直接轉為已交割。

---

## Implementation Decisions

### 1. 條列項目元件重構 (`src/components/PendingSettlementCard.tsx`)
- 將原卡片元件升級為橫向條列 Row 元件：
  - 封裝 `getCategoryBadge(type, category)`：依交易類別對應顏色與中文標籤（`STOCK_BUY` ➔ 股票買進, `STOCK_SELL` ➔ 股票賣出, `DIVIDEND` ➔ 現金股息, `INTEREST` ➔ 利息收入, `DEPOSIT` ➔ 資金存入, `WITHDRAWAL` ➔ 資金提領）。
  - 封裝 `getCountdownBadge(daysUntilSettlement)`：依剩餘天數計算倒數標籤（`< 0` ➔ 逾期 N 天, `0` ➔ 今日到期, `1` ➔ 明日到期, `> 1` ➔ N 天後）。
  - 結構採用三段式 Flex 佈局：`[時序與類別] --- [券商與備註] --- [金額與操作]`。

### 2. 時序看板容器與分組小計 (`src/components/CashLedgerWorkspace.tsx`)
- 變更項目列表容器樣式：由 `gridTemplateColumns: repeat(auto-fit, minmax(280px, 1fr))` 調整為 `display: flex; flex-direction: column; gap: 6px;`。
- 於各分組 Header 內計算群組淨額：
  ```tsx
  const groupNet = group.items.reduce((sum, it) => sum + (it.currency === 'USD' ? it.amount * usdToTwdRate : it.amount), 0);
  ```
  並以格式化金額標示 `小計: +NT$ ...` 或 `小計: -NT$ ...`。

### 3. 底層時序計算引擎保持單一真實來源 (`src/engine/cashLedgerEngine.ts`)
- 維持 `groupPendingSettlementsByTimeline` 的時間分組計算與按交割日升冪排序邏輯，確保計算層與表現層完全解耦。

---

## Testing Decisions

### 1. 測試原則
- 遵循紅-綠-重構 (TDD) 循環，只在公開介面切片測試。
- 保持底層引擎計算函式 100% 單元測試覆蓋率。

### 2. 測試範疇
- **時序分組與排序測試 (`src/engine/cashLedgerEngine.test.ts`)**：
  - 驗證 `groupPendingSettlementsByTimeline` 能正確將逾期、今日、明日、本週、未來款項分入正確時區並依日期升冪排序。
  - 驗證 TWD / USD 多幣別折算與正負現金流小計正確性。
- **UI 渲染與核銷互動驗證**：
  - 驗證單行條列式元件能正確渲染所有倒數膠囊、類別徽章、券商名稱與金額。
  - 驗證點擊「一鍵核銷」能正確觸發狀態切換回呼。
- **建置與回歸驗證**：
  - 確保 `npm test` 32 個測試檔案（361+ 測試案例）100% 通過。
  - 確保 `npm run build` TypeScript 0 錯誤、Bundle 正常產出。

---

## Out of Scope

1. 跨券商自訂拖曳重新分組（保持依交割日期自動計算之客觀排程）。
2. 在途交割款項分期攤提（交割款為單筆 T+2 / T+1 到期結算）。
