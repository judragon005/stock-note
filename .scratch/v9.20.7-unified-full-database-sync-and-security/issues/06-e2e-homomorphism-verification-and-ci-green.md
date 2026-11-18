# 06 — 端到端同態驗證、回滾測試與 CI 驗證

**What to build:** 執行端到端完整測試：產生 V2 封包、在乾淨環境模擬匯入，驗證交易 696 筆、現金 729 筆、股利 2 筆、不限用途借貸合約、交割帳戶完全同態，並執行全量測試 `npm test` 與建置 `npm run build`。

**Blocked by:** 05-import-guardrail-snapshot-and-key-telemetry

**Status:** completed

- [x] 端到端測試：匯出 -> 匯入驗證 696 筆交易、729 筆現金帳、2 筆待發放股利同態
- [x] 全量單元測試 `npm test` 綠燈通過 (2288/2288 tests passed)
- [x] 生產環境打包 `npm run build` 綠燈通過
- [x] 執行分支提交與 PR 流程，關聯 Issue #582
