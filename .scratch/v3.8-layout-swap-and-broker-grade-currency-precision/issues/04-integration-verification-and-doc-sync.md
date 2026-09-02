# Ticket #4: [QA/Docs] 全案整合迴歸驗證、型別檢查與文件庫同步

- **狀態**: Completed
- **分流標籤**: `ready-for-agent`
- **規格書**: [SPEC-0021](../../../docs/specs/0021-layout-swap-and-broker-grade-currency-precision.md)
- **架構決策**: [ADR-0021](../../../docs/adr/0021-layout-swap-and-broker-grade-currency-precision.md)

## 任務清單
- [x] 執行 `npm test`：確保 7 個測試套件、115 項單元測試 100% 綠燈通過。
- [x] 執行 `npm run build`：確保 TypeScript 0 錯誤、Vite Production Bundle 打包成功。
- [x] 同步更新 `CHANGELOG.md`（新增 V3.8 里程碑條目）。
- [x] 同步更新 `CONTEXT.md`（補強 Broker-Grade Precision 術語定義）。
- [x] 同步建立 `SPEC-0021` 與 `ADR-0021`。
