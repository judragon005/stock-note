# PRD-0087: 本地離線儲存籌碼日報筆數統計與管理管線規範 (Local Storage Institutional Chips Stats & Management Spec)

- **狀態**: 已核准 (Approved)
- **版本**: v8.7.0
- **日期**: 2026-09-07
- **優先級**: P0
- **對應 ADR**: [docs/adr/0087-local-storage-institutional-chips-stats-and-management.md](../adr/0087-local-storage-institutional-chips-stats-and-management.md)

---

## 1. 背景與核心痛點 (Background & Problem Statement)

1. **籌碼本地儲存黑盒化 (Lack of Visibility)**：
   - 系統已在 `Settings` 表中以 `TWSE_TPEX_CHIPS_` 前綴實裝「時間換空間」增量儲存管線，但使用者在「設定 ➔ 本地離線存儲 (Storage Quota)」面板中，只能看到歷史每日收盤價、外匯、即時行情、公司行動與官方字典，**完全看不到籌碼資料庫的天數與累積筆數**。
2. **缺乏手動管理重置通道 (No Safe Clear Channel)**：
   - 其他市場快取（如股價、匯率、行情、公司行動）均具備「可安全重置」按鈕，但籌碼日報快取缺乏單獨的「清空籌碼快取」功能，若使用者想手動重置並重新拉取官方日報時無處操作。

---

## 2. 解決方案設計 (Solution Design)

### 2.1 型別與統計擴充 (`DatabaseInspectionStats`)
- 在 `src/types/stock.ts` 中擴充 `marketCache`：
  ```ts
  marketCache: {
    ...
    institutionalChipsDays: number;         // 快取交易日天數
    institutionalChipsTotalRecords: number; // 累計個股法人記錄總筆數
  }
  ```
- 在 `src/utils/db.ts` 之 `getStorageStats()` 中：
  - 掃描 `settings` 表中鍵名以 `TWSE_TPEX_CHIPS_` 開頭之日報紀錄。
  - 計算天數（`institutionalChipsDays`）與各日日報內包含的個股資料總筆數（`institutionalChipsTotalRecords`）。

### 2.2 清空籌碼快取輔助函式 (`clearInstitutionalChipsCache`)
- 在 `src/utils/db.ts` 實作並匯出：
  ```ts
  export async function clearInstitutionalChipsCache(): Promise<void>
  ```
  遍歷刪除 `settings` 表中所有以 `TWSE_TPEX_CHIPS_` 開頭之快取項目，絕不影響個人交易與帳本資料。

### 2.3 UI 介面呈現 (`SettingsWorkspace.tsx`)
- 在「2. 行情與市場快取」列表中加入：
  - `三大法人籌碼日報 (institutionalChips)`：顯示 `{stats?.marketCache.institutionalChipsDays ?? 0} 天 ({stats?.marketCache.institutionalChipsTotalRecords.toLocaleString() ?? 0} 筆)`。
- 在重置按鈕區加入：
  - `🗑️ 清空籌碼快取` 按鈕，點擊後觸發 `handleClearCache('CHIPS', '三大法人籌碼快取', clearInstitutionalChipsCache)`。

---

## 3. 驗收標準 (Acceptance Criteria)

- [ ] **AC-1**: `getStorageStats()` 能精準統計 IndexedDB 中籌碼日報的已存天數與總筆數。
- [ ] **AC-2**: `clearInstitutionalChipsCache()` 能安全清除所有籌碼快取項目，且不影響其他設定或核心帳本。
- [ ] **AC-3**: `SettingsWorkspace` 介面清晰展示「三大法人籌碼日報」之天數與筆數。
- [ ] **AC-4**: `SettingsWorkspace` 具備「清空籌碼快取」按鈕，操作後自動重整統計數據。
- [ ] **AC-5**: 全套單元測試 100% 通過，TypeScript 0 錯誤。
