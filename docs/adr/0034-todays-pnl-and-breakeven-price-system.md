# ADR #0034: 交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) 體系

- **狀態**：`ACCEPTED`
- **日期**：2026-08-27
- **決策者**：Core Engineering & Quant Architecture Team
- **對應規格**：[docs/specs/0034-todays-pnl-and-breakeven-price-metrics.md](../specs/0034-todays-pnl-and-breakeven-price-metrics.md)
- **對應技術債**：[#0015 交易員當日損益與保本價](../debts/0015-trader-today-pnl-and-breakeven-price-metrics.md) · [#0013 現金減資超額退款轉列利得與碎股精度](../debts/0013-capital-reduction-excess-cash-accounting-and-precision.md)

---

## 1. 背景與問題 (Context)

系統在先前版本已完整建立累計未實現損益、已實現損益、現金帳本與 XIRR 不定期年化複利計算體系，但對於日常盯盤與實戰交易決策仍存在以下痛點：
1. **看盤缺乏盤中動態盈虧感**：使用者無法即時得知當天市場波動造成的整體與個股實體賺賠金額（Today's PnL）。
2. **出場解套保本價需手動計算**：使用者準備賣出保本時，僅依賴平均買進成本，容易忽略賣出時被扣除的證券交易稅（現股 0.3% / 股票 ETF 0.1% / 債券 0%）、券商手續費折讓率與 20 元最低低消，造成「假保本、真虧損」。
3. **減資退款邊界吞噬與碎股精度**：長期持股現金減資退款大於持倉成本時，成本被截斷歸零但超額退款未計入已實現損益。

---

## 2. 決策與架構設計 (Decision)

### 2.1 精確損益平衡保本價求解器 (`calculateBreakevenPrice`)
- 依據市場 (`TW` / `US`)、標的類別（現股 / 股票 ETF / 債券 ETF）與券商帳戶折讓規則，建立連續初猜值後進行離散整數捨去 (Floor) 階梯閉環驗證。
- 保證以該單價賣出後的淨變現金額（扣稅扣費）$100\% \ge \text{totalCostBasis}$。

### 2.2 盤中當日損益聚合 (Today's PnL Aggregation)
- 個股層級：$\text{todaysPnL} = \text{shares} \times (\text{currentPrice} - \text{previousClose})$。
- 整戶層級：彙整台股市場、美股市場與全市場跨幣別即時匯率折算之當日波動金額與百分比。

### 2.3 會計引擎底層加固
- 現金減資超額退款自動轉列 `realizedPnL`。
- 美股碎股全面封裝 `roundFractionalShares` 萬分位強制精準收斂。

---

## 3. 結果與影響 (Consequences)

- **正面效益**：
  - 盤中盯盤體驗大幅躍升，總覽卡片與持股列表清晰呈現今日盈虧金額。
  - 持股清單新增保本價 Badge，出場決策零心算、零摩擦失真。
  - 底層會計引擎與碎股精度更加防禦穩固。
- **風險與防禦**：
  - 無昨收價或新上市個股平滑降級，不影響累計損益與系統穩定性。
