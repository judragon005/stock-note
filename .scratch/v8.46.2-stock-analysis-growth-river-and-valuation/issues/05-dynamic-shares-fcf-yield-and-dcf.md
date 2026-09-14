# Ticket 05: 全市場動態流通股數推導、FCF Yield 與 DCF 估值修復

## 任務內容
- [x] 在 keyMetricsEngine.ts 導入 capitalStock / 10 與 netIncome / eps 動態股數推導
- [x] 修正 calculateFcfYield 支援多季 TTM FCF 計算，使台泥回歸 5%~15% 正常區間
- [x] 修正 calculateDcfValuation 採用動態股數，使台泥每股內在價值回歸 30~45 元正常區間
- [x] 杜絕 9135% 天文數字與 28.5 萬元 / 119 萬趴之失真估值
