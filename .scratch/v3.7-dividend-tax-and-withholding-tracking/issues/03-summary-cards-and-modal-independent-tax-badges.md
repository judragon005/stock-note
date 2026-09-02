# Ticket #3: [UI/Portfolio] 投資組合股息總覽卡片明細標籤與摩擦分析儀雙欄獨立指標

- **狀態**: Completed
- **分流標籤**: `ready-for-agent`
- **規格書**: [SPEC-0020](../../../docs/specs/0020-dividend-tax-and-withholding-tracking.md)
- **架構決策**: [ADR-0020](../../../docs/adr/0020-dividend-tax-and-withholding-tracking.md)

## 任務清單
- [x] 在 `src/components/SummaryCards.tsx` 的「累積已領取現金配息」卡片底部，新增二代健保與美股 30% 預扣稅之扣繳明細標籤。
- [x] 在 `src/components/FrictionCenterModal.tsx` 中解除台美股互斥條件，改為獨立並列雙欄指標：
  - 指標卡片 1：台股二代健保補充保費 (2.11%) 累計已繳金額。
  - 指標卡片 2：美股 30% 股息預扣稅累計扣除金額 (USD / NT$)。
- [x] 確保無扣繳記錄時能優雅 fallback，版面高度自適應。
