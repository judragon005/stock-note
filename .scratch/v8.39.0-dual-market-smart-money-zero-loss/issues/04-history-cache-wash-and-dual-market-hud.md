# Ticket 04: 歷史 5 日快取自動洗滌、UI 雙市場健康看板與強制同步功能

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0120-dual-market-smart-money-zero-loss-and-atomic-resilience-spec.md` (模組四、五)
- 關聯 Issue: #35
- 標籤: `enhancement,ready-for-agent`

## 任務目標
強化 `fetchRecentTwseReports` 歷史日報補齊管線，自動檢驗並洗滌本地 IndexedDB 中過去殘留的未通過雙哨兵之殘缺日報；並在 `ChipsWorkspace.tsx` 介面上提供台美雙市場獨立健康狀態看板與一鍵「🔄 雙市場全量重新同步」功能。

## 具體修改清單
1. **`src/engine/smartMoneyFetcher.ts`**：
   - 強化 `fetchRecentTwseReports`：
     - 讀取本地快取時，使用升級版 `isInstitutionalReportComplete` 進行嚴格校驗。
     - 若快取未通過檢驗（如總數不足 1800 或無台積電），自動作廢該快取並向遠端發起重新拉取覆蓋。
2. **`src/components/ChipsWorkspace.tsx`**：
   - 頂部狀態徽章改為雙市場獨立健康指標：
     - 台股：`🟢 台股已同步：MM/DD 盤後 (上市 X 檔 + 上櫃 Y 檔，共 Z 檔)`。
     - 美股：`🟢 美股已同步：MM/DD 美東收盤 (真實 20D CMF 已入庫)`。
   - 提供「🔄 雙市場全量重新同步」按鈕，支援略過快取、強制全量更新台股與美股最近 5 個交易日之全部數據。
3. **單元測試 (`src/engine/smartMoneyFetcher.test.ts`)**：
   - 驗證殘缺快取自動被洗滌重拉，歷史 5 日皆為有效數據。

## 驗收標準
- [ ] 歷史 5 日快取無任何殘缺數據，1D / 3D / 5D 累計買賣超計算正確。
- [ ] 前端介面清楚呈現台美雙市場各自獨立之數據健康度與檔數。
- [ ] `npm test` 零錯誤，`npm run build` 綠燈通過。
