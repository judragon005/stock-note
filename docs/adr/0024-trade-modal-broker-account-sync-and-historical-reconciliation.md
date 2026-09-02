# 架構決策紀錄 (ADR)：TradeModal 券商帳戶智慧連動與跨市場歷史資料自動校正 (ADR-0024)

## 📌 背景與問題脈絡 (Context)

在多券商帳戶架構上線後，使用者在主儀表板切換為「🇺🇸 美股 (USD)」及選定「嘉信理財 (免手續費)」時，點擊「＋ 新增交易」開啟彈窗，彈窗內部初始狀態仍固定為台股預設帳戶（如「永豐大戶投」）。
當使用者在彈窗內切換市場至美股（或輸入英文字母標的如 SGOV）時，僅更新了 `market` 狀態，而 `accountId` 仍保留為台股帳戶，導致所記錄的美股交易錯置於台股帳戶。
進而引發在「美股現金流水帳本」中，買賣交割款自動連動產生之現金流水帳戶名稱出現「永豐大戶投」的嚴重錯位。

---

## 🎯 決策項目 (Decision)

### 1. TradeModal 狀態繼承與市場帳戶雙向聯動
- `TradeModalProps` 擴充支援 `initialMarket?: MarketType` 與 `initialAccountId?: string`，由 `App.tsx` 傳入主畫面頂部目前選中之市場與券商帳戶。
- 提供純函式 `getEffectiveAccountIdForMarket(targetMarket, candidateAccountId, accounts)`：
  - 驗證 `candidateAccountId` 是否屬於 `targetMarket`。
  - 若符合則沿用；若不符合則優先指派該市場標記 `isDefault` 之帳戶，次之指派該市場首個帳戶，最後降級為系統預設 ID。
- 在手動點選市場按鈕、輸入代碼或點選熱門標的建議時，統一透過 `handleMarketChange` 同步更新 `accountId` 與台股手續費折數試算。

### 2. 跨市場歷史資料讀取層自動校正 (Storage Migration & Auto-Reconciliation)
- 在 `src/utils/storage.ts` 的 `validateAndMigrateTrades` 與 `validateTradesSchema` 中，建立 `Map<string, BrokerAccount>` 進行一致性比對。
- 若偵測到歷史交易之 `trade.market` 與綁定帳戶之 `account.market` 不一致，在資料載入時**自動修正為該市場的預設帳戶 ID**。
- 自動觸發 `syncTradesWithCashTransactions`，使美股現金流水帳本中 SGOV 等交易立即對齊美股券商（嘉信理財）。

---

## ⚖️ 影響評估與結果 (Consequences)

### 正向效益 (Positive)
- **零手動負擔**：使用者無需手動修正歷史 590 筆交易，載入瞬間自動修正歷史錯置。
- **UI 體驗無縫對齊**：美股視圖下點擊新增交易，預設即為美股與嘉信理財，切換標的時自動同步。
- **報表精準一致**：美股現金流水帳本 100% 僅展示美股券商，台股帳本 100% 僅展示台股券商。

### 測試覆蓋 (Testing)
- `src/components/TradeModal.test.ts` 覆蓋 4 項帳戶連動測試。
- `src/utils/storage.test.ts` (Seam 9) 覆蓋跨市場校正測試。
- `src/engine/cashLedgerEngine.test.ts` 覆蓋美股流水關聯測試。
- 總測試數 145/145 100% 綠燈通過。
