# 任務票券 01：利息備註智能正規化正則升級與全形符號支援

- **狀態**：✅ DONE
- **優先級**：P0
- **關聯 PRD**：[PRD #0047](../../../docs/specs/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend-spec.md)
- **關聯 ADR**：[ADR 0047](../../../docs/adr/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend.md)

## 任務背景與描述
真實券商備註包含全形逗號 `，`、半形逗號 `,`、冒號 `：`、破折號 `-`、`~`、`–`、`—` 與明細字樣。升級 `normalizeInterestName` 確保跨月份同券商利息能 100% 合併為單一膠囊。

## 驗收條件 (Acceptance Criteria)
1. `Schwab 嘉信理財-現金利息，利息 0.27...` 能正確歸一化為 `Schwab 嘉信理財-現金利息`。
2. `Schwab 嘉信理財-現金利息 (10/30–11/25) · 利息 0.27...` 正確歸一化為 `Schwab 嘉信理財-現金利息`。
3. 單元測試覆蓋多種符號與日期格式。
