# v9.01.0: 宏觀晨會簡報數據認證戳記、獨立防守價修復、隱私脫敏與實戰極簡對齊 (Spec 0204)

## 概述

本迭代依據 [`docs/specs/0204-war-room-morning-brief-data-seal-and-lean-alignment-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0204-war-room-morning-brief-data-seal-and-lean-alignment-spec.md) 與外部 AI 雙輪實彈稽核回饋，拒絕粗糙打包，將重構任務細化為 **8 個單一職責、具備獨立測試縫隙的細粒度票券**。

---

## 細粒度票券清單 (Granular Tickets Index)

| 票券編號 | 檔案 | 模組 | 核心職責 | 依賴 | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ticket 01** | [`01-expand-macro-holding-signal-types.md`](issues/01-expand-macro-holding-signal-types.md) | `macro.ts` | 擴充 `MacroHoldingSignalInput` 型別，補齊股數、成本、現價、權重%與損益%等風控欄位。 | 無 | `ready-for-agent` |
| **Ticket 02** | [`02-clean-kline-and-inject-real-weights.md`](issues/02-clean-kline-and-inject-real-weights.md) | `WarRoomWorkspace.tsx` | 拔除 `volume: 10000` 與 `±1%` 假造 K 線；提取真實持股權重與損益傳入引擎。 | Ticket 01 | `ready-for-agent` |
| **Ticket 03** | [`03-fix-isolated-stop-loss-and-target-prices.md`](issues/03-fix-isolated-stop-loss-and-target-prices.md) | `macroAdvisorEngine.ts` | 徹底根除 18 檔共用 $10.9593 與 00919 共用 $56.56 防守價 Bug，逐檔獨立標註真實箱底。 | Ticket 01 | `ready-for-agent` |
| **Ticket 04** | [`04-differentiate-sell-signals-by-weight.md`](issues/04-differentiate-sell-signals-by-weight.md) | `macroAdvisorEngine.ts` | 破線警示依持股權重分級（P1 優先 $\rightarrow$ P2 次要），撤回無腦「全數立即停損」恐慌結論。 | Ticket 03 | `ready-for-agent` |
| **Ticket 05** | [`05-morning-brief-scenario-trade-blotter.md`](issues/05-morning-brief-scenario-trade-blotter.md) | `macroAdvisorEngine.ts` | 晨報自動試算 45%/50%/54% 情境下需減碼之具體金額 $\Delta \text{TWD}$，產出可執行的調倉單。 | Ticket 04 | `ready-for-agent` |
| **Ticket 06** | [`06-margin-statutory-deadlines-and-etf-lookthrough.md`](issues/06-margin-statutory-deadlines-and-etf-lookthrough.md) | `macroAdvisorEngine.ts` | 注入質押破 130% 需於「T+2 日 12:00 前補足至 166%」法規死線與 ETF 穿透台積電集中警示。 | Ticket 05 | `ready-for-agent` |
| **Ticket 07** | [`07-llm-payload-cro-system-prompt-expansion.md`](issues/07-llm-payload-cro-system-prompt-expansion.md) | `macroAdvisorEngine.ts` | 補齊 `buildLlmPromptPayload` 遺漏之 OAS、CDS、期貨空單、壓力矩陣，並封裝 CRO 提示詞協議。 | Ticket 01 | `ready-for-agent` |
| **Ticket 08** | [`08-macro-calibration-modal-and-privacy-masking-ui.md`](issues/08-macro-calibration-modal-and-privacy-masking-ui.md) | `WarRoomWorkspace.tsx` | UI 實作極簡「✏️ 數據校準」Modal（填入外資空單 -8.7 萬口）與一鍵「🔒 脫敏複製」遮蔽真實淨值。 | Ticket 02, 05 | `ready-for-agent` |
