# 產品需求規格書 (PRD)：V3.8 儀表板版面動線互換與券商級多幣別精度校正系統

- **文件編號**：`SPEC-0021`
- **版本**：`V3.8`
- **狀態**：`APPROVED`
- **作者**：Antigravity Agent
- **日期**：2026-08-25
- **追蹤 ADR**：[ADR-0021: 儀表板視覺動線調整與多幣別券商級精度架構](../adr/0021-layout-swap-and-broker-grade-currency-precision.md)

---

## 1. 背景與問題陳述 (Background & Problem Statement)

1. **儀表板視覺動線需直觀聚焦 (Layout Hierarchy)**：
   - 投資人在進入「投資組合與庫存」主工作區時，期望第一眼即能透過「資產配置 Treemap 樹狀圖 / 權重清單」掌握全盤資金分佈與曝險狀態，隨後再往下瀏覽 4 大 KPI 彙整數字與個股清單。原版面將 4 張統計卡片置於最頂端，割裂了視覺注意力。
2. **台股現金股利小數點尾數異常 (TWD Fraction Error)**：
   - 在個股時間軸與公司行動中，台股配息如永豐金計算出現 `22303.925 元` 的小數。依台灣集保結算所與股務代理慣例，現金股利發放應**無條件捨去至整數 (Math.floor)**，且貨幣單位應統一標示為 `NT$ X,XXX`。
3. **美股現金股利浮點數精度溢位與單位標示不符 (USD Precision & Formatting)**：
   - 美股 ETF（如 VT）每股配息乘上持有股數時，受 JavaScript 二進位浮點數乘法影響出現 `4.779999999999999 元` 且幣別錯誤標註為「元」。依美股主流券商（Firstrade / Schwab / IB）標準，股息發放一律**四捨五入至分 (Cents, 小數點後 2 位)**，並清楚標示為 `$X.XX USD`。

---

## 2. 核心功能規格 (Functional Specifications)

### 2.1 投資組合活頁版面動線互換 (Workspace Layout Swap)

在 [`src/App.tsx`](file:///d:/APP/股票紀錄/src/App.tsx) 調整 `activeTab === 'portfolio'` 之元件排版順序：
1. 🔝 **第一優先層 (頂部)**：`AllocationChart`（資產配置與持倉分布 Treemap / 權重切換）。
2. 📊 **第二層 (中段)**：`SummaryCards`（庫存總市值、未實現損益、已實現損益、累計股息收益）。
3. 📜 **第三層 (底段)**：`HoldingsTable`（個股即時報價、持倉明細與歷史時間軸）。

### 2.2 多幣別券商級精度計算規格 (Broker-Grade Precision Rules)

建立集中式格式化與精度引擎 [`src/utils/formatters.ts`](file:///d:/APP/股票紀錄/src/utils/formatters.ts)：

#### A. 現金股利計算 (`calculateDividendCash`)
- **🇹🇼 台股 (TWD)**：
  - 公式：`Math.floor(sharesHeld * pricePerShare)`
  - 例：`25,000 股 * 0.892157 = 22303.925` ➔ 精確計算為 `22,303` 元。
- **🇺🇸 美股 (USD)**：
  - 公式：`Math.round(sharesHeld * pricePerShare * 100) / 100`
  - 例：`10 股 * 0.478 = 4.779999999999999` ➔ 消除浮點數溢位，精確收斂為 `4.78` USD。

#### B. 幣別金額字串格式化 (`formatCurrencyAmount`)
- **TWD**：千分位整數顯示，格式為 `NT$ 22,303`。
- **USD**：千分位與固定 2 位小數顯示，格式為 `$4.78 USD`（或 `$1,234.50 USD`）。

#### C. 時間軸專屬格式化器 (`formatTimelineDividend` / `formatTimelineReduction`)
- 歷史時間軸全面移除硬編碼的 `${...} 元`：
  - 股息：台股輸出 `配發股息 NT$ 22,303`，美股輸出 `配發股息 $4.78 USD`。
  - 減資退款：台股輸出 `減 200 股 (退還 NT$ 2,000)`。

#### D. 股數格式化 (`formatSharesCount`)
- 台股：四捨五入整數顯示 `Math.round(shares).toLocaleString()`。
- 美股：支援碎股（Fractional shares），最多保留 4 位小數並自動去除末尾無效 0。

### 2.3 跨模組整合與補登系統升級

1. **公司行動掃描引擎 ([`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts))**：
   - 掃描除息與減資事件時，底層直接調用 `calculateDividendCash` 與 `normalizeCurrencyPrecision`，避免資料來源端產生不精確數據。
2. **公司行動補登彈窗 ([`src/components/CorporateActionScannerModal.tsx`](file:///d:/APP/股票紀錄/src/components/CorporateActionScannerModal.tsx))**：
   - 待補登清單項目、預估入帳彙總、一鍵補登產出之 `TradeRecord.cashAmount` 均套用標準多幣別精度。
3. **持倉明細表 ([`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx))**：
   - 展開之完整交易與公司行動歷史時間軸套用 `formatTimelineDividend` 與 `formatTimelineReduction`。

---

## 3. 驗收條件與測試矩陣 (Acceptance Criteria)

| 編號 | 測試場景 | 預期結果 |
| :--- | :--- | :--- |
| **AC-01** | 切換至「投資組合與庫存」標籤頁 | 樹狀圖 (Treemap) 位於 4 張 KPI 卡片上方，視覺無破版 |
| **AC-02** | 永豐金 (2890) 持有 25,000 股，除息 0.892157 元 | 時間軸與補登金額顯示 `配發股息 NT$ 22,303` (無小數點) |
| **AC-03** | VT 持有 10 股，除息 0.478 美元 | 時間軸與補登金額顯示 `配發股息 $4.78 USD` (非 4.779999999999999 元) |
| **AC-04** | 國巨 (2327) 減資退款 2,000 元 | 時間軸顯示 `減 200 股 (退還 NT$ 2,000)` |
| **AC-05** | 單元測試套件驗證 | `vitest run` 全數 115 項測試 100% 綠燈通過 |
| **AC-06** | TypeScript 與打包驗證 | `npm run build` 零錯誤，Production Bundle 輸出成功 |
