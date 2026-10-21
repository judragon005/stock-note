# 07-e2e-verification-and-debt-resolution

## Description
執行台股核心標的（0050、2330）與美股核心標的（NVDA、AAPL）全頻譜端到端 E2E 驗收；確保 `npm test` 100% 綠燈與 `npm run build` TypeScript 0 錯誤；將技術債 0042 與 0044 標記為 RESOLVED，同步更新 `CONTEXT.md` 與交接手冊。

## Target Files
- `src/components/aiForceDashboard/AiForceRealDataE2E.test.ts`
- `docs/debts/0042-ai-force-tdcc-and-monthly-revenue-card-visualizations.md`
- `docs/debts/0044-ai-force-war-room-feature-gaps-and-quant-enhancements.md`
- `docs/debts/README.md`
- `CONTEXT.md`

## Acceptance Criteria
- [x] 執行端到端 E2E 測試，驗證 0050 (ETF 自適應)、2330 (TDCC/營收雙開)、NVDA (美股微觀動能與 0 假資料)。
- [x] 全量 `npm test` 100% 通過，`npm run build` 0 錯誤。
- [x] 將技術債 0042 與 0044 狀態更新為 `RESOLVED`。
- [x] 更新 `CONTEXT.md` 與交接手冊，文檔零脫鉤。

## Status
- [x] completed
