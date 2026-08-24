# 產品需求規格書 (PRD)：V3.5 歷史帳本稅費智慧拆分修復、雙幣別換算與除權息摩擦成本引擎

- **文件編號**：`SPEC-0018`
- **版本**：`V3.5`
- **狀態**：`APPROVED`
- **作者**：Antigravity Agent
- **日期**：2026-08-24
- **追蹤 ADR**：[ADR-0018: 歷史帳本稅費智慧拆分修復與雙幣別摩擦計算架構](../adr/0018-tax-fee-auto-repair-and-currency-engine.md)

---

## 1. 背景與問題陳述 (Background & Problem Statement)

從實務歷史帳本（如自 Ghostfolio 或舊版 CSV 匯入的 587 筆交易）中發現嚴重的結構性資料偏差與計算盲區：
1. **「稅費合一」導致證交稅為 0、手續費虛高且折讓漏計**：
   - 外部 CSV 僅有單一 `fee` 欄位，賣出交易時的 0.3% 證交稅被全數誤塞入 `trade.fee`，導致 `trade.tax` 全為 0（累計已繳證交稅顯示為 NT$ 0）。
   - 由於 `trade.fee` 被 0.3% 稅額灌水，大於牌告標準手續費（0.1425%），折讓判斷式 `standardFee > fee` 全數失效，導致 587 筆交易的券商折讓省下金額幾乎全數漏計。
2. **雙幣別混加漏洞 (Currency Mismatch)**：
   - 美股交易手續費（USD）直接與台股手續費（TWD）數值加總，未乘上 USD/TWD 即時匯率，造成美股手續費縮水 31.82 倍。
3. **除權息摩擦成本漏計 (Dividend Frictions)**：
   - 台股現金股利單筆 $\ge 20,000$ 元之 2.11% 二代健保補充保費與美股現金股利 30% 預扣稅未納入歷史摩擦成本與在倉估算。

---

## 2. 核心功能規格 (Functional Specifications)

### 2.1 歷史帳本「稅費智慧自動拆分修復」演算法
提供純函式 `repairLedgerTaxAndFee(trades: TradeRecord[]): { repairedTrades: TradeRecord[], fixedCount: number }`：
- **觸發條件**：針對 `trade.type === 'SELL'`、`trade.market === 'TW'` 且 `trade.tax === 0` 且 `trade.fee > 0` 的紀錄。
- **拆分公式**：
  $$\text{成交金額} = \text{trade.shares} \times \text{trade.price}$$
  $$\text{推導證交稅 estimatedTax} = \text{calculateTaiwanTax}(\text{trade.price}, \text{trade.shares}, \text{isETF}, \text{isDayTrading}, \text{isBondETF})$$
  $$\text{當 trade.fee} \ge \text{estimatedTax} \implies \text{newTax} = \text{estimatedTax}, \quad \text{newFee} = \max(1, \text{trade.fee} - \text{estimatedTax})$$
- 保持 `netProceeds` 淨交割金額（$\text{成交額} - \text{fee} - \text{tax}$）與已實現損益 100% 不變，精準還原證交稅與手續費真貌。

### 2.2 摩擦計算引擎雙幣別匯率換算 (Multi-Currency Support)
在 `calculateFrictionCostSummary` 中傳入 `usdRate: number = 32.0`：
- 美股買進手續費 `t.fee * usdRate` 換算為 TWD。
- 美股賣出手續費 `t.fee * usdRate` 與規費換算為 TWD。
- 美股現金股利 30% 預扣稅換算為 TWD。
- 支援摩擦看板雙幣別獨立或合併折算展示。

### 2.3 除權息摩擦成本 (Dividend Friction Engine)
- **台股單筆現金股利 $\ge 20,000$ 元**：自動試算 2.11% 二代健保補充保費累計。
- **美股現金股利**：累計 30% 預扣稅並折算為 TWD。

---

## 3. UI 與修復工具規格 (UI Integration)

1. **歷史交易帳本頂部「智慧修復提示欄」**：
   - 當檢測到帳本中存在 `SELL` 且 `tax === 0` 且 `fee > 0` 的異常資料時，顯示橘色發光橫幅：
     `⚠️ 偵測到 X 筆歷史賣出紀錄稅費未拆分（導致已繳證交稅為 0 與折讓漏計），點擊 [🛠️ 一鍵智慧拆分修復]`。
2. **手動一鍵修復按鈕**：
   - 點擊後立即執行拆分並持久化至 LocalStorage，看板與折讓即時恢復真實數值。
