# [Spec 0226 / Ticket 06] TDD 全量測試回歸矩陣與 TypeScript 建置驗證

## 狀態
READY_FOR_AGENT

## 關聯規格
- Spec: `docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md`
- 關聯 Issue: #507

## 任務細節
1. 執行 `npm test`，確保包含股利、月曆、長條圖、待入帳與 Zavy 相關的所有單元測試 100% 綠燈通過。
2. 執行 `npm run build`，確保 TypeScript 0 錯誤、打包順暢。
3. 驗收畫面與交互完整度，確保無功能退化或未預期破版。

