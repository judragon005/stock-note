# ADR-0021: 儀表板視覺動線調整與多幣別券商級精度架構

- **狀態**：`ACCEPTED`
- **日期**：2026-08-25
- **關聯 PRD**：[SPEC-0021: 儀表板版面動線互換與券商級多幣別精度校正系統](../specs/0021-layout-swap-and-broker-grade-currency-precision.md)

---

## 1. 背景與上下文 (Context)

1. **使用者體驗與視覺動線**：
   - 投資人在檢視投資組合時，通常偏好先查看資產配置比例（Treemap 樹狀圖），快速評估大類資產曝險，再瀏覽具體 KPI 指標（總市值、損益、股息）。
2. **多幣別精度與券商標準**：
   - 台股除息實務上（台灣集中保管結算所與各大券商）配發金額皆採**無條件捨去至整數 (Math.floor)**，不應在帳本中產生小數尾數。
   - 美股除息實務上（Firstrade / Charles Schwab / IB）皆採**四捨五入至分 (Cents, 小數點後 2 位)**，原系統受 JavaScript 浮點數精度溢位影響會出現類似 `4.779999999999999` 的異常。

---

## 2. 決策方案 (Decisions)

1. **版面動線調整**：
   - 在 `src/App.tsx` 調整 `portfolio` 標籤頁的 DOM 順序：將 `AllocationChart` 置於頂部，`SummaryCards` 置於中段，`HoldingsTable` 置於底段。
2. **集中式精度與格式化模組 (`src/utils/formatters.ts`)**：
   - 建立 `calculateDividendCash`、`normalizeCurrencyPrecision`、`formatCurrencyAmount`、`formatTimelineDividend`、`formatTimelineReduction`、`formatSharesCount`。
   - 台股 (TWD) 股息計算強制使用 `Math.floor`；美股 (USD) 股息強制四捨五入至 2 位小數。
   - 美股單位明確以 `$X.XX USD` 或 `USD` 標註，台股以 `NT$ X,XXX` 標註，淘汰硬編碼的「元」。
3. **系統全域同步**：
   - 智慧補登掃描器 (`corporateActionScanner.ts`)、補登彈窗 (`CorporateActionScannerModal.tsx`) 與時間軸清單 (`HoldingsTable.tsx`) 全面接入該模組。

---

## 3. 結果與效益 (Consequences)

- **優點**：
  - 視覺層級更聚焦，資產配置大圖優先呈現。
  - 徹底消除 JS 浮點數精度毛邊，資料與台灣集保結算所、美股券商對帳單 100% 吻合。
  - 集中格式化工具方便未來擴展其他法幣（如 JPY、EUR、HKD）。
- **風險與防禦**：
  - 透過 10 組全新單元測試與既有 105 組測試進行端到端防禦，保證歷史數據與損益計算不破壞。
