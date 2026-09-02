# ADR 0054: 本地數據與儲存空間總覽 (Local Storage Inspector) 架構設計

## 狀態 (Status)

Accepted (已採納實作)

## 背景 (Context)

本系統採 100% 離線優先 (Client-Side Local-First) 架構，所有使用者的個人交易、交割帳戶、現金流、貸款明細、快照備份均存放於瀏覽器 IndexedDB (`StockTrackerDB`) 與 `LocalStorage` 中。
然而，隨著快取層（歷史股價、即時報價、匯率、公司行動資料庫、官方台股字典）日漸龐大，使用者面臨以下困境：
1. 資料透明度黑箱：不知道系統存了哪些資料、存放在哪裡、各表筆數為何。
2. 無法掌握磁碟容量：不清楚 IndexedDB 佔用多少空間，是否逼近瀏覽器 Quota 上限。
3. 快取清理缺乏隔離：難以安全單獨抹除行情快取，缺乏清晰的階梯式防禦。
4. 隱私疑慮：新使用者無法直觀確認「無後端雲端伺服器」的隱私保證。

## 決策 (Decision)

1. **封裝底層儲存檢測層 (`src/utils/db.ts`)**：
   - 實作 `getLocalStorageInspectionStats()` 異步查詢所有 ObjectStores（`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `corporateActions`, `snapshots`, `settings`）之計數與關鍵中繼資料。
   - 整合 Web API `navigator.storage.estimate()` 取得本機實際使用位元組數 (Usage) 與配額 (Quota)。
   - 提供細粒度單項快取清除函式 (`clearHistoricalPricesCache`, `clearHistoricalFxCache`, `clearPriceMetadataCache`, `clearCorporateActionsCache`)。
2. **升級設定工作區 (`SettingsWorkspace.tsx`)**：
   - 納入「🔒 100% 本地隱私與離線存儲保證」資安徽章。
   - 建立「儲存總量與健康度」進度條。
   - 建立三大分組卡片：【核心個人資產】、【行情與市場快取】、【系統備份與配置】。
3. **階梯式安全機制**：
   - 快取清除可獨立執行並提供重同步。
   - 核心資產數據受 `AUTO_BEFORE_RESET` 快照與確認機制保護。

## 後果與影響 (Consequences)

### 正向影響 (Positive)
- 提供使用者對個人資產資料的完整掌控感與透明度。
- 大幅強化產品的 100% 本地隱私信任度。
- 使報價或歷史數據除錯、快取重建變得安全且極度簡單。

### 負向/風險與防範 (Trade-offs & Mitigations)
- `navigator.storage.estimate()` 在某些無痕模式或受限環境可能回傳 undefined：提供優雅降級與保底數值。
