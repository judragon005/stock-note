# Issue #2: 公司行動對在庫批次之等比分攤與成本稀釋演算法 (Corporate Actions Dilution)

## 任務目標
1. 在 `src/engine/lotEngine.ts` 中實作股票分割 (`STOCK_SPLIT`)、除權配股 (`STOCK_DIVIDEND`) 與現金減資 (`CAPITAL_REDUCTION`) 對所有在席 Lot 的股數縮放與單價重估。
2. 處理減資退款在各 Lot 之間的扣減與超額退款轉列已實現利得。
3. 擴充單元測試驗證公司行動後的總成本基準不變性與無偏精度。

## 驗收標準
- 測試股票分割 (1:10) 後，在庫每筆 Lot 單價除以 10，股數放大 10 倍。
- 測試現金減資超額退款正確反映至已實現損益且 Lot 成本歸零。
