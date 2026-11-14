# 0228 Spec: 股利時序黑洞根除、生命週期狀態機與已到期待對帳閉環重構規格書 (Dividend Reconciliation Blackhole Elimination, Lifecycle FSM & Due Settlement Pipeline)

## Problem Statement

使用者在「股利收益日誌與現金流全景」頁面中遭遇關鍵數據遺漏與嚴重的視覺邏輯矛盾：
1. **0056 持有且已入帳，明細表卻完全神隱（時序黑洞蒸發）**：
   - 使用者在席持有 `0056`，且 2026 年 10 月 22 日除息、11 月 11 日官方發放日已過（當前時間為 11 月中旬），但在下方「歷史現金股利入帳明細」中，整年僅看得到 2 月份一筆，11 月入帳之 0056 完全神隱。
   - 經架構審查發現雙重系統性真因：
     1. `OFFICIAL_DIVIDEND_CALENDAR` 常態庫中遺漏收錄 `0056` 之 2026 年除息行事曆，導致未主動生成應收股利；
     2. `receivableDividendEngine.ts` 第 280 行寫死 `if (currentDateStr >= payDate) continue;`——一旦邁過發放日，系統判定「已實質落袋」並自動自待發放清單中剔除，但若使用者尚未手動補登交易，該筆款項既不在待入帳清單，也不在交易明細表，造成**款項在發放日過後直接蒸發為時序黑洞**。
2. **KPI 卡片 3 筆數與金額割裂，與下方面板打架**：
   - 卡片 3（待入帳除息股利）右上角 Badge 顯示「4 筆待入帳」，但主金額卻顯示「`+NT$ 0`」，副標籤顯示「未達發放日 暫未轉入現金流」；
   - 與此同時，下方的「除息待入帳行事曆專區」標題卻顯示「(0 筆待入帳)」且呈現空白無資料狀態；
   - 根本原因在於卡片 3 取用的 `receivablePendingCount` 與金額計算條件存在狀態篩選口徑（`PENDING_PAYMENT` vs `UPCOMING_EX`）割裂，且在席股數若因除息日前一日快照推估失敗（`sharesHeld <= 0`）時，產出金額為 0 之幽靈應收記錄。
3. **明細表死板時間硬過濾與死代碼**：
   - `DividendLogView.tsx` 於篩選明細時寫死 `if (payDate > todayStr) return false;`，導致子元件 `DividendHistoryTable.tsx` 內部精心設計的 `isFuture`（預約待入）視覺標籤淪為無法觸發的死代碼；
   - 使用者在除息後至發放日間的 3~4 週等待期，無法在明細表中看到預約待入或待核銷狀態，造成投資人對應收資產失聯之恐慌。

---

## Solution

依據 KISS 原則與事件溯源思維，引入「股利生命週期四態狀態機」與「發放日已過待核銷結轉閉環」：
1. **補齊主流 ETF 官方常態除息基準庫**：
   - 於 `OFFICIAL_DIVIDEND_CALENDAR` 完整補齊 `0056`、`00878`、`00919`、`00713` 等標的 2026 全年除息日與官方公告配息率。
2. **消滅時序黑洞：引入「已到期待核對入帳態 (DUE_FOR_RECONCILIATION)」**：
   - 重構 `calculateReceivableDividends` 時序判定：發放日已過（`currentDateStr >= payDate`）且交易帳本 `trades` 中尚未存在該筆除息紀錄時，**嚴禁物理丟棄**，而是標記為 `DUE_FOR_RECONCILIATION`（已到期·待對帳）；
   - 在歷史明細表頂部建立「⚡ 待核對入帳專區」，清楚呈現該筆 0056 的除息日、發放日、除息持股數、應發毛額與實領淨額，並提供「一鍵確認入帳（Instant Settle）」綠色按鈕。
3. **提供「一鍵確認入帳（Instant Settle）」寫入閉環**：
   - 使用者點擊「確認入帳」時，系統自動產生標準 `DIVIDEND` 類型的 `TradeRecord`，填妥 `shares`、`price`、`tax`、`exDate` 與 `date`（實質入帳日），寫入本地儲存庫並觸發全域重新計算，完成端到端自癒閉環。
4. **統一 KPI 卡片與待入帳專區篩選口徑**：
   - 卡片 3 金額與筆數嚴格採用同一過濾邏輯：僅統計有效金額 $> 0$ 且狀態為 `PENDING_PAYMENT`、`OVERDUE` 或 `DUE_FOR_RECONCILIATION` 之項目，杜絕 Count=4 且 Sum=0 之矛盾。
   - 除息日前一日在席股數推估引入安全容錯：若歷史回溯股數為 0 但當前持倉部位大於 0，且除息日在合理區間內，採用當前庫存進行保底計算，杜絕幽靈 0 元記錄。
5. **激活明細表「穿透式時序視圖」**：
   - 移除父層 `payDate > todayStr` 之強制硬截斷，明細表支援顯示當年度所有已入帳交易與已除息款項（以「預約待入」與「待核實」標籤明確區隔），讓歷史回溯與即將落袋一目了然。

---

## User Stories

1. As a 0056 dividend investor, I want my declared and due October/November 0056 dividend to be visible in the dividend history workspace even if I haven't manually keyed it into the transaction ledger, so that I don't fear my dividend records have vanished into thin air.
2. As a stock tracker user, when the official payout date of a holding has passed (e.g. 2026-11-11 for 0056) but no bank ledger record exists, I want to see a prominent "Due for Reconciliation" (待核對入帳) card with the exact shares held on ex-date, so that I can verify the bank payment.
3. As a busy investor, I want an "Instant Settle" (一鍵確認入帳) button next to any due dividend item, so that clicking it automatically registers the dividend transaction into my trade ledger with zero typing.
4. As a dividend dashboard viewer, I want Card 3 (Receivable Dividends) to have 100% mathematical consistency between the pending count badge and the pending cash amount, so that I never see "4 items" with "+NT$ 0".
5. As an investor auditing cashflow, I want the receivable pending section to show the exact same count and items as Card 3, eliminating cross-component contradictions.
6. As an ETF holder, I want official ex-dividend events for core ETFs (0056, 00878, 00919, 00713) to be preloaded in the official calendar, so that receivable dividends are generated automatically without relying on manual API syncs.
7. As a careful investor, I want ex-dividend share calculations to fall back safely to active holding shares if historical trade snapshots fail to resolve, preventing zero-share ghost dividend calculations.
8. As a desktop and mobile user, I want the "Due for Reconciliation" banner and settlement actions to be fully responsive and keyboard/touch accessible, maintaining institutional glassmorphism styling.
9. As a privacy-conscious user, I want all dividend reconciliation and instant settling to occur 100% locally in my browser without transmitting financial data to any external server.
10. As a performance-conscious user, I want the unified dividend lifecycle reconciliation pipeline to run in under 16ms, ensuring smooth 60 FPS transitions without UI freezing.

---

## Implementation Decisions

### 1. 模組修改與職責劃分

- **`src/types/dividend.ts`**：
  - 擴充 `ReceivableDividendStatus` 類型：
    ```typescript
    export type ReceivableDividendStatus =
      | 'UPCOMING_EX'              // 即將除息
      | 'PENDING_PAYMENT'          // 已除息待發放
      | 'OVERDUE'                  // 超過預估日未發放
      | 'DUE_FOR_RECONCILIATION'   // 官方發放日已過，等待使用者勾稽入帳
      | 'RECEIVED';                // 已確認入帳
    ```
- **`src/engine/receivableDividendEngine.ts`**：
  - 於 `OFFICIAL_DIVIDEND_CALENDAR` 增補 0056 官方除息事件：
    ```typescript
    {
      symbol: '0056',
      market: 'TW',
      type: 'DIVIDEND',
      date: '2026-10-22',
      price: 1.07,
      description: '季度收益分配每股 1.07 TWD (預計 2026-11-11 發放入帳)',
      sourceType: 'LIVE_API',
    }
    ```
  - 重構 `calculateReceivableDividends` 時序邏輯：
    - 當 `currentDateStr >= payDate` 時，若 `trades` 中不存在對應記錄，將其狀態設為 `'DUE_FOR_RECONCILIATION'`，並計算在席股數與淨額加入回傳陣列，**不再執行 `continue` 拋棄**。
    - 強化在席股數回退保護：若歷史快照股數為 0，但當前持股大於 0，且除息日位於在席持股時間窗口內，採用持股股數作為保底基準。
- **`src/components/DividendLogView.tsx`**：
  - 統一傳遞給 `DividendKpiSummary` 之計數與金額邏輯：
    ```typescript
    const activeReceivables = scopedReceivables.filter(
      (r) => (r.status === 'PENDING_PAYMENT' || r.status === 'OVERDUE' || r.status === 'DUE_FOR_RECONCILIATION') && r.estimatedNetDividendInTWD > 0
    );
    const totalReceivableTWD = activeReceivables.reduce((sum, r) => sum + r.estimatedNetDividendInTWD, 0);
    const receivablePendingCount = activeReceivables.length;
    ```
  - 解除明細表 `payDate > todayStr` 之強制過濾，傳入未結算之 `dueReceivables` 至歷史明細表。
  - 實作 `handleInstantSettleReceivable`：接收 `ReceivableDividend`，自動構建 `TradeRecord` (type: 'DIVIDEND') 並調用 `onAddTrade` 或寫入 `storage`。
- **`src/components/dividend/DividendHistoryTable.tsx`**：
  - 在明細表格上方或首頁新增「⚡ 已到期待對帳款項 (Due for Reconciliation)」專區。
  - 每一筆待對帳項目提供標的代碼、名稱、除息日、發放日、除息股數、每股配息、實領金額，以及「一鍵入帳」按鈕。
  - 點擊「一鍵入帳」後自動轉為正式交易紀錄，並從待對帳區移至已入帳流水。

### 2. 避免重複造輪子
- 複用既有的 `resolveEffectiveDividendTaxAndNet` 與 `calculateConsolidatedTwNhiTax` 進行二代健保與匯費計算，不重寫稅務邏輯。
- 複用既有的 `loadTradeRecordsFromStorage` 與 `saveTradeRecordsToStorage` 完成交易寫入與觸發全域廣播。

---

## Testing Decisions

### 測試原則
遵循 TDD 紅-綠-重構循環，僅針對公開 API 與業務行為斷言，嚴禁測試內部私有變數或具體 CSS 像素細節。

### 核心測試覆蓋模組：
1. **`src/engine/receivableDividendEngine.test.ts`**：
   - 驗證持倉包含 `0056` 且當前日期晚於發放日（例如 `2026-11-14 >= 2026-11-11`）時，若無已記帳交易，`calculateReceivableDividends` 回傳項目之狀態為 `DUE_FOR_RECONCILIATION`，且 `sharesHeld` 與 `estimatedNetDividendInTWD` 大於 0。
   - 驗證已存在對應 `DIVIDEND` 交易記錄時，不再生成 `DUE_FOR_RECONCILIATION` 項目，杜絕雙重記帳。
2. **`src/components/DividendLogView.test.tsx`**：
   - 驗證卡片 3 之筆數 Badge 與金額數值在包含 `DUE_FOR_RECONCILIATION` 時保持完全數學一致（筆數 $> 0 \iff$ 金額 $> 0$）。
   - 驗證點擊「一鍵入帳」後，`onAddTrade` 被正確調用，並攜帶除息日、股數與實領金額。
3. **`src/components/dividend/DividendHistoryTable.test.tsx`**：
   - 驗證待對帳清單中正確呈現 0056 及其持股數量與實領金額。
4. **全專案合規與零回歸驗證**：
   - `npm test` 保持 100% 通過。
   - `npm run build` 保持 TypeScript 0 錯誤。

---

## Out of Scope
- 自動串接銀行 Open Banking API 進行無感網銀查帳（涉及金融個資法規，維持本地端確認與一鍵入帳）。
- 重構整套投資組合的借貸與質押保證金計算核心。
