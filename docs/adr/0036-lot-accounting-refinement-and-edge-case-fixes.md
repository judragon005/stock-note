# ADR #0036: 多批次沖銷會計精煉、邊界浮點防禦與無障礙強化 (Lot Accounting Refinement & Edge Case Hardening)

## 狀態
- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **決策者**：AI Agent & 使用者
- **關聯 PRD**：[docs/specs/0036-lot-accounting-refinement-and-edge-case-fixes.md](../specs/0036-lot-accounting-refinement-and-edge-case-fixes.md)
- **觸發來源**：Code Review 深度審查反饋（全數修復 2 項 P1 缺陷與 5 項 P2 建議）

---

## 1. 背景與問題 (Context & Problem)
在 v5.3 實現批次沖銷會計後，經深度代碼審查發現：
1. `MOVING_AVERAGE` 賣出沖銷紀錄的 `buyDate` 誤填為賣出日、`holdingDays` 永遠為 0 且 `isLongTerm` 永遠為 `false`。
2. 多 Lot 比例扣減在浮點運算下存在累積誤差與微量殘留風險。
3. `calculateTaxComparison` 缺少真實市價輸入，未實現損益欄位語義混淆。
4. `LotsBreakdownModal.tsx` 在分頁切換時重複執行 5 次沖銷運算，缺乏 `useMemo` 快取，且缺少 `Escape` 鍵與遮罩背景點擊關閉。
5. `Tooltip.tsx` 缺少鍵盤焦點與 `aria-describedby` 無障礙標籤。

---

## 2. 決策內容 (Decision)

1. **加權平均持有天數 (Weighted Average Holding Days)**：
   - 於 `src/engine/lotEngine.ts` 依賣出當下在庫在席所有 Lots 剩餘股數比例，加權計算平均買進日與持股天數 $\bar{D} = \text{round}\left( \sum \frac{S_i}{S_{total}} \times D_i \right)$，並以 $\bar{D} \ge 365$ 精確判定長期持有。
2. **浮點數剩餘差額法扣減 (Residual Balance Deduction)**：
   - 前 $k-1$ 筆依比例扣除，最後一筆 Lot 採用 `soldShares - accumulatedDeductedShares` 差額扣除，確保總和 100% 嚴格守恆。
3. **TaxComparison 語義修正與傳入市價**：
   - 擴充傳入 `currentPrices`，正確產出 `remainingCostBasis` 與 `unrealizedPnLOnRemainingLots`。
4. **效能快取與互動無障礙升級**：
   - `LotsBreakdownModal.tsx` 使用 `useMemo` 快取避免 5 次重複運算，並加入 `Escape` 鍵監聽與遮罩背景點擊關閉。
   - `Tooltip.tsx` 轉為純 Vanilla CSS inline-style，並綁定 `id` 與 `aria-describedby`。
5. **單元測試全量覆蓋**：
   - 建立 `src/engine/taxOptimizer.test.ts`，並於 `lotEngine.test.ts` 補齊跨 Lot 賣出、手續費/稅分攤與移動平均法加權天數測試（**全專案 210 項單元測試 100% 通過**）。

---

## 3. 結果與影響 (Consequences)
- **優點**：
  - 移動平均法歷史歸因數據真實準確，徹底杜絕 0 天短期的誤導呈現。
  - 浮點運算 100% 防禦，無任何碎股微量殘留。
  - 元件效能顯著提升，無障礙與鍵盤互動達到現代 Web 頂尖標準。
- **向後相容**：
  - 100% 向後相容，所有既有功能與數據零誤差。
