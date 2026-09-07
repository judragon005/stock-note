# 0087. 本地離線儲存籌碼日報筆數統計與管理管線 (Local Storage Institutional Chips Stats & Management)

- **狀態**: 已核准 (Approved)
- **日期**: 2026-09-07
- **決策者**: AI 架構師與使用者
- **對應 PRD**: [docs/specs/0087-local-storage-institutional-chips-stats-and-management-spec.md](../specs/0087-local-storage-institutional-chips-stats-and-management-spec.md)

---

## 1. 背景與脈絡 (Context)

系統已實踐「時間換空間」增量補足籌碼日報至本地 IndexedDB，但使用者在「設定 ➔ 100% 本地離線存儲」面板中無法知曉籌碼快取的實質天數與記錄筆數，亦無便捷的快取清除按鈕。

---

## 2. 決策考量 (Decision Drivers)

1. **Local-First 透明度**：讓使用者對本地儲存的每一筆資料（個人資產、行情快取、籌碼日報）享有 100% 知情權與掌控權。
2. **KISS 原則**：籌碼日報存於 `settings` 表以 `TWSE_TPEX_CHIPS_` 為鍵，統計與刪除均直接基於前綴過濾，無需開闢獨立的 ObjectStore，降低 schema 遷移成本與風險。
3. **安全隔離**：清除籌碼快取僅刪除 `TWSE_TPEX_CHIPS_` 前綴資料，絕不觸碰交易、現金流、帳戶與使用者系統配置。

---

## 3. 決策內容 (Decisions)

1. **擴充 `marketCache` 統計模型**：
   - 增加 `institutionalChipsDays`（快取交易日數）與 `institutionalChipsTotalRecords`（累計個股法人日報記錄總筆數）。
2. **實裝安全清理函式 `clearInstitutionalChipsCache()`**：
   - 透過 IndexedDB 批次過濾刪除 `settings` 表中所有以 `TWSE_TPEX_CHIPS_` 開頭之快取。
3. **更新 `SettingsWorkspace.tsx`**：
   - 「2. 行情與市場快取」列表中新增「三大法人籌碼日報 (institutionalChips)」展示列。
   - 新增「🗑️ 清空籌碼快取」按鈕。

---

## 4. 後續影響與優點 (Consequences)

- 使用者可隨時檢視時間換空間的成效（如 5 天、12,000 筆）。
- 快取異常或需要重新拉取時可一鍵安全重置，具備高度可維護性。
