# Issue #87-1: 資料庫統計擴充與 clearInstitutionalChipsCache 實裝 (DB Stats & Clear Function)

- **標籤**: `ready-for-agent`
- **所屬版本**: v8.7.0
- **依賴任務**: 無

## 任務描述
1. 在 `src/types/stock.ts` 中，擴充 `marketCache` 介面，納入 `institutionalChipsDays` 與 `institutionalChipsTotalRecords`。
2. 在 `src/utils/db.ts` 之 `getStorageStats()` 中，掃描 `settings` 表中 `TWSE_TPEX_CHIPS_` 前綴，統計快取交易日數與個股日報筆數。
3. 在 `src/utils/db.ts` 實作並匯出 `clearInstitutionalChipsCache()`。
4. 編寫單元測試以驗證統計計算與安全清除邏輯。

## 驗收標準
- [ ] `getStorageStats()` 能正確輸出籌碼天數與總筆數。
- [ ] `clearInstitutionalChipsCache()` 成功清除籌碼快取且不破壞其他設定。
- [ ] 單元測試通過。
