# Issue: 升級摩擦成本精準計算引擎與台美股稅制校驗機制

- **狀態**：TODO
- **標籤**：`ready-for-agent`, `enhancement`
- **關聯 PRD**：[SPEC-0017](../../../docs/specs/0017-friction-cost-and-tax-precision-engine.md)
- **關聯 ADR**：[ADR-0017](../../../docs/adr/0017-friction-cost-and-tax-precision-engine.md)

## 需求描述
1. 台股手續費折讓省下金額以法定牌告標準 `max(20, floor(成交金額 * 0.001425))` 為基準計算差額。
2. 台股債券 ETF（代碼結尾 `B`）預估證交稅修正為 0%（免稅）。
3. 美股現金股利自動累計 30% 預扣稅，並支援美股賣出 SEC 規費試算。
4. 交易紀錄支援當沖 0.15% 稅率性質標記與手動覆寫。
5. 摩擦分析中心 UI 同步展示精準數據與折讓/稅率說明。
