# Spec 0117: 籌碼動態星圖盤中有效日報回溯機制與質押借貸「費用➔利息➔本金」法定沖償引擎規格書

## Problem Statement

本規格書針對近期使用者反饋之兩大核心系統缺陷進行深度架構重構與標準化：

### 1. 籌碼動態星圖盤中空值與 0 張現象 (Smart Money Zero Chips Defect)
- **盤後資料時差脫鉤**：臺灣證券交易所 (TWSE) 與櫃檯買賣中心 (TPEx) 的三大法人買賣超日報，於每日交易日 **15:00 ~ 16:30** 之間才會陸續匯整公布。使用者於盤中（09:00 ~ 13:30）或下午 3 點前開啟系統時，當日盤後籌碼根本尚未出爐。
- **中性靜默 Fallback 導致誤導**：現行 [`smartMoneyFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyFetcher.ts) 與 [`smartMoneyEngine.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyEngine.ts) 在抓取不到當日籌碼時，直接 fallback 為 `0 張`。這導致所有股票（如國巨 2327、台積電 2330、0050 等）的外資、投信、自營商買賣超均顯示 `+0 張`，資金流向得分（`flowScore`）歸零，所有泡泡全部緊貼在垂直 Y=0 的橫軸線上排成一排。
- **缺乏資料狀態指示器與真實日期**：UI 缺乏「籌碼資料狀態與日期標籤」，使用者無法得知當前資料是哪一天、是否已公布最新日報；且時間軸使用寫死的 `T-4, T-3, T-2, T-1` 抽象字串，導致時序回放無法與 IndexedDB 沉澱之真實歷史日報對齊。

### 2. 質押借貸「部分還本」篡改繳息起算日、利息蒸發與規費重複計費 (Pledge Loan Repayment & Fee Collision Defect)
- **還本操作誤植繳息日起點 (Critical Bug)**：在現行 [`CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) 中，使用者執行「還本」（償還部分本金）時，代碼強制將 `lastInterestPaymentDate` 覆寫為還本當日（如 2026-09-10）。這導致從借款起日（2026-09-09）到還款日之間由原借款本金（約 201 萬）所產生的利息（NT$ 224）憑空蒸發、漏算，次日系統僅計算還款後剩餘本金（99.9 萬）的 1 天利息。
- **違反民法法定清償順序**：臺灣《民法》第 323 條與金融機構還款慣例明確規定清償順序為：**「費用 ➔ 利息 ➔ 本金」**。現行系統卻粗暴將還款金額 100% 抵扣本金，無法如實反映券商扣款時「先扣集保撥券費 60 元與利息 224 元，餘額 1,011,836 元沖償本金」的實務操作。
- **規費二次重複計費**：使用者在還款時已被券商收取集保解質撥券費 60 元，但系統的借貸合約規費欄位未標記結清，導致卡片上的「當前應還款總金額」持續加上這 60 元，造成重複收費。
- **美股融資借貸潛在破綻**：美股（USD）借貸使用同一套代碼，同樣存在還本時利息被清空的嚴重 Bug；且美股券商（IBKR/Schwab）由 DTC 集中保管，實務上零解質撥券規費，現行系統缺乏跨市場規費與自動資本化計息適配。

---

## Solution

### 1. 籌碼動態星圖：盤中自動載入前一日已確認日報與狀態指示器

1. **Last Known Good 日報回溯哨兵 (`fetchTwseInstitutionalReport` 升級)**：
   - 在每日 15:30 之前，或當日證交所尚未公布盤後日報時，系統自動將基準目標日期設定為**「前一交易日（T-1）已確認結算之日報」**。
   - 若線上請求遭遇網路波動或阻擋，系統主動向歷史回溯檢索本地 IndexedDB 中最新一份有效日報（以 `2330` 台積電數據存在為有效哨兵），保證畫面「永遠有完整真實的法人買賣超」，絕不傳回空物件或顯示全 0 張。
   - 函數回傳結構升級為：
     ```typescript
     export interface InstitutionalReportResult {
       reportDate: string;        // 確切資料日期 (YYYYMMDD，如 20260910)
       isLiveToday: boolean;       // 是否為今日最新盤後
       data: Record<string, TwseInstitutionalRow>;
       totalSymbols: number;       // 涵蓋檔數 (如 1250)
     }
     ```
2. **籌碼資料狀態透明化標籤 (Data Provenance Status Badge)**：
   - 於星圖右上角與標題處新增狀態提示：
     - 盤中模式：`🕒 盤中模式：顯示 09/10 盤後籌碼 (今日盤後預計 15:30 更新)`
     - 盤後已同步：`🟢 已同步：2026-09-11 盤後籌碼 (共 1,280 檔)`
     - 若特定持倉標的確無法人進出或未上市櫃，明確標示「此標的無盤後法人進出數據」，取代誤導性描述。
3. **時間軸滑桿真實交易日化**：
   - 底部播放時間軸全面對齊真實 5 個交易日字串（如 `20260904 ➔ 20260905 ➔ 20260908 ➔ 20260909 ➔ 20260910`），徹底移除 `T-4, T-3` 虛擬代號。

---

### 2. 質押借貸與融資：落實「費用 ➔ 利息 ➔ 本金」法定沖償引擎

1. **底層沖償演算法純函數 (`applyDebtRepayment`)**：
   - 在 [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) 中新增金融級純函數：
     ```typescript
     export interface DebtRepaymentInput {
       loan: LoanRecord;
       repaymentAmount: number;
       repaymentDate: string;
       waivePledgeFees?: boolean; // 是否免除或不處理規費
     }

     export interface DebtRepaymentResult {
       feesPaid: number;          // 沖銷之設質三大規費 (台股撥券費等)
       interestPaid: number;      // 沖銷之累積利息
       principalPaid: number;     // 沖償之借款本金
       remainingPrincipal: number;// 剩餘未還本金
       remainingPledgeFees: number; // 剩餘未結規費
       isInterestFullyPaid: boolean; // 利息是否全數清償
       newLastInterestPaymentDate?: string; // 更新後之起算繳息日
       splitTransactions: CashTransaction[]; // 自動拆分之現金流水
       updatedLoan: LoanRecord;   // 更新後之借貸合約
     }
     ```
   - **法定沖償運算邏輯**：
     1. 第一順位（規費）：$\text{feesPaid} = \min(\text{repaymentAmount}, \text{loanPledgeFees})$
     2. 第二順位（利息）：$\text{interestPaid} = \min(\text{repaymentAmount} - \text{feesPaid}, \text{accruedInterest})$
     3. 第三順位（本金）：$\text{principalPaid} = \min(\text{repaymentAmount} - \text{feesPaid} - \text{interestPaid}, \text{loan.principal})$
     4. **繳息日起點維護準則**：
        - 僅當利息「完全結清」（$\text{interestPaid} == \text{accruedInterest}$）時，`lastInterestPaymentDate` 才可推進至 `repaymentDate`。
        - 若還款金額不足以結清全部利息，或使用者明確選擇「純還本」，**嚴禁篡改 `lastInterestPaymentDate`**！
2. **還款彈窗「智慧拆分試算」介面**：
   - 於還款彈窗中，當使用者輸入扣款總金額（如 `1,012,120`）時，系統實時拆解顯示：
     - 規費沖銷：`NT$ 60`
     - 應計利息（1 天）：`NT$ 224`
     - 沖償本金：`NT$ 1,011,836`
     - 剩餘借款本金：`NT$ 999,940`
   - 一鍵確認後，自動寫入現金帳本之對應拆分流水，且借貸合約之規費欄位同步歸零，絕不重複加總！
3. **美股市場融資借貸適配 (US Margin Alignment)**：
   - 當 `loan.currency === 'USD'` 時，預設規費為 0，還款金額自動依「未付利息 ➔ 融資本金」沖償。
   - 借貸卡片起日旁清楚標記：「上次還款/結息日：YYYY-MM-DD（已還本 $X · 結息 $Y）」。

---

## User Stories

1. **作為台股投資人**，我在營業時間（盤中）打開「聰明錢動態星圖」時，我希望系統預設顯示昨天（前一交易日）已結算的完整法人籌碼，並清楚標示「盤中模式」，讓我能獲得準確的個股籌碼動能，而不是看到所有標的都顯示 0 張。
2. **作為質押借款投資人**，當我執行部分還款時，我希望系統能遵循「費用 ➔ 利息 ➔ 本金」將我付出的款項精準拆分，並自動結清已發生的利息與撥券規費，讓合約不再重複計算該筆 60 元規費，且利息天數與剩餘本金分毫不差。
3. **作為美股投資人**，在進行美元融資還款時，我希望系統能正確認列已累積的美元利息並抵扣本金，絕不把未結算的利息清空。

---

## Implementation Decisions

### 1. 籌碼資料抓取時間閥值與回溯原則
- **時間閥值**：以台北時間 `15:30` 為分界點（考量 TWSE 每日 15:00~15:30 伺服器匯整時間）。小於 15:30 一律預設載入前一交易日。
- **本地快取優先檢索**：在進行任何線上請求前，優先以 `TWSE_TPEX_CHIPS_V4_${date}` 檢索 IndexedDB。
- **回退哨兵**：若前一交易日無資料，自動依據 `getPreviousTradingDateString` 最多往前檢索 5 個交易日，直到 `isMarketCoverageValid`（包含台積電 2330 數據）成立。

### 2. 還款沖償引擎核心數據模型
```typescript
// src/engine/cashLedgerEngine.ts
export function applyDebtRepayment(input: DebtRepaymentInput): DebtRepaymentResult {
  const { loan, repaymentAmount, repaymentDate, waivePledgeFees = false } = input;
  const metrics = calculateLoanInterestAndPayoff(loan, repaymentDate);

  // 1. 規費優先
  const pledgeFeesToPay = waivePledgeFees ? 0 : metrics.pledgeFees;
  const feesPaid = Math.min(repaymentAmount, pledgeFeesToPay);
  let remaining = repaymentAmount - feesPaid;

  // 2. 利息次之
  const interestPaid = Math.min(remaining, metrics.accruedInterest);
  remaining -= interestPaid;

  // 3. 本金末之
  const principalPaid = Math.min(remaining, loan.principal);
  const remainingPrincipal = Math.max(0, loan.principal - principalPaid);
  const remainingPledgeFees = Math.max(0, pledgeFeesToPay - feesPaid);

  const isInterestFullyPaid = interestPaid >= metrics.accruedInterest;
  const newLastInterestPaymentDate = isInterestFullyPaid
    ? repaymentDate
    : loan.lastInterestPaymentDate;

  // 生成對應帳本流水...
}
```

---

## Testing Decisions

### 1. 籌碼動態測試縫隙 (`src/engine/smartMoneyFetcher.test.ts`)
- **測試案例 1**：當系統時間在 15:30 前，`fetchTwseInstitutionalReport` 應自動以 T-1 日期發起請求，並回傳有效數據與正確日期。
- **測試案例 2**：當線上 API 逾時或回傳空值時，應自動向歷史遞迴回溯，命中 IndexedDB 中最新存在的有效日報，絕不回傳空字典。
- **測試案例 3**：驗證回傳的 `reportDate` 與 `totalSymbols` 確實反映該份日報之實際統計。

### 2. 借貸還款引擎測試縫隙 (`src/engine/cashLedgerEngine.test.ts`)
- **測試案例 1（還款 1,012,120 精準拆分）**：
  - 輸入：借款本金 2,012,000，年利率 4.06%，計息 1 天（利息 224），撥券費 60。
  - 還款金額：1,012,120。
  - 驗證：`feesPaid == 60`, `interestPaid == 224`, `principalPaid == 1,011,836`, `remainingPrincipal == 999,940`，`remainingPledgeFees == 0`，且 `newLastInterestPaymentDate == repaymentDate`。
- **測試案例 2（防重複計費）**：
  - 接續案例 1，在次日（計息 1 天）計算 `calculateLoanInterestAndPayoff`：
  - 驗證：應返還利息為 NT$ 111，設質規費為 NT$ 0，總結清金額為 NT$ 1,000,051（而非重複加 60 變成 1,000,111）。
- **測試案例 3（純還本不推進繳息日）**：
  - 當使用者指定純還本，且利息未結算時，驗證 `lastInterestPaymentDate` 保持原值不變，日後仍正確累加前段利息。
- **測試案例 4（美股 USD 融資還款）**：
  - 驗證美股借貸規費為 0，還款依「未付利息 ➔ 本金」順序沖銷。
