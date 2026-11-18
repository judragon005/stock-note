# Issue 13: 容器接線、7 步深度投研彈窗全量傳參與全量迴歸驗證

- **層級**: 系統整合 / 迴歸測試
- **關聯規格**: Spec 0237 Ticket 13 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 於 `src/App.tsx` 傳入 `holdings`、`loanRecords`、`apiKeys` 與 `colorTheme` 至 `AiForceDashboardView`。
2. 補齊開啟 `<EquityDeepDiveModal>` 時之 `candles`、`institutionalRecords`、`boxFloorPrice`、`boxCeilingPrice` 與估值參數。
3. 執行全量測試套件驗證（100% 綠燈）與 `npm run build` 生產編譯驗證（0 錯誤）。
