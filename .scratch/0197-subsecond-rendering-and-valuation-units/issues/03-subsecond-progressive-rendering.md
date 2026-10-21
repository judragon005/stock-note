# 03 — 兩階段次秒級漸進式秒開與 3 秒超時熔斷

**What to build:**
解決主力戰情室切換新標的時卡死轉圈 90 秒的嚴重體驗問題。解除 `AiForceDashboardView.tsx` 循序 await 阻塞，在本地湖倉日 K 載入（~300ms）後立即執行首次渲染 (`setReport` 並關閉 `isLoading`)；即時報價與單季財報改由背景 Promise 異步補齊；在 `taiwanFinancialPipeline.ts` 外部 FinMind 請求中增設 3 秒超時熔斷 (`AbortSignal.timeout(3000)`)。

**Blocked by:** Ticket 01 — 官方每日估值中介層連通與幽靈標籤根除

**Status:** ready-for-agent

- [ ] 在 `src/engine/taiwanFinancialPipeline.ts` 為 FinMind 請求加入 3000ms 超時控制器
- [ ] 在 `src/components/aiForceDashboard/AiForceDashboardView.tsx` 實作兩階段秒開架構
- [ ] 驗證切換 4979 時在 0.3 ~ 0.5 秒完成首屏渲染
