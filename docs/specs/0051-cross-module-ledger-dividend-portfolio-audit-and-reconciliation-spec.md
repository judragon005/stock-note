# 需求規格說明書 (PRD #0051)：臺股歷史帳本、現金借貸、股利日誌、庫存與全域 XIRR/NAV 跨模組全量交叉勾稽與架構重構

## 1. 執行摘要 (Executive Summary)

本規格書為解決四大核心模組（**臺股歷史交易帳本**、**現金流與借貸質押**、**除權息日誌與應收股利**、**投資組合庫存與全域 XIRR/NAV**）在跨期狀態、交易交割、借貸槓桿與報酬率求解中的 **16 項邊界矛盾與勾稽斷層**。

本 PRD 定義跨模組數據勾稽之「單一真實來源 (SSOT) 數學模型」與邊界防禦架構：
1. **P0 級核心修復**：
   - 修正融資買進 (`MARGIN_BUY`) 現金扣除自備款 40% 機制（拒絕全額 100% 扣除），融資 60% 自動轉入借貸負債。
   - 移除除息在籍股數之當前庫存 Fallback 漏洞，嚴格以除息日前一日在籍股數判定資格（杜絕除息後買進者誤領股利）。
2. **P1 級全域一致性勾稽**：
   - 建立時序連續之總淨值公式：$\text{NAV} = \text{在席股票市值} + \text{已交割實質現金} + \text{在途應收款} + \text{待入帳應收股利} - \text{在途應付款} - \text{借貸質押負債}$，徹底消除 $T\sim T+2$ 跨期虛胖與除息日淨值斷層 (NAV Cliff)。
   - 升級 XIRR 引擎：當帳本無顯式 `DEPOSIT` 紀錄時，智能降級採計歷史買賣實質投入款，杜絕全組合 XIRR 歸零或求解崩潰。
   - 納入臺股現金配息 10 元跨行匯費內扣選項，確保現金帳本與銀行存摺 100% 吻合。
3. **P2 級風控與邊界防禦**：
   - 建立質押擔保品在庫動態校驗與賣出連動告警。
   - 建立現金減資每股成本歸零保底機制，防禦未實現損益率符號反轉。

---

## 2. 背景與痛點剖析 (Problem Statements)

### 2.1 模組一痛點：交易 ➔ 現金交割斷層
* **痛點 1.1 ($T\sim T+2$ 淨值重複計入)**：買進股票在 $T$ 日已計入庫存市值，但現金在 $T+2$ 才扣除。若總淨值未扣除「在途應付交割款」，在 $T$ 至 $T+1$ 期間總資產會產生假性膨脹。
* **痛點 1.2 (券商次月退佣落差)**：券商於 $T+2$ 扣全額手續費、次月 10~20 日退佣，若系統直接在交易當日扣除折讓後金額，交易日交割款會與銀行對帳單不一致。
* **痛點 1.3 (手動出金與自動交割雙重扣款)**：使用者手動登記出金與系統自動生成的 `STOCK_BUY` 疊加扣除，導致交割戶負餘額。
* **痛點 1.4 (未指定帳戶 Fallback 孤島)**：歷史交易未指定 `accountId` 時 fallback 到預設帳戶，導致預設帳戶巨額負數、真實銀行戶虛高。

### 2.2 模組二痛點：除權息 ➔ 應收股利與淨值斷層
* **痛點 2.1 (除息後買進誤判除息資格 - P0 漏洞)**：`receivableDividendEngine.ts` 在除息日前持股為 0 時，fallback 取用當前庫存，造成除息日後買進者被誤算享有該次股利。
* **痛點 2.2 (除息日淨值懸崖 NAV Cliff)**：除息日股價跳空扣除，但在發放日前現金尚未入帳，NAV 若未包含「待入帳應收股利」，每年除息旺季淨值曲線會劇烈向下跳空。
* **痛點 2.3 (缺少 10 元跨行匯費內扣)**：除 2.11% 二代健保外，非保管行會扣 10 元匯費，導致實收金額與銀行帳戶永遠差 10 元。
* **痛點 2.4 (配股與配息分流規範不明確)**：股票股利（增加股數、稀釋每股平均成本）與現金股利（增加現金）在帳本與自動掃描間缺乏統一口徑。

### 2.3 模組三痛點：借貸質押 ➔ 現金流與維持率斷層
* **痛點 3.1 (融資買進全額誤扣 - P0 漏洞)**：融資買進只需 40% 自備款，現行系統將其視為一般現股買進扣除 100% 總價款，造成可用現金嚴重多扣。
* **痛點 3.2 (質押利息按日計息 vs 每月實扣脫鉤)**：系統即時計算應計利息，但缺乏每月定期扣息流水提醒或生成，交割戶餘額隨時間推移持續高於真實銀行存款。
* **痛點 3.3 (質押擔保品賣出脫鉤)**：質押中的股票在帳本中被賣出後，質押合約未同步核銷，導致壓力測試維持率以虛擬持股計算（假安全指標）。
* **痛點 3.4 (借貸撥款與手動入金重複記帳)**：撥款入帳與手動入金雙重疊加。

### 2.4 模組四痛點：庫存 ➔ XIRR 與量化淨值斷層
* **痛點 4.1 (全組合 XIRR 在無手動入金時失效)**：當存在現金帳本但無 `DEPOSIT` 紀錄時，外部現金流為空，導致全組合 XIRR 無法求解。
* **痛點 4.2 (現金減資導致負成本與損益率反轉)**：原始成本極低之股票減資退款後，若每股成本變成負數，未實現損益率公式除以負數會產生正負號反轉。
* **痛點 4.3 (FIFO 批次庫存 vs 加權平均成本口徑差異)**：部分賣出時，FIFO 剩餘批次成本與加權平均每股成本不同，需在 UI 明確標籤對齊。
* **痛點 4.4 (跨幣別歷史匯率與即時匯率跳空)**。

---

## 3. 架構設計與全域勾稽數學模型 (Architecture & Mathematical Model)

### 3.1 全域資產與總淨值 (NAV) 統一定義 (SSOT)

$$
\begin{aligned}
\text{Total Assets} &= \text{Stock Market Value (TW + US converted)} \\
&+ \text{Settled Cash (TW + US converted)} \\
&+ \text{Pending Receivables (In-transit Stock Sells / Wire Transfers)} \\
&+ \text{Receivable Dividends (Smoothed Compensation between } Ex\text{-}Date \text{ and } Pay\text{-}Date) \\
\text{Total Liabilities} &= \text{Pending Payables (In-transit Stock Buys)} \\
&+ \text{Outstanding Loan Principals (Pledges + Margin Debts)} \\
\mathbf{Portfolio\text{ }NAV} &= \mathbf{Total\text{ }Assets - Total\text{ }Liabilities}
\end{aligned}
$$

```mermaid
flowchart TD
    subgraph 資產端 (Assets)
        A1[在庫股票牌面市值]
        A2[實質已交割可用現金]
        A3[在途賣出應收款]
        A4[待入帳應收股利 Ex-Pay 期間]
    end

    subgraph 負債端 (Liabilities)
        L1[在途買進應付款]
        L2[質押借款未還本金]
        L3[融資買進 60% 券商借款]
    end

    A1 --> NAV[全域總淨值 Portfolio NAV]
    A2 --> NAV
    A3 --> NAV
    A4 --> NAV

    L1 -.->|扣除| NAV
    L2 -.->|扣除| NAV
    L3 -.->|扣除| NAV
```

### 3.2 融資買進 (Margin Buy) 資金流與負債拆解

當交易型別為 `MARGIN_BUY` 時：
* **自備款扣除（現金流水）**：
  $$\text{Cash Outflow} = -(\text{Shares} \times \text{Price} \times 0.4 + \text{Fee})$$
* **融資借款入帳（借貸負債）**：
  $$\text{Margin Debt Inflow} = \text{Shares} \times \text{Price} \times 0.6$$
* **維持率計算**：將該持股及融資金額納入維持率與利息計算模型。

### 3.3 除息資格在籍判定與 10 元匯費模型

* **嚴格在籍股數判定**：
  $$\text{sharesOnExDate} = \text{getHoldingsAsOfDate}(trades, \text{exDate}-1, symbol)$$
  * 若 $\text{sharesOnExDate} \le 0$，**嚴禁** fallback 取用當前庫存，該事件直接排除。
* **實收股息精確計算**：
  $$\text{Gross} = \text{sharesOnExDate} \times \text{cashDividendPerShare}$$
  $$\text{NHI Tax} = (\text{Gross} \ge 20000) \text{ ? } \lfloor\text{Gross} \times 0.0211\rfloor : 0$$
  $$\text{Wire Fee} = (\text{hasInterbankFee} \text{ ? } 10 : 0)$$
  $$\text{Net Dividend} = \max(0, \text{Gross} - \text{NHI Tax} - \text{Wire Fee})$$

### 3.4 XIRR 自適應多模式探針 (Adaptive XIRR Solver)

```mermaid
flowchart TD
    Start[啟動全組合 XIRR 求解] --> CheckDeposit{檢查是否存在顯式 DEPOSIT/WITHDRAWAL 金流?}
    CheckDeposit -->|是 (存在外部出入金)| ModeA[Mode A: 銀行出入金加權模型]
    CheckDeposit -->|否 (純股票交易記錄)| ModeB[Mode B: 歷史交易實質投入成本模型]
    
    ModeA --> AddTerminal[加入期末 NAV 終值]
    ModeB --> AddTerminal
    AddTerminal --> Solver[Newton-Raphson 結合 Bisection 數值求解]
    Solver --> Output[產出年化 XIRR 與現金流透視診斷]
```

---

## 4. 驗收標準 (Acceptance Criteria)

### 4.1 P0 級關鍵修復驗收
- [ ] **AC-P0-1 (融資買進 40% 自備款精確扣款)**：當記錄 `MARGIN_BUY` 買進 100 萬股票時，現金帳本僅扣除 40 萬自備款及手續費，總資產與負債同步增加 60 萬融資借款，總淨值維持守恆。
- [ ] **AC-P0-2 (除息日後買進零配息)**：在除息日之後買進的股票，在「除權息待入帳行事曆」與應收股利計算中**絕不出現**該次股息。

### 4.2 P1 級跨模組一致性驗收
- [ ] **AC-P1-1 (全週期 NAV 零懸崖)**：在除息日當日及 $T\sim T+2$ 交易交割期間，總淨值 NAV 曲線平滑連續，無鋸齒狀跳空或假性暴跌。
- [ ] **AC-P1-2 (無手動入金時 XIRR 正常求解)**：在未手動登記 `DEPOSIT` 的乾淨交易環境下，全組合 XIRR 能夠自動切換為 Mode B 實質交易成本模型，精準算出年化報酬率。
- [ ] **AC-P1-3 (配息 10 元匯費扣除)**：支援勾選或預設扣除 10 元跨行匯費，實收現金與銀行帳本完美 100% 吻合。
- [ ] **AC-P1-4 (質押擔保品賣出即時警示)**：當使用者在交易帳本賣出已設質之股票，系統自動更新質押擔保品在庫數，若低於質押數則跳出警示並正確修正壓力維持率。

### 4.3 P2 級邊界與防禦驗收
- [ ] **AC-P2-1 (現金減資負成本保底)**：經現金減資退還股款後，若累計退款超過原成本，每股成本保底為 0，未實現損益率正常顯示正報酬，絕不發生正負號顛倒。
- [ ] **AC-P2-2 (雙軌會計口徑清晰展示)**：庫存列表清晰標註加權平均成本與 FIFO 批次成本切換狀態。

---

## 5. 模組影響範圍與修改檔案

1. [`src/engine/receivableDividendEngine.ts`](file:///d:/APP/股票紀錄/src/engine/receivableDividendEngine.ts)：移除 Fallback 漏洞、加入 10 元匯費計算。
2. [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts)：融資買進 (MARGIN_BUY) 40% 自備款拆解、完善 $T+2$ 與應收股息全域 NAV 勾稽。
3. [`src/engine/xirrCalculator.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.ts)：自適應雙模式現金流探針 (Mode A/B)。
4. [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts)：現金減資成本 0 元保底防禦、未實現損益除零防禦。
5. [`src/engine/marginStressEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marginStressEngine.ts)：質押擔保品與在庫持股動態對齊與警示。
6. [`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts)：擴充 TradeType 支援融資/融券標記與匯費設定。
