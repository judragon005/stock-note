# 任務票券 03：冪等式實績自動校正模組 autoReconcileSchwabRecords

- **狀態**：✅ DONE
- **優先級**：P0
- **關聯 PRD**：[PRD #0047](../../../docs/specs/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend-spec.md)
- **關聯 ADR**：[ADR 0047](../../../docs/adr/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend.md)

## 任務背景與描述
在 `src/utils/storage.ts` 中實作 `autoReconcileSchwabRecords`，冪等自動校正 SGOV 買賣金額與 VT 股息發放日/金額，消除累積 -$1.79 的手動出金校正流水。

## 驗收條件 (Acceptance Criteria)
1. 自動校正 SGOV 買入為 `$8,933.82`，賣出為 `$8,956.07`。
2. 自動校正 VT 兩筆股息為 `$26.18` (稅 $7.85) 與 `$45.09` (稅 $13.53)。
3. 自動清理 `初始本金/交割戶真實餘額校正` 手動出金流水。
4. 現金餘額精確等於 `$224.79 USD`。
