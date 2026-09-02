# 產品需求規格書 (PRD)：TradeModal 券商帳戶智慧連動與跨市場歷史資料自動校正 (SPEC-0024)

## 📌 問題陳述 (Problem Statement)

目前系統在多券商帳戶架構與現金流水帳本連動時，存在以下連動與狀態脫鉤問題：
1. **TradeModal 未承接當前選定券商與市場**：當使用者在主儀表板切換為「🇺🇸 美股 (USD)」及選定「嘉信理財」帳戶時，點擊「＋ 新增交易」開啟彈窗，彈窗預設仍固定為台股 (`TW`) 及台股預設帳戶（如「永豐大戶投」），導致使用者在美股記帳時容易誤記為台股帳戶。
2. **市場切換時未自動連動帳戶**：在 TradeModal 內手動切換市場（點選台股/美股按鈕）、輸入英文字母標的代碼（如 SGOV, VT）、或點選熱門標的建議時，僅切換了 `market` 狀態，而 `accountId` 仍保留原市場帳戶，導致所屬券商下拉選單出現跨市場帳戶錯置。
3. **歷史交易帳戶市場不匹配引發流水帳錯植**：因上述問題，既有歷史交易中可能已存在「美股標的 (SGOV) 卻綁定台股券商帳戶 (永豐大戶投)」的記錄。當現金流水帳引擎（`cashLedgerEngine`）自動依交易生成交割款流水時，直接繼承了錯誤的 `trade.accountId`，造成「美股現金流水帳本」中出現「永豐大戶投」的異常情況。

---

## 🎯 解決方案 (Solution)

1. **TradeModal 狀態承接與雙向市場連動**：
   - 擴充 `TradeModalProps` 支援 `initialMarket?: MarketType` 與 `initialAccountId?: string`。
   - `App.tsx` 傳入當前選取的市場 (`currentMarket`) 與選取的券商 (`selectedAccountId`)。
   - 當 TradeModal 開啟或市場切換（手動切換、智慧標的推薦、代碼輸入）時，自動將 `accountId` 切換至該市場的預設券商帳戶（或第一個有效帳戶），並同步更新手續費折數試算。
2. **跨市場歷史交易自動校正引擎 (Auto-Reconciliation)**：
   - 在 `storage.ts` 的 `validateAndMigrateTrades` 與資料讀取管道中，加入市場與帳戶一致性校驗。
   - 若偵測到 `trade.market` 與其 `trade.accountId` 所屬券商之 `account.market` 不一致（例如美股交易綁定台股帳戶），自動修正為該市場對應的預設券商帳戶（如 `broker-us-default` 或嘉信理財）。
   - 觸發 `syncTradesWithCashTransactions` 重新產出正確關聯帳戶的交割流水，立即修正美股現金流水帳本。
3. **完整 TDD 單元測試防護**：
   - 針對 TradeModal 市場帳戶聯動、`validateAndMigrateTrades` 跨市場帳戶校正、以及流水帳關聯帳戶進行全覆蓋單元測試。

---

## 📋 使用者故事 (User Stories)

1. **新增交易自動承接選定券商**：身為使用者，當我在美股視圖選定「嘉信理財」並點擊「＋ 新增交易」時，彈窗應自動預設為「美股」與「嘉信理財」，無需每次手動重選。
2. **切換市場自動切換所屬帳戶**：身為跨市場投資人，當我在彈窗中切換為「台股」時，券商帳戶應自動切換為台股預設帳戶（如永豐大戶投）；切換為「美股」時自動切換為美股預設帳戶（如嘉信理財）。
3. **標的建議自動同步市場與帳戶**：身為投資人，當我在彈窗點選熱門美股（如 VT、NVDA）時，彈窗應同時將市場改為美股並將券商帳戶設為美股帳戶。
4. **既有美股交易歷史自動修正**：身為使用者，當我載入過去誤填為永豐大戶投的美股交易（如 SGOV）時，系統能自動修正其所屬帳戶為美股帳戶，並使美股現金流水帳本中正確顯示嘉信理財。

---

## 🛠️ 實作決策 (Implementation Decisions)

### 1. TradeModal 元件介面與邏輯擴充 ([src/components/TradeModal.tsx](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx))
- `TradeModalProps` 增加 `initialMarket?: MarketType` 與 `initialAccountId?: string`。
- 新增 `getEffectiveAccountId(targetMarket, candidateId, accounts)` 輔助函式：
  - 檢查 `candidateId` 是否屬於 `targetMarket`。
  - 若符合則保留；若不符合則優先取該市場標記 `isDefault` 之帳戶，次之取該市場第一個帳戶，最後取 `broker-${targetMarket.toLowerCase()}-default`。
- 在 `market` 變更處（按鈕點選、`initialSymbol` 判定、`handleSelectSuggestion`）同步更新 `accountId` 與折數。
- 在 `accountId` 下拉選單變更時，若選中台股帳戶，連動更新 `feeDiscount`。

### 2. 主程式傳參 ([src/App.tsx](file:///d:/APP/股票紀錄/src/App.tsx))
- 開啟 `TradeModal` 時，傳入 `initialMarket={currentMarket === 'ALL' ? 'TW' : currentMarket}` 及 `initialAccountId={selectedAccountId === 'ALL' ? undefined : selectedAccountId}`。

### 3. 資料遷移與驗證校正 ([src/utils/storage.ts](file:///d:/APP/股票紀錄/src/utils/storage.ts))
- 在 `validateAndMigrateTrades(trades, accounts)` 中：
  - 建立 `accountMap`。
  - 遍歷每筆交易，若 `trade.accountId` 存在但其對應帳戶的 `market` 與 `trade.market` 不一致，自動校正為該市場的預設帳戶 ID。
  - 若 `trade.accountId` 不存在，指派該市場預設帳戶。

---

## ✅ 驗收條件 (Acceptance Criteria)

1. **AC-1 (TradeModal 初始繼承)**：當頂部市場為 `US`、帳戶為嘉信理財時，開啟 `TradeModal`，市場顯示「🇺🇸 美股 (USD)」，券商帳戶預設為「嘉信理財」。
2. **AC-2 (TradeModal 市場切換連動)**：在 `TradeModal` 中點選「🇹🇼 台股」，帳戶自動切換為台股預設帳戶；點選「🇺🇸 美股」，帳戶自動切換為美股預設帳戶。
3. **AC-3 (智慧標的選擇連動)**：點選熱門美股建議項目（如 VT）時，市場切換至美股且券商帳戶切換至美股預設帳戶。
4. **AC-4 (歷史資料自動校正)**：載入美股交易（`market: 'US'`）但 `accountId` 為台股帳戶（如永豐）之舊資料時，`validateAndMigrateTrades` 能自動將其修正為美股預設帳戶。
5. **AC-5 (現金流水帳正確顯示)**：美股 SGOV 買進與賣出產生的交割款流水，在美股現金流水帳本中正確顯示為美股帳戶名稱（嘉信理財），不再出現永豐大戶投。
6. **AC-6 (測試全綠燈)**：`npm test` 100% 通過，`npm run build` 0 錯誤。
