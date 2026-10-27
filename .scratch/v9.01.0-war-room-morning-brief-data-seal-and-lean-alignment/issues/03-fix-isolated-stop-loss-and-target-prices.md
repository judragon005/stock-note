# 03 — 徹底根除幽靈共用防守價 Bug (Fix Isolated Stop-Loss & Target Prices)

**Parent:** Spec 0204 (Ticket 03)

**What to build:**
修復 `src/engine/macroAdvisorEngine.ts` 中字串拼接的重大邏輯錯誤。先前的代碼中，`sellSignals` 取了 `sellSignals[0].stopLossPrice` 套給全部標的，導致 18 檔標的全部共用低價股凌巨（8105）的 10.9593 元防守價；`buySignals` 取了 `buySignals[0].stopLossPrice` 套給全部標的，導致市價 32 元的 00919 竟然以 0056 的 56.56 元作為移動防守點。重構為逐檔獨立輸出各自的真實防守價，絕無跨標的共用數值。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 檢視 `src/engine/macroAdvisorEngine.ts` L260-L283：
  - 徹底移除 `sellSignals[0].stopLossPrice` 與 `buySignals[0].stopLossPrice`。
- [ ] 對破線標的（`sellSignals`）：
  - 獨立逐檔映射為 `${s.symbol}${s.stopLossPrice ? ` (防守線 $${s.stopLossPrice})` : ''}`。
  - 例如：`3260 (防守線 $122.5)、2344 (防守線 $24.8)`，絕不出現全體共用單一數值。
- [ ] 對動能突破標的（`buySignals`）：
  - 獨立逐檔映射為各自的防守點。例如：`0056 (防守 $56.56)、00919 (防守 $32.20)`，徹底消滅 00919 出現 56.56 元的荒謬錯誤。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts`：
  - 新增測試案例：傳入多檔賣出與多檔買進訊號（如 0056 與 00919），驗證輸出字串中每檔各自擁有獨立數值，不存在交叉污染。
