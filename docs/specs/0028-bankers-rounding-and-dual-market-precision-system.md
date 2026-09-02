# 0028 銀行家捨入法 (Banker's Rounding) 與台美雙市場會計精度隔離規格 (PRD)

## 1. 背景與現況痛點 (Problem Statement)

在美股與台股跨市場資產與現金帳本管理中，存在以下計算法則與會計精度差異：

1. **美股券商累計小數偏差**：
   先前美股交易、股息與 30% 預扣稅採用 JavaScript 預設的傳統四捨五入（Round Half Up），在面對處於 `.5` 中間值的小數金額（例如 `$11.15 × 30% = $3.345`、`$0.15 × 30% = $0.045`）時，一律向上進位，導致預扣稅向上灌水、股息淨額低估，累積產生 $0.01 ~ $0.05 的向上統計偏差（Upward Bias），使帳本可用現金餘額與美國券商（如 Charles Schwab）實際帳戶結帳餘額出現美分差距。
2. **台美雙市場會計慣例混淆風險**：
   台灣證券市場（TWSE/集保）在現金股息、退款與部分稅費計算上慣例採用「無條件捨去至元 (Math.floor)」，而美國證券市場（US GAAP / SEC / IRS）則採用「銀行家捨入法 (Banker's Rounding / Round Half to Even / 奇進偶捨)」。若兩者演算法未做嚴格架構隔離，極易導致台股計算出現小數點異常或美股美分精度失真。

---

## 2. 使用者故事 (User Stories)

1. **美股嘉信結算慣性 100% 精準吻合**：
   身為使用者，當我在美股現金流水帳本中查看股息入帳、30% 預扣稅、活存利息與股票交割款時，系統能自動遵循美國證券業 Banker's Rounding 慣例進行結算，使卡片上的可用現金餘額與嘉信理財 App 顯示之真實餘額（如 `$224.79`）一分不差、精準對齊。
2. **台美雙市場制度嚴格隔離**：
   身為使用者，當我查看台股部位時，系統嚴格維持台灣集保慣用的整數無條件捨去規則，絕不將美股的 2 位小數演算法外溢干擾台股計算。

---

## 3. 功能與架構詳細規格 (Functional & Architectural Specs)

### 3.1 銀行家捨入法演算法 (`bankersRound`)
- **模組路徑**：[`src/utils/formatters.ts`](file:///d:/APP/股票紀錄/src/utils/formatters.ts)
- **演算法規範**：
  1. 輸入任意浮點數 `num` 與保留位數 `decimalPlaces`（預設為 2）。
  2. 當小數第 `decimalPlaces + 1` 位處於精確的中間點 `.5` 時，向最接近的「偶數 (Even)」捨入：
     - 若末位為偶數（如 `3.345`），捨去為 `3.34`。
     - 若末位為奇數（如 `3.335`），進位為 `3.34`。
     - 若末位為偶數（如 `0.045`），捨去為 `0.04`。
  3. 若非處於中間點 `.5`，則依正常距離向最近數值捨入（如 `1.434 ➔ 1.43`、`13.527 ➔ 13.53`）。

### 3.2 美股金流交割與餘額清洗閉環
- **模組路徑**：[`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts)
- **規範細節**：
  1. 美股股息 30% 預扣稅：`isUS` 模式下，`tax = bankersRound(gross * 0.3, 2)`。
  2. 美股買賣交割款：`isUS` 模式下，`amount = bankersRound(rawAmount, 2)`。
  3. 帳戶餘額匯總清洗：在 `calculateAccountBalances` 中，針對 `currency === 'USD'` 之帳戶，其 `balance`、`pendingSettlementAmount`、`totalStockBuys`、`totalDividends` 等欄位在迴圈結算時統一透過 `bankersRound(val, 2)` 消除 JavaScript 浮點數累加毛邊。

### 3.3 台股整數會計慣例強制隔離
- **規範細節**：
  - 當 `currency === 'TWD'` 或 `market === 'TW'` 時：
    - `calculateDividendCash` 強制使用 `Math.floor` 整數。
    - `normalizeCurrencyPrecision` 強制使用 `Math.floor` 整數。
    - `calculateAccountBalances` 強制使用 `Math.round` 整數結算。

---

## 4. 驗收條件 (Acceptance Criteria, AC)

- **AC-1 (奇進偶捨演算法正確性)**：`bankersRound(3.345, 2)` 回傳 `3.34`，`bankersRound(3.335, 2)` 回傳 `3.34`；`bankersRound(0.045, 2)` 回傳 `0.04`，`bankersRound(0.035, 2)` 回傳 `0.04`。
- **AC-2 (美股預扣稅與交割款精準對齊)**：美股未填稅額之股息自動試算 30% 預扣稅時，嚴格採用 Banker's Rounding 試算。
- **AC-3 (台股整數完全隔離)**：台股股息與總額計算維持 `Math.floor` 整數，不產生任何美分小數。
- **AC-4 (測試與建置 100% 綠燈)**：`npm test` 153 筆測試 100% 通過，`npm run build` 0 錯誤。
