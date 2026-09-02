# 產品需求規格書 (PRD)：V3.7 股息摩擦稅負追蹤系統（台股二代健保 2.11% 與美股 30% IRS 預扣稅）

- **文件編號**：`SPEC-0020`
- **版本**：`V3.7`
- **狀態**：`APPROVED`
- **作者**：Antigravity Agent
- **日期**：2026-08-24
- **追蹤 ADR**：[ADR-0020: 股息摩擦稅負與雙市場預扣稅追蹤架構](../adr/0020-dividend-tax-and-withholding-tracking.md)

---

## 1. 背景與問題陳述 (Background & Problem Statement)

投資人在進行長期存股與價值投資時，股利收益往往會伴隨不同稅務轄區的法定扣繳與補充保費：
1. **台股二代健保補充保費隱形**：依全民健康保險法規定，單筆現金股利達 **NT$ 20,000 元（含）以上**，需就源扣繳 **2.11%** 補充保費。投資人領取現金股利時，通常已被券商與集保預先扣除，但在系統中缺乏獨立累計呈現，難以掌握實際為健保貢獻的摩擦成本。
2. **美股 30% 股息預扣稅 (Withholding Tax) 侵蝕現金流**：非美國稅務居民投資美股，現金股息直接由美國國稅局 (IRS) 就源預扣 **30%** 稅額。投資人需要明確掌握累積被扣繳的美元總額及其折合台幣價值。
3. **現有介面呈現分散且互斥**：目前雖然計算引擎已具備稅額試算，但「設定 ➔ 摩擦成本看板」缺少專屬的發光統計卡片，且「摩擦深度分析儀」彈窗曾採用台美股互斥條件展示，無法在全部市場模式下同時清晰比對雙市場的除權息摩擦稅負。

---

## 2. 核心功能規格 (Functional Specifications)

### 2.1 計算引擎精確稅務邏輯 (Engine Calculation Rules)

- **台股二代健保補充保費 (`totalTWDividendTax`)**：
  - **條件與費率**：單筆股息總額（`shares * price`）達 **NT$ 20,000 元**（含）以上，扣繳費率為 **2.11%**（`Math.floor(volume * 0.0211)`）。未滿 2 萬元則免扣（`0`）。
  - **自訂覆蓋**：若交易紀錄中已填寫實扣 `tax > 0`，則優先取用 `tax` 欄位值。
- **美股 30% 股息預扣稅 (`totalUSDividendTax` & `totalUSDividendTaxInTWD`)**：
  - **條件與費率**：美股標的現金股息預扣 **30%**（`Math.round(volume * 0.3 * 100) / 100` 或四捨五入整數）。
  - **自訂覆蓋**：若交易紀錄中已填寫實扣 `tax > 0`，優先取用 `tax`。
  - **匯率換算**：支援原幣 (USD) 與即時匯率折算台幣 (`USD * usdRate`)。

### 2.2 多維度介面展示規格 (UI & Visualization)

#### A. 「設定」工作區 ➔ 摩擦成本頂部發光看板 ([SettingsWorkspace.tsx](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx))
根據頂部市場選擇器（全部市場 / 台股 / 美股）動態調適呈現：
1. **台股模式 (TW)**：
   - 顯示「**累計二代健保補充保費**」發光卡片（紫/琥珀漸層）。
   - 金額：`NT$ {totalTWDividendTax.toLocaleString()}`。
   - 說明文字：「單筆達 2 萬課 2.11% · 累計已自股息扣繳」。
2. **美股模式 (US)**：
   - 顯示「**美股 30% 股息預扣稅**」發光卡片（紅/粉漸層）。
   - 金額：`$ {totalUSDividendTax.toLocaleString()} USD`（副標標示折合 `NT$ {totalUSDividendTaxInTWD.toLocaleString()}`）。
   - 說明文字：「美國國稅局 IRS 30% Withholding Tax 扣繳」。
3. **全部市場模式 (ALL)**：
   - 顯示「**除權息摩擦稅負總計**」發光卡片。
   - 主金額：折合台幣總額 `NT$ {(totalTWDividendTax + totalUSDividendTaxInTWD).toLocaleString()}`。
   - 副標註記：「台股二代健保 NT$ X · 美股預扣 $Y USD」。

#### B. 「投資組合與庫存」標籤頁 ➔ 累積已領取現金配息卡片 ([SummaryCards.tsx](file:///d:/APP/股票紀錄/src/components/SummaryCards.tsx))
在「累積已領取現金配息」卡片底部新增稅負扣繳明細標籤（Pill Badges）：
- 台股有健保稅時：顯示 `二代健保 -NT$ X`。
- 美股有預扣稅時：顯示 `美股預扣 30% -$Y USD`（或折合台幣）。
- 若無扣繳則保持精簡版面。

#### C. 「交易摩擦成本深度分析儀」彈窗 ([FrictionCenterModal.tsx](file:///d:/APP/股票紀錄/src/components/FrictionCenterModal.tsx))
- 解除互斥覆蓋，改為**獨立雙指標網格**：
  - **指標 1**：台股二代健保 (2.11%) 累計已繳金額與明細。
  - **指標 2**：美股股息 30% 預扣稅累計金額（USD / 折合 TWD）。

---

## 3. 非功能性需求與驗證準則 (Non-Functional Requirements & Verification)

1. **第一性原理與 KISS 原則 (First Principles & Simplicity)**：
   - 沿用現有 `calculateFrictionCostSummary` 輸出架構，僅補強資料邊界條件與 UI 雙向連動，杜絕過度工程化。
2. **測試驅動開發 (TDD 100% 綠燈)**：
   - 於 `calculator.test.ts` 完整覆蓋台股二代健保門檻 (單筆 19,999 免扣、單筆 20,000 扣 422 元) 與美股 30% 預扣稅計算。
   - 確保所有既有單元測試（包含平倉、總覽、摩擦成本、公司行動）100% 通過。
3. **極致視覺體驗 (Design Aesthetics)**：
   - 延續深色玻璃擬態 (Glassmorphism) 設計風格，發光色彩與市場別統一（台股藍/琥珀、美股紫/紅、獲利翡翠綠）。
