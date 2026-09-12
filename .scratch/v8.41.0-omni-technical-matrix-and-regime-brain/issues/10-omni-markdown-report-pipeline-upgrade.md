# 10 — Omni Markdown Report Pipeline Upgrade

**What to build:** 
升級 `omniReportPipeline.ts` 中的 Markdown 研報生成邏輯。在研報第一章直接置頂【🎯 實戰交易階梯表】與【🏛️ 市場狀態與總體操盤評級】；納入布林壓縮、背離警訊與大白話操作結論，供使用者一鍵複製至個人筆記。

**Blocked by:** 09 — Actionable Trade Matrix Core Data Builder, 06 — Peak-Trough Divergence Engine (RSI & MACD)

**Status:** ready-for-agent

- [x] 擴充 `generateOmniTechnicalMarkdownReport` 納入市場狀態與實戰階梯表格
- [x] 整合 ATR 吊燈防守與警報清單至風險提示章節
- [x] 單元測試驗證研報包含「第一壓力位」、「短線防守線」與「市場狀態」章節
