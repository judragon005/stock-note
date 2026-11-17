# Spec 0234: 跨裝置與 NAS 全態資料庫同態同步與金鑰安全防護規格 (Unified Full Database Cross-Device Sync and Security Spec)

## Problem Statement

當使用者在不同運行環境（例如本地開發機 Local PC 與家用 QNAP/Synology NAS 私有雲）之間進行系統資料移轉時，透過頂部導航列點擊「JSON 匯出」並於目標裝置執行匯入後，發生嚴重的資料斷層與資產負債失真現象：

1. **券商交割帳戶全面遺失**：自訂券商帳戶、自訂手續費折讓率、銀行帳號後四碼等設定未隨行，交易紀錄中的關聯帳戶外鍵懸空，目標端被迫退回出廠預設帳戶。
2. **現金流水嚴重蒸發 (729 筆 $\rightarrow$ 688 筆)**：現有匯出僅包含交易紀錄，匯入時僅能演算法合成買賣交割款，導致使用者在本地手動記錄的 41 筆獨立現金事件（外部銀行出入金、劃撥戶轉帳、手動利息、借貸撥還款）被永久抹除。
3. **不限用途款項借貸（股票質押）合約歸零**：質押借款金額、質押標的股票明細、年利率、質押維持率追繳線 (130%) 與安全線 (166%) 完全未導出，導致總負債失真且維持率風控雷達癱瘓。
4. **除權息待發放事件中斷 (2 筆 $\rightarrow$ 1 筆)**：除權息公司行動快取未隨封包轉移，新環境冷啟動時缺乏事件中繼，導致除息平滑補償計算斷裂。
5. **API 金鑰與隱私安全無防護**：缺乏明確的「脫敏備份」與「含金鑰完整備份」選擇機制，缺乏對第三方金融金鑰（FinMind、FMP、AI Tokens）外洩風險的醒目警示。

## Solution

建構「金融級端對端全態同態同步管線（Unified State Sync & Migration Engine）」：

1. **大一統封包協定 (Unified System Archive V2)**：頂部導航列之 JSON 導出功能升級為全態快照封包，完整收錄交易帳本、券商帳戶、全量現金流水、不限用途借貸合約、除權息公司行動與配置中繼資料。
2. **金鑰安全防護雙軌制 (Dual-Track Security Consent)**：
   - 預設提供「🛡️ 安全脫敏導出（推薦）」：自動抹除所有第三方 API 金鑰，杜絕外洩風險。
   - 提供「⚠️ 家用完整遷移（含 API 金鑰）」：僅限個人私有網路使用，觸發高對比警示與明確確認步驟後方可下載。
3. **多型自適應匯入引擎 (Polymorphic Ingestion Engine)**：匯入精靈自動辨識「V2.0 大一統全態封包」與「V1.0 舊版純交易陣列」，提供多維度解包與精確資料預覽（交易數、帳戶數、現金流水數、質押借貸數、待發放股利數）。
4. **原子級快照護欄**：任何匯入寫入前強制在目標端落盤建立自動還原點，若校驗失敗 100% 回滾，確保既有資料零污染。

## User Stories

1. As a self-hosted NAS user, I want the exported JSON file to include all my custom broker accounts, so that my imported transactions retain their correct account mappings without falling back to system defaults.
2. As an active investor, I want all my 729 cash transactions (including manual deposits, withdrawals, transfers, and interest) to be fully exported and imported, so that my bank cash balances on NAS match my local PC exactly.
3. As a margin/pledge borrower, I want my securities-backed loans (不限用途款項借貸) including collateral stocks, loan balances, interest rates, and maintenance ratios to be preserved, so that my risk radar and debt metrics remain accurate on NAS.
4. As a dividend-growth investor, I want my pending dividend events and corporate action caches to be migrated, so that my receivable dividend calendar displays the exact 2 pending payouts on both devices.
5. As a privacy-conscious user, I want the export dialog to default to a sanitized backup that strips all API keys, so that I can safely store my financial history without leaking credentials.
6. As a home server administrator, I want an explicit option to export an unredacted backup including my API keys, so that I can seamlessly migrate to my private LAN NAS without manually re-entering tokens.
7. As a security-minded user, I want an alarming visual warning when selecting the unredacted export mode, so that I am fully aware of the risk of exposing API keys if uploaded to public clouds.
8. As a user importing a sanitized file on NAS, I want the system to alert me that API keys were not included and guide me to the settings page, so that I know why market data is not refreshing yet.
9. As a user importing a full archive containing API keys, I want the system to prompt me for confirmation before overwriting NAS API keys, so that I do not accidentally clobber existing server-specific configurations.
10. As a user with historical backups, I want the import modal to transparently accept legacy V1.0 transaction-only JSON files, so that my existing archives remain functional without errors.
11. As a user inspecting an import file, I want to see a detailed summary preview badge (Trades, Accounts, Cash Flows, Loans, Dividends) before confirming, so that I have 100% confidence in the data being loaded.
12. As a cautious user, I want the system to automatically snapshot my target environment before applying any import, so that I can roll back immediately if anything goes wrong.
13. As a data analyst, I want the foreign key relationships between trades, cash flows, and loans to be validated before saving, so that no orphaned records or dangling IDs enter the database.
14. As an end user, I want the Header navigation export button and the Settings workspace export tool to share the same unified architecture, so that I never get conflicting backup behaviors depending on where I click.

## Implementation Decisions

### 1. 統一資料庫封包規格 (Unified Archive Schema V2)
採用帶有語意版號的標準封包架構，包含六大一級實體節區：

```typescript
export interface StockTrackerUnifiedArchiveV2 {
  schemaVersion: '2.0.0';
  generator: 'StockTracker-Core';
  exportedAt: string;
  isRedacted: boolean;
  payload: {
    trades: TradeRecord[];
    brokerAccounts: BrokerAccount[];
    cashTransactions: CashTransaction[];
    loanRecords: LoanRecord[];
    corporateActions: StoredCorporateAction[];
    settings: {
      targetAllocations?: any[];
      activeAllocationId?: string;
      brokerFeeDiscount?: number;
      accountingView?: string;
      colorTheme?: string;
      apiKeys?: Record<string, string>;
    };
    marketSnapshot?: {
      usdToTwdRate: number;
      customPrices?: Record<string, number>;
      historicalFx?: Record<string, any>;
    };
  };
  metrics: {
    totalTrades: number;
    totalAccounts: number;
    totalCashTransactions: number;
    totalLoans: number;
    totalCorporateActions: number;
  };
}
```

### 2. 雙軌匯出彈窗架構 (Dual-Track Export Modal)
- 點擊頂部導航列之 JSON 匯出按鈕時，不再靜默直接觸發瀏覽器下載，改為彈出「系統全態封包匯出確認視窗」。
- 預設模式（Default）：安全脫敏導出（`isRedacted: true`），遍歷 `settings.apiKeys` 並將所有金鑰字串置空。
- 授權模式（Opt-in）：完整備份（含 API 金鑰），呈現警告框與警示文案，明確告知嚴禁上傳公網或 GitHub。

### 3. 多型匯入解析器 (Polymorphic Ingestion Engine)
- 匯入精靈讀取檔案後，優先檢查頂層 `schemaVersion` 欄位。
- 若 `schemaVersion === '2.0.0'`，啟動全態解析管線：
  - 同時解包 `trades`、`brokerAccounts`、`cashTransactions`、`loanRecords`、`corporateActions` 與 `settings`。
  - 在確認對話框以指標膠囊列出各維度筆數。
- 若為純陣列格式（Legacy V1.0），維持向下相容管線：
  - 僅解析 `trades`，並呼叫交易與現金合成器，同時提示使用者此檔案為舊式交易檔。

### 4. 外鍵與金流守護不變量 (Invariants)
- **帳戶外鍵完整性**：匯入時確保所有交易與現金流水之 `accountId` / `brokerAccountId` 皆能映射至合法帳戶。若遇到不存在之外鍵，自動綁定至匯入封包之主要預設帳戶，杜絕空指標。
- **實體現金流水保護**：當匯入 V2 封包時，**嚴禁執行抹除覆蓋式重新推導**；必須完整保存封包中的 729 筆現金流水（包含不限用途借貸之撥款、還本、利息及外部存提款）。
- **借貸質押標的保護**：完整還原 `pledgedCollateral`，確保維持率監控矩陣（Margin Stress Matrix）計算不中斷。

### 5. UI 體驗與入口合流 (UI Entry Convergence)
- 頂部 Header 按鈕與「設定頁面」底層之匯出機制共用同一組封包建構與驗證邏輯。
- 匯出檔案名稱規範化：
  - 脫敏檔：`stock_tracker_backup_sanitized_YYYY-MM-DD.json`
  - 完整檔：`stock_tracker_backup_full_YYYY-MM-DD.json`

## Testing Decisions

### 1. 測試理念與品質標準
- **純外部行為黑盒測試**：不測試內部私有變數或過渡狀態，僅針對檔案輸入（上傳 JSON）、驗證合約、狀態機切換與資料庫最終持久化狀態進行驗證。
- **嚴格維持率與筆數同態斷言**：驗證匯出後再匯入之資料，其交易數 (696)、現金數 (729)、借貸數、帳戶數必須 100% 絕對相等。

### 2. 受測模組與測試縫隙 (Testing Seams)
- **最高層端對端測試縫隙 (Highest Seam)**：`EnhancedImportModal.test.ts`
  - 測試 V2 封包上傳時的預覽資料流提取。
  - 測試 V1 舊版陣列與 V2 封包的多型切換。
  - 測試脫敏檔案匯入後的提示引導。
- **資料庫序列化與脫敏縫隙 (Database Seam)**：`db.test.ts`
  - 測試 `exportFullDatabaseJSON` 在脫敏與非脫敏狀態下的金鑰清洗行為。
  - 測試不限用途借貸（`loanRecords`）與除權息（`corporateActions`）的正確序列化與反序列化。

### 3. 現有程式庫之先驗模式 (Prior Art)
- 參考 `src/utils/db.test.ts` 中的 `全庫 JSON 匯出與匯入 (Full Database Export & Import)` 測試案例。
- 參考 `src/components/EnhancedImportModal.test.ts` 中的 `Seam 3: EnhancedImportModal 核心匯入資料流轉換與去重測試`。

## Out of Scope

1. 跨裝置雲端即時 WebRTC / WebSocket 自動同步（本期專注於離線檔案式同態遷移）。
2. 二進位或 SQLite 檔案直讀（維持標準 JSON 檔案格式相容性）。
3. 外部銀行 API 即時自動對帳（維持手動金流與券商對帳單匯入）。

## Further Notes

- 此規格實作完成後，將徹底消除使用者跨裝置（本機 $\leftrightarrow$ NAS）管理資產時的「假同步陷阱」，確保個人所有帳戶、現金、不限用途借貸與除權息雷達資料 100% 無損傳遞。
