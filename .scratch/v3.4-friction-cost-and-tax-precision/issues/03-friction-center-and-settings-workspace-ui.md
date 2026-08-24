# Ticket #3: [UI/UX] 摩擦分析中心彈窗與設定工作台看板升級

- **狀態**: Completed
- **規格書**: [SPEC-0017](../../../docs/specs/0017-friction-cost-and-tax-precision-engine.md)
- **架構決策**: [ADR-0017](../../../docs/adr/0017-friction-cost-and-tax-precision-engine.md)

## 任務清單
- [x] 在 `src/components/FrictionCenterModal.tsx` 中更新指標卡片備註（標註「基準：法定牌告 20 元低消 + 0.1425%」與「債券 ETF 0% 免稅」）。
- [x] 在 `src/components/FrictionCenterModal.tsx` 中加入「美股現金股利 30% 預扣稅」獨立統計欄位。
- [x] 在 `src/components/FrictionCenterModal.tsx` 中擴充「摩擦成本優化與法規指南」，納入台股低消陷阱、證交稅分層與美股摩擦全貌。
- [x] 在 `src/components/SettingsWorkspace.tsx` 中更新摩擦看板卡片副標題說明。
- [x] 執行全量 `npm test` (100% 通過) 與 `npm run build` 驗證。
