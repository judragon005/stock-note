# 技術債 #0007: 底層儲存遷移至 IndexedDB 與 ACID 事務及快照防呆機制 (IndexedDB Storage & Transaction Safety)

- **狀態**：`RESOLVED` (已於 v5.0 ADR #0025 解決)
- **優先級**：`P1`
- **發現來源**：專業金融軟體架構審查 (Financial Software Engineering Audit)
- **建立日期**：2026-08-26
- **解決日期**：2026-08-27 (PRD: docs/specs/0032-indexeddb-storage-and-time-machine-snapshots.md / ADR: docs/adr/0032-indexeddb-storage-and-time-machine-snapshots.md)
- **標籤**：`Architecture` · `Storage` · `Performance` · `Data-Integrity`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前全系統所有交易資料（`trades`）、券商帳戶（`broker_accounts`）、現金交易與銀行帳本（`cash_transactions`）、歷史 NAV 快照（`historical_nav_v3`）與報價快取（`stock_prices_cache`）皆存放於瀏覽器之 `localStorage` 中。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **5MB 儲存上限限制**：隨著歷史交易筆數增長、每日 NAV 歷史追蹤累積或批量 CSV 匯入，隨時可能觸發 `QuotaExceededError`，導致新交易無法寫入。
  2. **主線程同步阻塞**：`localStorage.getItem()` 與 `JSON.parse()` 屬於同步阻塞操作。當資料量達數千筆時，每次頁面刷新或狀態更新會造成主線程掉幀（UI Lag）。
  3. **缺乏原子性事務 (ACID Transaction)**：例如批次匯入或進行減資/換股等複合操作時，若中途失敗或被意外刷新，可能造成資料部分寫入、部分遺失的不一致狀態。
* **暫緩理由**：
  1. 當前資料量在一般散戶數百筆交易範圍內仍可正常運作，且目前有 CSV 匯出備份機制。
  2. 需設計平滑遷移腳本（自動自 `localStorage` 讀取並轉移入 IndexedDB），待下一階段基礎架構升級時統一重構。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **引入輕量化 IndexedDB 封裝（如 Dexie.js 或原生封裝）**：
   - 建立資料庫結構：`trades`, `brokerAccounts`, `cashLedgers`, `navHistory`, `priceCache`, `systemSnapshots`。
2. **實作事務與原子寫入 (`DatabaseManager.transaction`)**：
   - 確保涉及多個資料表變更時，任一失敗即全量 Rollback。
3. **建立自動快照與時光機回溯機制 (Snapshot & Restore)**：
   - 每次執行批量匯入、清空或大範圍刪除前，自動在本地產生還原點，提供「一鍵復原」防呆。
4. **向下相容性自動遷移 (Migration Runner)**：
   - 啟動時自動偵測 `localStorage` 既有資料，非破壞性平滑轉移至 IndexedDB 並驗證 Checksum。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組重構：
1. 使用者匯入大量歷史交易資料時遭遇容量限制或提示卡頓。
2. 進行 P1 階段系統化基礎工程時主動啟動。
