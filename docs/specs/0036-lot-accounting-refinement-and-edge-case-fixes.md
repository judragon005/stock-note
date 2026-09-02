# PRD #0036: 多批次沖銷會計精煉、邊界浮點防禦與無障礙強化規格書 (Lot Accounting Refinement & Edge Case Hardening)

- **狀態**：`READY_FOR_REVIEW`
- **優先級**：`P1`
- **負責人**：AI Pair Programmer & 使用者
- **日期**：2026-08-28
- **關聯 PRD**：[docs/specs/0035-lot-based-accounting-and-tax-loss-harvesting.md](0035-lot-based-accounting-and-tax-loss-harvesting.md)
- **觸發來源**：Code Review 深度審查反饋 (2 項 P1 缺陷 + 5 項 P2 改善建議)

---

## 1. 背景與問題陳述 (Background & Problem)

在 v5.3 多批次沖銷會計系統上線後，經由 `/code-review` 深度審查發現以下需立即修復與強化的核心問題：

1. **🔴 P1-01 (MOVING_AVERAGE 歷史賣出歸因與持有天數失真)**：
   - 原先在移動平均模式下，`disposal` 的 `buyDate` 誤填為賣出成交日，導致 `holdingDays` 永遠為 0、`isLongTerm` 永遠為 `false`（短期），嚴重誤導投資人。
   - **解法**：導入「加權平均持有天數 (Weighted Average Holding Days)」，依賣出當下在庫所有 Lots 之股數權重加權平均買進日與持股天數。
2. **🔴 P1-02 (Lot 比例扣減浮點累積偏差與殘留清除)**：
   - 移動平均法下按比例扣除多個 Lot 時，因 IEEE 754 浮點乘除誤差可能造成總扣減股數與實際賣出股數存在微量差額，且殘留微小碎股未能徹底清理。
   - **解法**：對最後一個在席 Lot 採用「剩餘差額法 (Residual balance method)」，強制總和嚴格守恆，並維持 `1e-6` 容差清理。
3. **🟡 P2-01 & P2-02 (TaxComparison 語義校正與傳入市價計算未實現損益)**：
   - `calculateTaxComparison` 修正其未實現損益計算邏輯（傳入 `currentPrices`，以 `grossMarketValue - remainingCostBasis` 產出真實未實現損益）。
4. **🟡 P2-03 (效能優化 useMemo 快取)**：
   - `LotsBreakdownModal.tsx` 在切換分頁或重複渲染時避免重複執行 5 次 `processLots`，以 `useMemo` 快取沖銷與節稅結果。
5. **🟡 P2-04 (無障礙 A11y 與互動體驗升級)**：
   - `Tooltip.tsx` 改用 Vanilla CSS 樣式確保在無 Tailwind 環境下動畫正常運作，並配置 `id` 與 `aria-describedby` 增強螢幕閱讀器支援。
   - `LotsBreakdownModal.tsx` 支援鍵盤 `Escape` 鍵與外層遮罩背景點擊立即關閉。
6. **🟡 P2-05 (單元測試覆蓋缺口全數補齊)**：
   - 新增「跨多 Lot 部分賣出分攤」、「含買賣雙向手續費與證交稅分攤」、「移動平均法加權天數歸因」、「`taxOptimizer.ts` 完整掃描邏輯」等高品質測試案例。

---

## 2. 核心演算法與計算模型 (Algorithm & Math Models)

### 2.1 移動平均法加權平均持有天數 (Weighted Average Holding Days)

當賣出成交日為 $T_{sell}$，在庫在席 Lots 為 $L_1, L_2, \dots, L_k$，各 Lot 剩餘股數為 $S_i$，買進日為 $T_{buy, i}$：

$$\text{Total Shares } S_{total} = \sum_{i=1}^k S_i$$

$$\text{Holding Days of Lot } i: D_i = \max\left(0, \frac{T_{sell} - T_{buy, i}}{86,400,000 \text{ ms}}\right)$$

$$\text{Weighted Average Holding Days } \bar{D} = \text{round}\left( \sum_{i=1}^k \left( \frac{S_i}{S_{total}} \times D_i \right) \right)$$

$$\text{isLongTerm} = \begin{cases} \text{true}, & \text{if } \bar{D} \ge 365 \\ \text{false}, & \text{if } \bar{D} < 365 \end{cases}$$

Disposal 記錄中的買進日呈現為：`加權平均 (最早: YYYY-MM-DD)`。

---

### 2.2 浮點數剩餘差額扣除法 (Residual Balance Deduction)

在扣減 $k$ 個 Lots 時：
- 對於前 $k-1$ 個 Lot ($i = 0 \dots k-2$)：
  $$\text{deductShares}_i = \text{roundPrecision}\left( \text{soldShares} \times \frac{S_i}{S_{total}} \right)$$
- 對於最後一個 Lot ($i = k-1$)：
  $$\text{deductShares}_{k-1} = \text{soldShares} - \sum_{j=0}^{k-2} \text{deductShares}_j$$
- 確保 $\sum \text{deductShares} \equiv \text{soldShares}$，徹底杜絕浮點累積漂移。

---

## 3. 使用者介面與無障礙規格 (UI/UX & A11y)

### 3.1 專業名詞繁中對齊與 Tooltip 字典

| 專有名詞 | 繁體中文顯示 | 懸停 Tooltip 說明 (繁中) |
| :--- | :--- | :--- |
| **Weighted Holding Days** | `加權持有天數` | 依賣出當下在庫所有買進批次的股數比例，加權計算出的平均持有天數。$\ge 365$ 天判定為長期持有。 |
| **Residual Balance** | `差額守恆扣除` | 多批次比例分攤時，對最後一筆批次以剩餘差額精確扣除，消除浮點數微量殘留。 |
| **Tax-Loss Opportunity** | `節稅收割機會` | 偵測在席批次中處於帳面實質虧損者，建議優先出脫以抵扣同年度其他已實現獲利。 |

### 3.2 無障礙 (A11y) 與鍵盤互動
1. **Escape 鍵監聽**：Modal 開啟時註冊 `keydown` 事件，按下 `Escape` 即觸發 `onClose`。
2. **遮罩背景點擊**：點擊 Modal 外圍半透明遮罩背景即可關閉，內層內容區阻止事件冒泡 (`e.stopPropagation()`)。
3. **Tooltip 鍵盤焦點**：支援 `tabIndex={0}` 與 `aria-describedby` 綁定，螢幕閱讀器與鍵盤導航均能清晰朗讀提示內容。

---

## 4. 單元測試驗證矩陣 (Test Matrix)

| 測試分類 | 測試案例目標 | 預期結果 |
| :--- | :--- | :--- |
| **MOVING_AVERAGE 歸因** | 跨多日期買進後部分賣出 | `holdingDays` 為正確加權天數，`isLongTerm` 依 $\ge 365$ 正確判定 |
| **浮點差額扣除** | 奇數股/多次部分賣出 | 總扣除股數精確等於賣出股數，無任何碎股微量殘留 |
| **跨 Lot 沖銷** | 買進 100 股 + 100 股，一次賣出 150 股 | 生成 2 筆 disposal (100 股 + 50 股)，手續費與稅按比例分攤 |
| **手續費與稅分攤** | 賣出包含手續費 20 元與稅 30 元 | 各 disposal 依股數比例精準平攤 fee 與 tax |
| **TaxOptimizer 掃描** | 含有虧損 Lot 與獲利 Lot 之組合 | 正確篩選出虧損 > $10 之批次並按虧損幅度降冪排列，產出長短期建議 |

---

## 5. 驗收標準 (Acceptance Criteria)

1. `npm test` 通過全量測試（包含新增的測試案例），覆蓋率 100%。
2. `npm run build` TypeScript 嚴格編譯 0 錯誤、0 警告。
3. Modal 支援 `Escape` 鍵與點擊遮罩關閉。
4. 全數修正 Code Review 指出的 2 項 P1 缺陷與 5 項 P2 建議。
