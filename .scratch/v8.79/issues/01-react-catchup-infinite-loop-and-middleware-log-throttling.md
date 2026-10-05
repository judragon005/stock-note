# 01-react-catchup-infinite-loop-and-middleware-log-throttling

## Description
修復 `src/hooks/useMarketCatchupSync.ts` 中因 `onSyncCompleted` 閉包引用引發的 React 無限重繪渲染死循環 (Infinite Loop)，以及 `scripts/market-sync/vite-market-middleware.cjs` 在冷卻期內對重複請求無條件輸出 `console.log` 導致終端機洗版的問題。

## Acceptance Criteria
- [x] 在 `src/hooks/useMarketCatchupSync.ts` 中使用 `useRef` 保存 `onSyncCompleted` 回呼，徹底解除 `checkStatus` 對其的閉包依賴，使 `checkStatus` 不會隨父組件重新渲染而重新生成。
- [x] `useEffect` 僅在組件 mount、瀏覽器網路恢復（`online`）及分頁切換為可見（`visibilitychange`）時正常觸發，不再引發自我觸發的無限迴圈。
- [x] 在 `scripts/market-sync/vite-market-middleware.cjs` 的 `triggerCatchupTask` 中，當請求處於冷卻期內時，移除常態性 `console.log`，改為靜默略過（或僅在 DEBUG 旗標下輸出），避免開發終端機被洗版。
- [x] 撰寫/更新單元測試，驗證傳入不同實例的 `onSyncCompleted` 時不會引起額外的狀態輪詢請求。

## Status
- [x] done
