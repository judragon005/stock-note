# 技術債 0052: defaultFetchJson 雙重信號複合支援 (Compound AbortSignal Integration)

## 1. 摘要與背景
在 Spec 0187 中，我們將 `defaultFetchJson` 升級為原生 `fetch` 搭配 `AbortSignal.timeout(timeoutMs)`，成功消除了 Node.js `http.get` 在 Response 串流讀取階段的靜默掛起問題。
目前在實作中：
```javascript
const signal = options.signal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined);
```
當外層傳入 `options.signal`（例如使用者的取消信號 `activeAbortController.signal`）時，它會直接取代單次請求的 20 秒逾時。雖然外層已經有單日 45 秒看門狗（Watchdog）熔斷保護，整體運作安全無虞，但單一 HTTP 請求的粒度在傳入取消信號時無法同時保有 20 秒連線超時。

---

## 2. 改善方案與架構設計
在未來 Node.js 20+ 環境或微服務抽離時，可利用標準的 `AbortSignal.any()` 進行信號複合：
```javascript
let finalSignal;
const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
if (options.signal && typeof AbortSignal.any === 'function') {
  finalSignal = AbortSignal.any([options.signal, timeoutSignal].filter(Boolean));
} else {
  finalSignal = options.signal || timeoutSignal;
}
```
透過信號複合，無論是使用者點擊「停止任務」，還是遠端官方 API 逾時 20 秒，都能在同一層級立刻觸發中斷。

---

## 3. 優先級與觸發時機
- **優先級**: `P3 (Low)`
- **狀態**: `RESOLVED` (已於 v9.02.0 Spec 0205 完整解決)
- **觸發時機**: 已於 Spec 0205 整合完成。
