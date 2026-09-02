# 0027 現金流水帳自然排序、股息紀錄持久化與單一市場淨資產 (NAV) 嚴格過濾規格 (PRD)

## 1. 背景與現況痛點 (Problem Statement)

在股票投資追蹤與現金流水帳本日常使用過程中，存在以下三大核心計算與狀態問題：

1. **流水帳日期排序在「舊 ➔ 新」模式下錯亂 (Issue 1)**：
   先前現金流水帳本排序採用 `new Date(a.date).getTime()`，當遇到自動連動流水缺少 `date` 或日期字串微小格式差異時產生 `NaN`，導致 JavaScript 排序引擎發生不穩定錯置，使美股股息等紀錄固定卡在列表頂部，無法以自然日期由舊至新遞增排序。
2. **美股股息配發紀錄於重新整理後消失 (Issue 2)**：
   先前 `validateTradesSchema` 在反序列化時若遇任何單筆缺少非核心欄位（如 `accountId`）之紀錄，會直接回傳 `null`，進而觸發 `loadTradesFromStorage()` 直接覆蓋回退為預設範例資料；且公司行動智慧補登未自動填入所屬市場預設帳戶，同時頁面載入時流水帳未自動與交易帳本執行對齊。
3. **台股歷史折線圖淨資產金額被美股灌水 (Issue 3)**：
   當頂部市場切換為「台股 (TWD)」時，系統計算全歷史淨資產（NAV）每日序列時傳入了全量市場的交易與流水（包含美股 VT、SGOV 等折算為台幣的金額），導致台股視圖下的資產成長折線圖淨資產金額與投資組合內的台股持股市值嚴重脫鉤。

---

## 2. 使用者故事 (User Stories)

1. **流水帳自然遞增/遞減排序**：
   身為使用者，當我在「現金與借貸」分頁將排序切換為「舊 ➔ 新」時，我期望全量流水帳能嚴格按照 `YYYY-MM-DD` 由過去排列到未來；若同一天有多筆金流，應先顯示入金/股息流入，再顯示扣款/流出。
2. **股息與公司行動紀錄穩定持久化**：
   身為使用者，當我透過「智慧掃描」補登美股股息或手動登錄交易後，無論我如何重新整理頁面（F5）或重新開啟瀏覽器，所有補登之交易與對應之現金流水帳均應 100% 留存，絕不發生整份帳本被重置為範例資料的情況。
3. **單一市場視圖淨資產完全對齊**：
   身為使用者，當我將市場切換為「台股 (TWD)」時，資產成長 (NAV) 折線圖上顯示的淨資產金額、持股市值與本金應僅包含台股部位，不再被美股資產折合台幣所灌水，並與「投資組合與庫存」內的台股資產 100% 精準吻合。

---

## 3. 功能與架構詳細規格 (Functional & Architectural Specs)

### 3.1 標準化現金流水帳本排序函式 (`sortCashTransactions`)
- **模組路徑**：[`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts)
- **演算法規範**：
  1. 日期提取：統一採用 `(a.tradeDate || a.date || '')` 與 `(b.tradeDate || b.date || '')` 提取標準 `YYYY-MM-DD` 字串。
  2. 字串比對：使用 `localeCompare` 進行自然日期比對（`DESC` 模式為 `b.localeCompare(a)`，`ASC` 模式為 `a.localeCompare(b)`），徹底避免時間戳轉換之 `NaN` 錯誤與跨時區解析偏差。
  3. 同日權重排列：
     - 流入優先權 (Priority 1)：`DEPOSIT`、`INTEREST_INCOME`、`DIVIDEND_PAYOUT`、`STOCK_SELL`、`CAPITAL_RETURN`、`LOAN_DISBURSEMENT`、`FX_TRANSFER_IN`。
     - 稅費優先權 (Priority 2)：`TAX` 或包含「預扣稅」之紀錄。
     - 流出優先權 (Priority 3)：`STOCK_BUY`、`WITHDRAWAL`、`LOAN_REPAYMENT`、`WIRE_FEE`、`FINANCING_FEE`。
     - 在 `ASC (舊 ➔ 新)` 模式下：先流入 (1) ➔ 後稅費 (2) ➔ 後流出 (3)。
     - 在 `DESC (新 ➔ 舊)` 模式下：後流出 (3) ➔ 稅費 (2) ➔ 先流入 (1)。

### 3.2 交易資料庫 Schema 容錯與持久化閉環
- **模組路徑**：[`src/utils/storage.ts`](file:///d:/APP/股票紀錄/src/utils/storage.ts)、[`src/components/CorporateActionScannerModal.tsx`](file:///d:/APP/股票紀錄/src/components/CorporateActionScannerModal.tsx)
- **演算法規範**：
  1. `validateTradesSchema` 容錯：改為逐筆驗證，若某筆記錄為 null 或非物件則安全略過；只要資料集中存在至少 1 筆合法交易，即回傳合法交易陣列，杜絕回傳 `null` 導致整庫回退為範例資料之風險。
  2. 補登自動綁定帳戶：智慧掃描建立 `TradeRecord` 時，自動依據 `market === 'US'` 填入 `broker-us-default` 或台股預設帳戶。
  3. App 初始化對齊：在 `App.tsx` 初始化 `cashTransactions` 時，調用 `syncTradesWithCashTransactions(storedTrades, storedCash)` 確保股息流水與歷史交易 100% 雙向對齊。

### 3.3 單一市場範疇 NAV 每日序列過濾
- **模組路徑**：[`src/App.tsx`](file:///d:/APP/股票紀錄/src/App.tsx)、[`src/engine/historicalNav.ts`](file:///d:/APP/股票紀錄/src/engine/historicalNav.ts)
- **過濾規範**：
  - `scopedTrades`: 當 `currentMarket === 'ALL'` 時取全量 trades；否則取 `trades.filter(t => t.market === currentMarket)`。
  - `scopedCash`: 當 `currentMarket === 'ALL'` 時取全量 cashTransactions；`currentMarket === 'US'` 時取 `c.currency === 'USD'`，`currentMarket === 'TW'` 時取 `c.currency === 'TWD'`。
  - `scopedLoans`: 當 `currentMarket === 'ALL'` 時取全量 loanRecords；`currentMarket === 'US'` 時取 `l.currency === 'USD'`，`currentMarket === 'TW'` 時取 `l.currency === 'TWD' || !l.currency`。

---

## 4. 驗收條件 (Acceptance Criteria, AC)

- **AC-1 (流水帳 ASC 排序正確)**：在「現金與借貸」分頁點擊排序為「舊 ➔ 新」時，列表頂部應為最舊日期（如 2025-08-25），美股股息（如 2026-06-23）嚴格排於後方；同日 2025-09-23 股息入帳排於預扣稅上方。
- **AC-2 (流水帳 DESC 排序正確)**：在「現金與借貸」分頁點擊排序為「新 ➔ 舊」時，列表頂部應為最新日期（如 2026-06-23）；同日 2025-09-23 預扣稅排於股息入帳上方。
- **AC-3 (股息重整不消失)**：透過智慧掃描補登美股股息後，按瀏覽器重新整理（F5），交易帳本與美股現金流水帳本中該筆股息紀錄完整留存，不被清除或回退。
- **AC-4 (台股 NAV 折線圖金額精確)**：切換至「台股 (TWD)」市場時，資產成長 (NAV) 折線圖上方淨資產金額與投資組合台股持股市值精準一致，完全排除美股標的（如 VT、SGOV 等）市值。
- **AC-5 (測試與建置 100% 綠燈)**：`npm test` 151 筆測試 100% 通過，`npm run build` 0 錯誤。
