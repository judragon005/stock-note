# Ticket 02: 台股雙市場雙哨兵檢驗與雙軌原子性合流引擎

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0120-dual-market-smart-money-zero-loss-and-atomic-resilience-spec.md` (模組二)
- 關聯 Issue: #35
- 標籤: `enhancement,ready-for-agent`

## 任務目標
升級 `src/engine/smartMoneyFetcher.ts`，落實台股「全有或全無 (Atomic All-or-Nothing)」雙軌合流機制與金融級四重哨兵檢驗，徹底杜絕只有上櫃股票（如 894 檔）或只有上市股票時被誤判為成功，保證全市場 2,200+ 檔數據零污染入庫。

## 具體修改清單
1. **`src/engine/smartMoneyFetcher.ts`**：
   - 改造 `fetchCombinedTwseAndTpex`：
     - 若 `twseData` 為空（0 檔）或 `tpexData` 為空（0 檔），認定合流失敗，回傳空字典 `{}`，杜絕半殘資料合流。
   - 升級 `isInstitutionalReportComplete(data)`：
     - **上市哨兵**：必須包含 `2330` 台積電，且上市代碼數 $\ge 1,000$。
     - **上櫃哨兵**：必須包含 `8299` 群聯，且上櫃代碼數 $\ge 700$。
     - **全市場深度門檻**：總標的檔數 $\ge 1,800$ 檔。
     - **活躍度哨兵**：前 50 大主力股票三大法人買賣超張數絕對值總和 $> 0$。
2. **單元測試 (`src/engine/smartMoneyFetcher.test.ts`)**：
   - 測試僅有上櫃 894 檔（無台積電）情境 ➔ 哨兵回傳 `false`。
   - 測試僅有上市 1330 檔（無群聯）情境 ➔ 哨兵回傳 `false`。
   - 測試雙市場完整 2224 檔情境 ➔ 哨兵回傳 `true`。
   - 測試任一市場請求失敗時，`fetchCombinedTwseAndTpex` 拒絕合流。

## 驗收標準
- [ ] 雙哨兵精確識別上市櫃獨立完整性，未達標絕不寫入快取。
- [ ] 單元測試 `smartMoneyFetcher.test.ts` 新增測試全數通過。
