# ADR-0009: 持倉列表自然排序與證交所除權除息端點校正

- **狀態**：`ACCEPTED`
- **日期**：2026-08-21
- **相關規格**：[SPEC-0009: 持倉庫存自然排序與證交所公司行動掃描修復](../specs/0009-holdings-natural-sorting-and-twse-scanner-fix.md)

---

## 1. 決策背景 (Context)

使用者反映：
1. 當前持倉庫存列表之標的呈現順序混亂，希望與標準代碼自然排序一致（台股在先、美股在後，組內按代碼升冪）。
2. 在交易歷程中，出現「2026-10-01 減資退款 9927 泰銘 (-0 股，0 元)」的異常補登紀錄。

經架構剖析：
- `calculateHoldingsAndSummary` 原先直接將 Map 的迭代順序（即首次買進之歷史時間）轉為 `holdings` 陣列返回，缺乏全域穩定排序機制。
- `fetchTWSECapitalReductions` 誤將 TWSE 的 `TWT48U_ALL`（除權除息預告表）作為減資資料來源解析，因缺少減資專用欄位而以預設值 0 產生假減資事件。

---

## 2. 架構決策 (Decision)

1. **持倉排序統一化**：
   - 於 `calculator.ts` 中對 `holdings` 陣列導入穩定的雙階自然排序：
     $$\text{Market Order (TW: 0, US: 1)} \to \text{Natural Alphanumeric Sort (Symbol)}$$
   - 採用標準 `localeCompare` 搭配 `{ numeric: true, sensitivity: 'base' }`，支援字母與數字混編之股票代號（如 `00403A`、`00981A` 等）。
2. **端點職責回歸與過濾守護**：
   - 移除 `fetchTWSECapitalReductions` 中對 `TWT48U_ALL` 的誤調用，將其正確歸入 `fetchTWSEDividends`。
   - 在掃描器建立安全過濾閘門：任何股數變更為 0 且金額為 0 之減資事件，判定為無效雜訊並予以過濾。

---

## 3. 影響與效益 (Consequences)

### 正面效益
- 持倉列表介面視覺整潔度大幅提升，符合台灣投資人與券商軟體之閱覽習慣。
- 根絕除息預告被誤寫為假減資之會計髒資料，確保歷史歷程與損益計算 100% 正確。

### 潛在權衡 (Trade-offs)
- 若既有用戶本機儲存已存在先前的假減資資料，需提供一鍵刪除或自動清理。

---

## 4. 後續演進與維護備忘 (Future Maintenance Notes)

- **排序邏輯 DRY 模組化**：
  目前持倉雙階自然排序邏輯於 `src/engine/calculator.ts` 與 `src/components/HoldingsTable.tsx` 各自維護一份（防禦性二次排序）。
  日後若新增其他跨國市場（如港股 HK、日股 JP）或更複雜之自訂權重規則，可一併將比較器抽取至獨立工具模組（如 `src/utils/holdingsSort.ts`）集中管理。

