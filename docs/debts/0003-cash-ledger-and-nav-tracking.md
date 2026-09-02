# 技術債 #0003: 現金帳本與資產淨值追蹤系統 (Cash Ledger & NAV Tracking)

- **狀態**：`RESOLVED` (於 v3.9 / ADR #0022 完整實作)
- **優先級**：`P2`
- **發現來源**：PROMPT 對齊與需求分析 (Gap Analysis)
- **建立日期**：2026-08-25
- **標籤**：`Architecture` · `Feature` · `Accounting`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統僅針對證券持倉（`HoldingPosition`）與買賣歷史（`TradeRecord`）進行市值與損益統計。各券商帳戶（`BrokerAccount`）尚未建立關聯的現金帳本（Cash Ledger），無法記錄定時定額「入金 (Deposit)」、「出金 (Withdrawal)」與「換匯 (FX Conversion)」，整體資產總值僅能反映證券市值，無法呈現完整的投資組合資產淨值 (Net Asset Value, NAV = 證券總市值 + 閒置現金餘額)。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：投資人在資金控管上常需要掌握「現金水位比例」與「閒置美金餘額」。若無現金帳本，每次買賣股票時現金不會自動扣款或入帳，難以精確追蹤現金流向與帳戶總報酬率（含現金）。
* **暫緩理由**：目前證券交易記帳核心運作極為順暢，現金帳本涉及帳戶餘額連動與現金流校驗，先列入技術債儲備，後續收到通知後再行整合。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **建立現金交易模型 (`CashEntry`)**：
   ```typescript
   export type CashEntryType = 'DEPOSIT' | 'WITHDRAWAL' | 'FX_CONVERSION' | 'INTEREST' | 'OTHER';

   export interface CashTransaction {
     id: string;
     accountId: string;          // 券商帳戶 ID
     currency: 'TWD' | 'USD';
     type: CashEntryType;
     amount: number;
     date: string;               // YYYY-MM-DD
     fxRateToTwd?: number;       // 若為換匯或美金入金時之匯率
     note?: string;
     createdAt: number;
   }
   ```
2. **現金自動扣繳/入帳聯動開關**：新增交易或領取股利時，可選擇「是否連動扣除/增加對應帳戶現金餘額」。
3. **頂部總覽卡片升級為 NAV 視圖**：總資產淨值 = 股票毛市值 + 現金餘額總計（以即時匯率折算 TWD）。
4. **新增「現金帳本」專屬管理面板**：可隨時檢視各帳戶入出金流水與即時現金水位。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者主動指示啟動「現金帳本與資產淨值系統」。
2. 使用者需要管理多幣別閒置資金與精確入出金水庫。
