# ADR-0030: 券商級在途資金 (Funds in Transit) 與三層可用性購買力會計模型

- **狀態**：`ACCEPTED`
- **日期**：2026-08-27
- **對應 PRD**：[SPEC-0030: docs/specs/0030-in-transit-funds-and-buying-power-ledger.md](../specs/0030-in-transit-funds-and-buying-power-ledger.md)

## 上下文 (Context)
在台美股跨市場投資環境中，股票交易與股利款項具有法定的交割週期：
- 台股市場：T+2 交割（遇國定假日/週末順延，且為整數 TWD 幣別）。
- 美股市場：T+1 交割（美股結算規則，保留 2 位小數 USD 幣別）。
- 現金股息/減資款項：依發放日（Payment Date）而非除息日（Ex-Dividend Date）入帳。

傳統個人記帳軟體多直接將「成交金額」計入可用現金餘額，導致以下嚴重痛點：
1. **可用資金虛胖**：台股賣出後立即在 UI 顯示現金增加，誤導投資人以為可提領出金，引發帳戶透支風險。
2. **購買力失真**：個人無法精準預知「今日可下單買進金額 (Buying Power)」與「T+2 需存入多少交割款 (Pending Payables)」，增加違約交割之心理負擔。
3. **混合流轉斷層**：既無法全自動依市場日曆推算，亦無法支援單筆手動核銷或自訂交割日覆寫。

## 決策 (Decision)

### 1. 三層可用性會計模型 (Tri-State Availability Accounting Model)
我們定義三層清晰隔離的資金狀態指標：
1. **實質可用現金 (Settled Cash)**：
   $$\text{Settled Cash} = \sum_{\text{settlementStatus} = \text{'SETTLED'} \land \text{effectiveDate} \le \text{today}} \text{amount}$$
   代表帳戶內已實質完成結算入帳的款項，可隨時申請出金或提領回實體銀行。
2. **在途資金 (Funds in Transit / Pending Settlement)**：
   - **在途應收款 (Pending Receivables)**：股票賣出、未到帳股息、減資退款等待入帳款項。
   - **在途應付款 (Pending Payables)**：股票買進等待扣款項。
   - **預估交割後餘額 (Projected Balance)**：$\text{Settled Cash} + \text{Pending Receivables} - \text{Pending Payables}$。
3. **即時交易購買力 (Trading Buying Power)**：
   $$\text{Trading Buying Power} = \text{Settled Cash} + \text{Pending Stock Sells} - \text{Pending Stock Buys}$$
   嚴格遵循券商級風控原則：
   - **股票賣出款項**：成交當下立即釋放購買力（允許同帳戶當日再下單）。
   - **股票買進款項**：成交當下立即鎖定並扣除購買力。
   - **非股票交易類在途款**（如未發放股息、電匯在途）：**不提前計入交易購買力**，直至交割日或手動核銷到位。

### 2. 混合雙軌生命週期管理 (Hybrid Lifecycle)
- **自動推算**：依台股 T+2 / 美股 T+1 避開週末推算預計交割日；股利預設依發放日入帳。若預計交割日已過，系統判定為已交割。
- **手動覆寫與一鍵核銷**：
  - 流水與彈窗支援自訂 `settlementDate` 與切換 `settlementStatus`。
  - 在途時序排程面板提供 `[✅ 一鍵核銷]` 快捷操作。

### 3. 多幣別與風控精準度規範
- 台幣 (TWD)：採用整數四捨五入/無條件捨去 (`Math.round` / `Math.floor`)。
- 美金 (USD)：採用銀行家捨入法 `bankersRound(val, 2)`，徹底杜絕浮點數精度外洩。

## 後果與影響 (Consequences)

### 正面效益 (Positive)
1. **零違約風險**：投資人隨時清楚掌握今日實質可出金額度與各帳戶即將交割扣款時序。
2. **券商級下單體驗**：賣出立即釋放購買力、買進立即鎖定，與真實券商帳戶完全一致。
3. **時序排程清晰可視**：以今日、明日、本週、未來排程分組呈現未來現金流預測。

### 負面代價與限制 (Trade-offs)
1. 涉及市場假日需要交割日曆引擎維護。
2. 計算複雜度從單純求和升級為三層分流運算，需配合 `useMemo` 與純函式優化。
