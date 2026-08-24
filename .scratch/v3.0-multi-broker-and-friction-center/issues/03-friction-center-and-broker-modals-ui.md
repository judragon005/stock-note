# Ticket #3: [UI/UX] 頂部帳戶篩選器、券商管理面板與交易摩擦成本分析儀彈窗

- **狀態**: Completed
- **規格書**: [SPEC-0013](../../../docs/specs/0013-multi-broker-account-and-friction-cost-engine.md)
- **架構決策**: [ADR-0013](../../../docs/adr/0013-multi-broker-account-and-friction-cost-engine.md)

## 任務清單
- [ ] 在 `src/components/Header.tsx` 整合「帳戶篩選器」下拉選單與「📊 摩擦成本分析 / ⚙️ 券商管理」入口按鈕。
- [ ] 實作「券商帳戶管理彈窗 (BrokerAccountsModal)」，支援新增、編輯、刪除帳戶，並提供台灣/海外主流券商一鍵套用模板。
- [ ] 實作「交易摩擦成本深度分析儀 (FrictionCenterModal)」，呈現 4 大核心摩擦指標（已付手續費、已付稅金、折讓省下金額、未來出清成本）與佔比視覺化。
- [ ] 升級 `TradeModal.tsx`，在新增交易時提供帳戶選擇下拉，並依選定帳戶自動試算與帶入建議手續費。
- [ ] 在 `App.tsx` 串接完整多帳戶與摩擦成本狀態流，執行端到端瀏覽器驗證與 `npm test` 綠燈檢查。
