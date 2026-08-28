# 任務票券 #02: 利息依券商聚合與預扣稅分離聚合引擎及單元測試

- **父層主票券**: [issue-0046.md](issue-0046.md)
- **狀態**: `OPEN`
- **分流標籤**: `ready-for-agent`
- **目標檔案**:
  - `src/engine/cashLedgerEngine.ts`
  - `src/engine/cashLedgerEngine.test.ts`

---

## 🎯 任務目標
1. 擴充/重構 `aggregateInterestIncomeDetails`：
   - 支援依「券商帳戶 (Broker Account) + 幣別」歸一化聚合多筆現金利息記錄，產生清晰單一膠囊資訊（例如：`嘉信理財-現金利息`）。
2. 新增 `aggregateWithholdingTaxDetails` 或在利息摘要中提供利息預扣稅統計：
   - 提取流水帳中所有利息預扣稅項目（類別為 TAX 且備註為利息預扣），分別計算 USD 與 TWD 預扣金額。
3. 編寫完整單元測試，驗證跨多月份利息正確聚合為單筆，且利息預扣稅精確分拆。
