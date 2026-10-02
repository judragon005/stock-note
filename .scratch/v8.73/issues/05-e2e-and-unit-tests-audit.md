# Ticket 05: 撰寫全流程單元測試與 E2E 驗收測試，確保致茂 (2360) 數據全域一致

## 目標
1. 撰寫 `sync-status` 中介層 API 單元測試。
2. 撰寫 `aiForceDashboardEngine` 縫合與防拼裝單元測試。
3. 撰寫 `AiForceDashboardView` E2E 整合測試，驗證 2360 最新交易日與主 K 線圖最後一根同為 2026-10-02。
4. 確保全量測試 100% 通過與 `npm run build` 零錯誤。
