# ADR-0032: V5.0 IndexedDB 底層儲存遷移、ACID 事務與時光機快照體系 (IndexedDB Storage & Time-Machine Snapshots)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-27
- **參與者**：Antigravity Agent, 系統架構師
- **對應 PRD**：[SPEC-0032: docs/specs/0032-indexeddb-storage-and-time-machine-snapshots.md](../specs/0032-indexeddb-storage-and-time-machine-snapshots.md)

---

## 1. 背景與脈絡 (Context)

本系統先前採用瀏覽器之 `localStorage` 儲存全站交易、券商帳戶、現金帳本、質押借貸與歷史資產淨值 (NAV) 日 K 線資料。

隨著資料量積累與功能擴展，面臨三大架構瓶頸：
1. **5MB 瀏覽器儲存上限**：多年度每日資產淨值日 K 與批量 CSV 匯入極易觸發 `QuotaExceededError`。
2. **主執行緒同步阻塞**：每次刷新或狀態異動時，同步 `JSON.parse` 與 `localStorage.getItem` 佔用主執行緒，導致畫面微幅掉幀。
3. **缺乏原子性事務與防呆快照**：批量匯入或清空重置操作若中途出錯，可能造成半寫入狀態，且使用者無法一鍵回溯至先前時點。

---

## 2. 決策方案 (Decision)

### (1) 0 外部依賴原生 IndexedDB 儲存引擎 (`src/utils/db.ts`)
- 依據 KISS 原則與第一性原理，封裝純原生 Promise 驅動層，建立資料庫 `StockTrackerDB`（版本 `v1`），包含 9 大 Object Stores（`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `snapshots`, `settings`）。
- 支援單筆 CRUD、批次寫入 (`batchPut`)、全量查詢 (`getAll`) 與跨表原子性事務 (`dbTransaction`)。

### (2) 無損平滑雙重保險遷移演算法 (Non-Destructive Migration)
- 系統啟動時自動檢查 IndexedDB 是否完成遷移；若為首次升級，自動自 `localStorage` 12 大鍵值讀取資料並批次寫入 IndexedDB。
- 遷移完成後保留 `localStorage` 原資料作為冷備份，達成 100% 零資料遺失風險。

### (3) 完整時光機快照防呆與回滾體系 (Time-Machine Snapshots)
- **自動快照**：在 CSV/JSON 匯入覆蓋或追加前自動建立快照 (`AUTO_BEFORE_IMPORT`)；在清空重置前自動建立快照 (`AUTO_BEFORE_RESET`)。
- **保留策略**：自動快照數量限制為最新 10 份，超出時自動淘汰最舊之未鎖定快照。
- **時光機 UI**：於設定工作台 (`SettingsWorkspace.tsx`) 提供快照管理面板，支援自訂命名、鎖定保護、一鍵還原二次確認與全庫 JSON 匯出匯入。

### (4) 極速非同步生命週期與 React 記憶體零延遲同步
- `App.tsx` 啟動階段非同步呼叫 `initializeStorageAsync()`，載入後灌入 React State。
- 後續使用者新增/編輯操作維持 React 記憶體即時運算（零延遲），並由儲存層在背景非同步持久化至 IndexedDB。

---

## 3. 後果與影響 (Consequences)

### 正面影響 (Positive)
- **容量上限徹底解除**：儲存空間提升至數百 MB 以上，為後續歷史日 K 疊圖、多批次 Lot 與 XIRR 量化運算提供強固地基。
- **主執行緒零阻塞**：大筆資料讀寫全量非同步化，UI 畫面流暢度顯著提升。
- **金融級防呆安全**：時光機快照支援誤操作一鍵還原，徹底解決誤刪或匯入錯誤之風險。
- **0 依賴輕量維護**：不引入肥大 ORM，代碼純粹可控。

### 技術債清償 (Debt Resolved)
- 完整解決並關閉技術債看板之 **【#0007: 底層儲存遷移至 IndexedDB 與 ACID 事務及快照防呆機制】**。
