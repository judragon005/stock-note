# 04 — 按需補齊任務 AbortController 真中斷控制

**What to build:** 在市場同步中介層按需補齊逾時競速降級中導入原生 `AbortController`，逾時觸發時立即中止底層網路請求並優雅處理 `AbortError`，避免放棄的請求持續佔用連線資源。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 逾時競速封裝初始化 `AbortController` 並將 `signal` 透傳至按需補齊任務與底層 `fetch`
- [ ] 逾時觸發時立即呼叫 `controller.abort()` 並清理計時器，優雅吞掉 `AbortError` 不拋出未處理例外
- [ ] 單元測試驗證逾時情境下 `AbortSignal.aborted === true` 且前端不阻塞降級
