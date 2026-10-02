# 05 — 7 步投研資料契約與型別定義

**What to build:** 
在 `src/types/equityDeepDive.ts` 定義完整之型別與資料契約。包括 7 步驟分別之 Payload 介面（`Step1BusinessModel`、`Step2FinancialForensic`、`Step3PeerComparison`、`Step4LatentRisks`、`Step5ScenarioSimulation`、`Step6ChipsAnalysis`、`Step7InvestmentMemo`）、全量輸入 `EquityDeepDiveInput`、全量報表 `EquityDeepDiveReport` 與持久化資料結構 `InvestmentMemoRecord`。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 定義清晰之 TypeScript 嚴格型別介面
- [ ] 支援台股與美股特定欄位（如籌碼與幣別）之條件式可選型別
- [ ] 匯出所有相關型別供計算引擎、儲存層與 UI 元件消費
