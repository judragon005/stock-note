# 任務 01: TWSE 全市場覆蓋健全檢查守門員與 V4 快取升級

- **狀態**: `completed`
- **優先級**: P0
- **完成說明**: 已升級快取至 V4，加入 2330 上市哨兵健康檢查防殘缺快取，並支援 forceRefresh 強制重整。
- **目標**:
  1. 將 `smartMoneyFetcher.ts` 快取前綴升級為 `TWSE_TPEX_CHIPS_V4_`。
  2. 加入全市場覆蓋健全檢查：快取資料必須同時包含關鍵上市標的（如 `'2330'`），若缺少則判定快取殘缺無效，強制重新拉取 TWSE 與 TPEx。
  3. `fetchTwseInstitutionalReport` 增加 `forceRefresh?: boolean` 參數，點擊「🔄 同步盤後籌碼」可跳過快取即時更新。
