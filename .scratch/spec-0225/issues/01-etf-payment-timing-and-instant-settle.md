# 01 — ETF 分流推估 (+23天/+28天) 與「一鍵已入帳」資料流

**What to build:** 
修正證交所 API 無配息入帳日所導致的時差問題。ETF 標的（如 00878、00919 等）自動依 +23 天慣例推估入帳日（個股維持 +28 天），消除入帳前夕被誤判為「還要等幾天」的困擾。同時在資料合約上提供「一鍵已入帳」支援與官方/推估標籤，讓投資人收到銀行入帳通知時能手動定錨為今日並轉為已結算。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `estimatePaymentDate` 依據標的代碼判斷台股 ETF，分流推估為 +23 天，個股維持 +28 天。
- [ ] 應收股利資料模型支援 `dateSource: 'OFFICIAL' | 'ESTIMATED'` 欄位與 `onInstantSettleDividend` 回調。
- [ ] 單元測試驗證 ETF 與個股的推估天數差異及即時結算邏輯。

