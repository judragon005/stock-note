# 06 — 質押法規死線 (T+2 12:00/166%) 與 ETF 穿透警示 (Margin Statutory Deadlines & ETF Lookthrough)

**Parent:** Spec 0204 (Ticket 06)

**What to build:**
升級 `src/engine/macroAdvisorEngine.ts`。
1. 在質押維持率告警時，融入法規死線與自救處方（若跌破 130% 需於 T+2 日 12:00 前補足至 166%，否則 T+3 日開盤斷頭處分，並試算補足金額）。
2. 當持股中包含 0050、00923、009816、2330 等標的時，加入 ETF 穿透（Look-Through）集中度警示，避免投資者陷入表面分散實質單押台積電的風險。

**Blocked by:** Ticket 05

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 檢視 `shield.hasLoans` 與 `shield.marginMaintenanceRatio`：
  - 若維持率 < 166% 且 >= 130%：提示預備現金儲備或提撥擔保品以拉回 166% 安全線。
  - 若維持率 < 130%：在行動要點明確指出：
    `🚨【質押追繳死線】維持率已跌破 130% (${shield.marginMaintenanceRatio}%)，依券商法規需於 T+2 日中午 12:00 前補足至 166%（需補現金約 NT$ ${shortfall166.toLocaleString()}），否則將面臨開盤強制斷頭處分。`
- [ ] 檢視持股清單中是否存在 `0050`, `00923`, `009816`, `2330` 等標的：
  - 若有至少兩檔重疊，且合計權重 > 20%，在晨報診斷中追加：
    `💡【成份穿透警示】0050、00923 等 ETF 與 2330 存在高度半導體權重重疊，實質曝險高度集中，切勿誤判為充分分散；若遇極端下殺切忌掛市價單踩踏。`
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證維持率不同區間之法規文案輸出。
