# Spec 0171: 技術債批次清理與架構收斂規格書 (Batch Technical Debt Cleanup: Sync Checkpoints Index & API Key Manager Decomposition)

- **建立日期**: 2026-10-08
- **作者**: Antigravity Core Team
- **關聯技術債**: [Debt 0041](../debts/0041-sync-checkpoints-composite-index-optimization.md) (OPEN), [Debt 0045](../debts/0045-unified-api-key-manager-subcomponent-decomposition.md) (OPEN)
- **優先級**: `P3 (Normal / Maintenance)`
- **狀態**: `PROPOSED`

---

## Problem Statement

專案在經歷高速迭代與 AI 主力戰情室、SQLite 湖倉資料管線的深度演進後，累積了兩項處於 `OPEN` 狀態的架構技術債：

1. **資料庫檢索效能隱憂 (Debt 0041)**：
   在美股與全市場斷點續傳機制中，同步狀態檢查點資料表僅以市場與狀態建立普通雙欄位索引，未涵蓋關鍵的成功日期欄位。當美股與台股納入全市場萬檔標的時，依據日期與狀態過濾待同步標的的查詢無法利用覆蓋索引，導致不必要的磁碟資料頁讀取與全表掃描開銷。
2. **單一前端視圖過度膨脹 (Debt 0045)**：
   統一金融金鑰管理介面承載了全域 Proxy 通道設定、多供應商金鑰池、多金鑰輪替展開面板、Web Crypto 256-bit 本地加密與單鍵測活冷卻狀態等大量邏輯，全部收斂在單一超過 1,000 行的元件檔案中。這導致程式碼閱讀性降低、單一職責原則 (SRP) 弱化，且未來新增或調整個別金融資料源時維護風險升高。

---

## Solution

以一次批次維護與架構重構（Batch Technical Debt Cleanup），一舉解決並關閉上述兩項遺留技術債：

1. **同步檢查點索引複合覆蓋化**：
   在 SQLite 湖倉核心資料表初始化中新增複合狀態索引，涵蓋市場、狀態與最後成功日期三欄位，使狀態過濾與日期檢索在標的規模擴張至萬檔時仍維持常數時間 ($O(1)$) 查詢效能。
2. **金鑰管理員視圖元件模組化解耦**：
   依據職責分離原則，將龐大的金鑰管理介面拆解為結構清晰的子元件：
   - 提取獨立的全域代理與加密安全狀態呈現元件。
   - 提取通用的供應商金鑰配置與測活呈現元件。
   - 保持主管理員元件作為輕量化狀態調度容器，專注於金鑰池生命週期與存儲事件綁定。
3. **技術債看板狀態更新閉環**：
   在完成代碼重構與自動化測試驗證後，將 Debt 0041 與 Debt 0045 狀態更新為 `RESOLVED`，並同步修訂技術債看板與領域文件。

---

## User Stories

1. As an active investor managing extensive portfolios, I want the market synchronization background jobs to query pending symbols instantaneously, so that incremental daily updates don't lag or cause high CPU consumption on my local machine.
2. As a system administrator configuring external financial data sources, I want the settings panel to be highly responsive and cleanly separated, so that configuring proxy endpoints and individual provider tokens feels fluid and intuitive.
3. As a developer maintaining the codebase, I want database indices to cover query filtering predicates completely, so that query execution plans utilize index-only scans without unneeded table lookups.
4. As a frontend engineer adding future financial providers, I want individual API provider card logic isolated into reusable components, so that adding a new data provider does not require modifying an unwieldy thousand-line monolith.
5. As an open-source contributor inspecting the repository, I want the technical debt tracker to reflect accurate, up-to-date statuses, so that I have complete confidence in the codebase's hygiene and architecture.
6. As a privacy-conscious user, I want the security status indicator and custom proxy input to remain prominent and visually distinct, so that I can easily verify my Web Crypto 256-bit encryption posture at a glance.
7. As a QA automation engineer, I want all existing settings and API key manager test suites to pass seamlessly without regressions, so that visual decoupling does not introduce behavioral defects.

---

## Implementation Decisions

1. **資料庫層複合索引優化**：
   - 在資料庫核心連線初始化階段，為斷點檢查點表追加複合索引：`(market, status, last_success_date)`。
   - 保留既有索引以維持平滑遷移，使用 `IF NOT EXISTS` 確保操作冪等性。
2. **金鑰管理子元件職責切分 (Component Decomposition)**：
   - **全域通道設定卡片**：承載自訂反向代理伺服器網址輸入、256-bit 加密狀態指示徽章與即時保存回饋。
   - **通用供應商配置卡片**：承載個別金融資料源的標題資訊、說明連結、配額徽章、單金鑰輸入、多金鑰池展開清單、測活按鈕與冷卻計時器。
   - **主控制台容器**：專注於狀態提升 (State Lifting)、金鑰池資料持久化、測活排程與外部變更通知。
3. **介面契約保持 100% 向後相容**：
   - 主元件的公開 Props (`initialApiKeys`, `onApiKeysChange`) 與匯出常數保持完全不變，既有呼叫方無需任何修改。
4. **無依賴過度工程原則 (KISS)**：
   - 子元件保持純呈現與狀態回傳設計，不引入額外的全域狀態庫或複雜 Context。

---

## Testing Decisions

1. **測試標準與縫隙 (Test Seams)**：
   - 堅持外部可觀察行為測試，只在公開介面縫隙檢驗，不針對內部局部私有函式撰寫脆弱測試。
2. **受測模組**：
   - 資料庫層：驗證資料庫初始化腳本能正確建立 `idx_sync_checkpoints_lookup` 複合索引，且能順利執行覆蓋查詢。
   - 前端視圖層：驗證主金鑰管理介面與設定工作區在靜態渲染與互動時，各項安全提示、Proxy 配置、供應商 Tabs 均正常呈現且功能無退化。
3. **既有測試資產 (Prior Art)**：
   - `src/components/UnifiedApiKeyManager.test.tsx`
   - `src/components/SettingsWorkspaceIntegration.test.tsx`
   - `tests/lakehouse/` 底層資料庫檢驗腳本

---

## Out of Scope

1. 引入全新第七組外部金融資料源（如 Polygon 或 MacroMicro）。
2. 修改金鑰池底層 Web Crypto 加密演算法或金鑰輪替排程演算法。
3. 異動美股或台股日常盤後排程的核心業務流程。

---

## Further Notes

- 本次規格書執行完畢後，專案技術債看板 (`docs/debts/README.md`) 的未結技術債將歸零（達成 0 OPEN Debts）。
- 重構完成後需同步更新 ADR、交接手冊與技術債對應檔案。
