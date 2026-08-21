# Ticket #65: [UI] Header 匯率徽章改為純自動化展示 (Tooltip 狀態與刷新動畫)

- **狀態**: Ready for Agent
- **父 Issue**: #62
- **PRD**: [PRD 0006](../../docs/specs/0006-auto-usd-twd-exchange-rate.md)
- **ADR**: [ADR 0006](../../docs/adr/0006-auto-usd-twd-exchange-rate-and-fallback.md)

## 任務清單
- [ ] 移除 `src/components/Header.tsx` 中手動 input 編輯與提交邏輯。
- [ ] 改造 USD/TWD 徽章為自動狀態展示 (`USD/TWD: 32.45`)。
- [ ] 支援 Tooltip 顯示匯率來源狀態（即時/延遲/前日收盤/快取備援）與時間戳記。
- [ ] 支援刷新時轉動微動畫。
