# 技術債 #0021: 定期定額 (DCA) 智慧回測、執行偏離度與扣款交割防透支引擎 (Smart DCA Simulator & Cashflow Scheduler)

- **狀態**：`RESOLVED` (已於 v8.31.0 ADR #0112 完整解決)
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 定期定額與長期投資紀律需求調研
- **建立日期**：2026-09-02
- **標籤**：`Architecture` · `DCA` · `Cashflow` · `Simulation` · `Discipline` · `Workflow`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備完善的單次交易紀錄、多批次沖銷會計與目標資產偏離度再平衡推薦器（[src/engine/rebalancingEngine.ts](file:///d:/APP/股票紀錄/src/engine/rebalancingEngine.ts)）：
1. **靜態與已發生交易導向**：現有會計模型以「已經成交的交易明細 (`TradeRecord`)」為基底計算持倉成本與損益。
2. **缺乏定期定額計畫 (DCA Plan) 生命週期追蹤**：
   - 多數指數化投資人（如持有 0050、006208、00878、00919、VT 等）採用每月固定日期（如 6 日、16 日、26 日）自動扣款定期定額或定期定股。
   - 目前使用者必須手動在扣款成交後一筆筆補登交易，無法預設定投合約計畫，亦無法量化「設定的定投計畫 vs 實際執行的完成度 (Execution Adherence Rate)」。
3. **現金帳本無法預防定期定額交割透支**：
   - 現金帳本（[src/engine/cashLedgerEngine.ts](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts)）與在途資金引擎（[src/engine/inTransitEngine.ts](file:///d:/APP/股票紀錄/src/engine/inTransitEngine.ts)）僅能反映「已委託/已成交」的交割扣款。
   - 無法提前排程預估未來 7~30 天定期定額預扣款項，導致投資人可能在交割戶餘額不足時產生違約交割風險。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **逢假日自動遞延與真實成交價回溯複雜度**：
   - 定期定額約定扣款日若逢週六、週日或國定假日（如春節、清明），券商實際扣款與成交日將自動順延至下一交易日（$T+1$ 工作日）。
   - 回測引擎必須無縫結合專案既有的國定假日休市日曆引擎（`settlementEngine.ts`），才能計算出真實扣款成交日。
2. **DCA vs. Lump-Sum (單筆投入) 機會成本科學對比**：
   - 長期投資人常面臨「單筆歐印 vs 分批定投」的心魔拉扯。需透過本地歷史日 K 線庫，回測過去 1~5 年同等本金下兩種策略的最終資產累積、最大回撤 (MDD) 與平均成本曲線。
3. **定投計畫管理與一鍵轉正式交易 (One-Click Conversion)**：
   - 扣款當天應提供「今日有 X 筆定期定額待執行」推播提醒，並支援一鍵按當日成交價或約定金額直接轉為正式 `TradeRecord` 與現金交割流水，消除重複手動輸入之繁瑣。

### 暫緩理由 (Deferral Rationale)
1. 現行手動記帳與 CSV 匯入功能已可完整滿足基礎記帳需求。
2. 定期定額模擬與排程屬進階投資紀律與金流自動化功能，先收錄於技術債中完成數據模型與演算法設計，待下一階段專題開發時推進。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. 定期定額計畫資料結構 (DCA Plan Schema)

擴充 IndexedDB `dcaPlans` Store：
```typescript
export type DCAType = 'FIXED_AMOUNT' | 'FIXED_SHARES'; // 定期定額 vs 定期定股
export type DCAFrequency = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY';

export interface DCAPlan {
  id: string;
  symbol: string;               // 標的代碼 (如 0050, VT)
  market: 'TW' | 'US';
  accountId: string;            // 指定扣款券商帳戶
  type: DCAType;
  amountOrShares: number;       // 每期扣款金額 (TWD/USD) 或固定股數
  frequency: DCAFrequency;
  executionDays: number[];      // 每月扣款日 (如 [6, 16, 26])
  startDate: string;            // 計畫起日 YYYY-MM-DD
  endDate?: string;             // 計畫迄日 (選填)
  isActive: boolean;            // 是否啟用中
  reinvestDividends: boolean;   // 股息自動再投資
  createdAt: number;
}
```

### B. 定期定額金流排程與防透支預警 (Cashflow Projection & Overdraft Guard)

```typescript
export interface DCACashflowProjection {
  date: string;                 // 預計扣款實際交易日 (已處理假日順延)
  planId: string;
  symbol: string;
  projectedCost: number;        // 預計扣款金額 (含手續費)
  projectedCashAfter: number;   // 扣款後交割戶預估剩餘現金
  isOverdraftRisk: boolean;     // 是否有透支/餘額不足風險 (🔴 餘額 < 0)
}
```

### C. DCA 歷史回測與機會成本對照引擎 (DCA Backtest Engine)

- **回測指標**：
  - **總累積股數**：$N_{\text{DCA}}$ vs $N_{\text{LumpSum}}$
  - **平均持股成本**：$\bar{C}_{\text{DCA}} = \frac{\sum \text{投入金額}}{\sum \text{買進股數}}$
  - **最大帳面浮虧 (Max Drawdown, MDD)**：比較定投分批在空頭市場中的抗震平滑效果。
  - **內部報酬率 (XIRR)**：衡量真實資金加權回報。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 規劃「定期定額 (DCA) 追蹤與回測工作台」時。
2. 升級現金帳本加入「未來 30 天金流收支預測與交割戶安全水位警示」時。
3. 整合台美股歷史 K 線進行策略績效回測時。

---

## 5. 解決實作與成果說明 (Resolution & Outcome)

- **解決版本**：`v8.31.0` (依據 [SPEC-0112](../specs/0112-fire-compounding-drip-and-dca-simulator-spec.md) 與 [ADR-0112](../adr/0112-fire-compounding-drip-and-dca-simulator.md))
- **實作模組**：
  - 運算引擎：[`src/engine/dcaSchedulerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dcaSchedulerEngine.ts)
  - 單元測試：[`src/engine/dcaSchedulerEngine.test.ts`](file:///d:/APP/股票紀錄/src/engine/dcaSchedulerEngine.test.ts) (100% 綠燈覆蓋)
  - 介面面板：[`src/components/FirePlanningWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/FirePlanningWorkspace.tsx) (DCA 未來 30 天扣款時序與交割防透支面板)
- **交付成果**：
  1. 完整整合專案既有之 `settlementEngine.ts` 國定休市日曆，扣款約定日遇週末或假日自動順延至下一撮合營業日 ($T$ 日)，並精準推導交割結算日（台股 $T+2$、美股 $T+1$）。
  2. 依帳戶維度推演未來 30 天預估可用現金水位，一旦餘額不足即刻標記紅燈預警並給出精確資金補足缺口 (`shortfallAmountTwd`)。
  3. 實作 DCA vs. 單筆歐印 (Lump-Sum) 歷史機會成本與最大回撤 (MDD) 回測演算法。

