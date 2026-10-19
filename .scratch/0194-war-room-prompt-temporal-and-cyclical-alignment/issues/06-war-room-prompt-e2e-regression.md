# 06 — 戰情室外聯提示詞端到端整合與威剛實例回歸驗證 (War Room Prompt E2E & Regression)

**Parent:** #288

**What to build:**
以威剛（3260）真實報表數據進行全量外聯提示詞生成端到端測試，驗證 5 項風控防禦全部正確渲染；同時執行 `npm test` 與 `npm run build` 確保專案所有單元測試 100% 綠燈、TypeScript 零錯誤。

**Blocked by:** 01, 02, 03, 04, 05

**Status:** completed

## Acceptance Criteria
- [x] 威剛（3260）報表產生之外聯提示詞中：
  - `<is_cyclical_stock is_cyclical="true">` 正確輸出。
  - `<volume_shares>` 大於 0。
  - 包含 `【時態因果隔離】` 與 `【待同步宣告】`。
  - `<stop_loss_conservative_status>` 依據持倉現價正確標記 `is_triggered`。
  - 包含 `<sbl_balance>` 借券賣出維度。
- [x] 全量單元測試 `npm test` 100% 綠燈通過。
- [x] TypeScript 打包 `npm run build` 0 錯誤通過。
