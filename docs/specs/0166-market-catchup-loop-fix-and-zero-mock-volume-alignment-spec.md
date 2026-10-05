# 規格書 0166：市場追趕渲染死循環修復、零偽造筆數與台股成交量張數對齊 (Market Catchup Render Loop Fix, Zero Mock Transactions, and TW Volume Lots Alignment Spec)

## Problem Statement

在系統運行與戰情室介面檢視過程中，發現以下三大嚴重缺陷：

1. **React 無限渲染循環導致終端機高頻洗版 (React Infinite Render Loop & Console Flooding)**：
   在 `AiForceDashboardView.tsx` 中呼叫 `useMarketCatchupSync` 時，傳入了 inline 物件 `{ onSyncCompleted: () => loadDataForSymbol(symbol, market) }`。
   在 `src/hooks/useMarketCatchupSync.ts` 中，`checkStatus` 回呼將 `onSyncCompleted` 列為依賴項，導致每次組件重新渲染時 `checkStatus` 都會重新生成，進而觸發 `useEffect` 向後端發出 `/api/market/sync-status?catchup=true`。
   後端中介層 `vite-market-middleware.cjs` 在冷卻期內收到請求，每次無條件輸出 `console.log`，前端收到回應後又執行 `setSyncStatus` 引發重新渲染，形成了每秒十數次的**無限渲染死循環**，使終端機充斥大量重複日誌並浪費 CPU 資源。

2. **台股成交量張數放大了 1000 倍 (TW Volume Unit Mismatch: Shares vs. Lots)**：
   在 `0050_元大台灣50_全歷史數據.csv` 等本機個股歷史資料庫中，成交量欄位定義為「**成交股數**」（如 2026-10-02 之 `68,606,769` 股）。
   然而在 `aiForceDashboardEngine.ts` 中，直接將未經換算的原始股數賦值給 `marketBar.volumeShares`，而 `HeaderMarketBar.tsx` 預設將台股成交量標籤顯示為「**前日成交量(張)**」，使得前端顯示為荒謬的 `68,606,769 張`（相當於 6800 萬張），全市場 2361 檔標的皆存在此嚴重單位錯置。

3. **嚴重違反 Zero Mock Policy：隨意使用 `volume * 2.3` 偽造成交筆數 (Violation of Zero Mock Policy)**：
   在 `src/engine/aiForceDashboardEngine.ts` 第 1085-1089 行中，發現如下偽造代碼：
   ```ts
   transactionCount: Math.round(
     (!settlement.isSettled
       ? last.volume
       : (realtimeQuote?.volume ?? (realtimeQuote?.price && last.date !== settlement.anchorTradingDate ? 0 : last.volume))) * 2.3
   ),
   ```
   因本機歷史日 K CSV 僅包含 `[日期,開盤,最高,最低,收盤,漲跌,漲幅,成交股數]`，未收錄「成交筆數」，開發者未遵從 `Honest Empty State` 政策，竟擅自以 `volume * 2.3` 粗暴虛構出 1.57 億筆成交筆數（6860萬 * 2.3）。此舉完全違反金融軟體精確性與專案的零假資料政策。

---

## Solution

1. **斷開前端渲染死循環與中介層日誌節流 (`useMarketCatchupSync.ts` & `vite-market-middleware.cjs`)**：
   - **前端解耦**：在 `useMarketCatchupSync.ts` 中，使用 `useRef` 保存 `onSyncCompleted` 回呼，徹底解除 `checkStatus` 對其的閉包依賴；`useEffect` 僅在組件 mount、瀏覽器網路恢復（`online`）及分頁可見性切換（`visibilitychange`）時依序觸發，杜絕無限循環。
   - **中介層靜默防禦**：在 `vite-market-middleware.cjs` 的 `triggerCatchupTask` 中，當請求處於冷卻期內，移除每次打擊均無條件 `console.log` 的行為，改為靜默略過或僅在除錯旗標啟用時記錄，維持終端機乾淨。

2. **台股成交量依「張 / 股」正確換算 (`aiForceDashboardEngine.ts`)**：
   - 區分台股（`market === 'TW'`）與美股（`market === 'US'`）：
     - 台股（單位為張）：數值精準換算為 `Math.round(rawVolume / 1000)`。
     - 美股（單位為股）：維持原始 `rawVolume` 股數。
   - 若台股日後需要保留原始股數，於 `marketBar` 中明確分離 `volumeShares`（股）與 `volumeLots`（張），使展示層與指標層定義清晰一致。

3. **全面拔除 `* 2.3` 偽造數據，落實誠實無數據原則 (Strict Zero Mock Policy)**：
   - 徹底刪除 `volume * 2.3` 的計算公式。
   - 當歷史資料源未提供成交筆數時，`transactionCount` 嚴格回傳 `undefined`；前端 `HeaderMarketBar.tsx` 依據既有邏輯安全格式化為 `-`。
   - 僅當真實即時或盤後報價來源（例如 TWSE MIS API 明確帶有 `transactions` 欄位）時才填入實際數值。

4. **建立防護網與常識邊界驗證 (Sanity / Boundary Tests)**：
   - 於單元測試中驗證台股個股（如 0050、2330）之成交量張數與股數之正確比例（`1:1000`）。
   - 驗證任何沒有成交筆數資料的歷史日 K 均不得生成虛構成交筆數。
   - 撰寫測試驗證 `useMarketCatchupSync` 在回呼函數頻繁變更時，不會產生連續重發請求的死循環。

---

## User Stories

1. **作為開發者**，在啟動 `npm run dev` 進行操作時，終端機不會因為前端組件重新渲染而每秒被數十行冷卻日誌洗版，確保本地開發體驗流暢。
2. **作為投資人/交易員**，在主力戰情室查看 0050 或任何台股個股時，頂部面板顯示的成交量（張）必須為真實張數（例如 68,607 張，而非 6800 萬張），避免量能解讀產生重大誤判。
3. **作為產品負責人**，我要求系統貫徹「零偽造數據（Zero Mock Policy）」，當資料庫沒有成交筆數時，系統應誠實呈現 `-`，絕不允許出現 `volume * 2.3` 這類荒謬的虛構數值欺瞞使用者。
4. **作為測試工程師**，我需要自動化測試防線，在 CI 階段攔截任何試圖對成交量或筆數進行常數倍率偽造的程式碼，確保系統長期可維護性。

---

## Implementation Decisions

### 1. 前端 Hook 閉包解耦 (`useMarketCatchupSync.ts`)
```ts
export function useMarketCatchupSync(options: UseMarketCatchupSyncOptions = {}) {
  const { onSyncCompleted, enabled = true } = options;
  const onSyncCompletedRef = useRef(onSyncCompleted);

  useEffect(() => {
    onSyncCompletedRef.current = onSyncCompleted;
  }, [onSyncCompleted]);

  const checkStatus = useCallback(async (triggerCatchup = true) => {
    // ...
    // 使用 onSyncCompletedRef.current?.() 代替 onSyncCompleted 依賴
  }, []); // 移除 onSyncCompleted 依賴項
```

### 2. 歷史成交量張數換算 (`aiForceDashboardEngine.ts`)
```ts
// 原始量能 (股)
const rawVolume = !settlement.isSettled ? last.volume : (realtimeQuote?.volume ?? last.volume);

// 依市場決定單位轉換：台股為張 (1張=1000股)，美股為股
const displayVolume = market === 'TW' ? Math.round(rawVolume / 1000) : rawVolume;

// 嚴格落實 Zero Mock Policy：無真實筆數則為 undefined
const transactionCount = realtimeQuote?.transactions !== undefined ? realtimeQuote.transactions : undefined;
```

### 3. 中介層冷卻防洗版 (`vite-market-middleware.cjs`)
- 將冷卻中的 console.log 改為節流機制，或降級為只有在 verbose/debug 模式下輸出，生產/普通開發環境在冷卻期間保持安靜。

---

## Testing Decisions

- **Seam 1: `aiForceDashboardEngine.test.ts` (成交量張數與零假筆數驗證)**
  - 驗證台股傳入 `volume = 68606769` 時，`marketBar.volumeShares` 產出為 `68607` 張。
  - 驗證美股傳入 `volume = 5000000` 時，`marketBar.volumeShares` 產出為 `5000000` 股。
  - 驗證無論台股或美股，在無即時筆數資料傳入時，`marketBar.transactionCount` 嚴格為 `undefined`。
- **Seam 2: `useMarketCatchupSync.test.ts` (閉包依賴與防死循環驗證)**
  - 驗證父組件即使在每一次渲染中提供不同的 `onSyncCompleted` 函數實例，`useMarketCatchupSync` 也絕不會重新觸發 API 請求。
- **Seam 3: 金融常識防禦驗證 (Sanity / Boundary Assertion)**
  - 驗證台股歷史日 K 解析與戰情室報告中，單日成交筆數絕不可能大於成交股數。

---

## Out of Scope

- 本機歷史資料庫實體缺少 1719 檔三大法人之資料爬取（此屬外部數據源資產收錄範圍，未來由獨立之全市場法人歷史爬蟲專題補齊）。
- 美股全歷史日 K 批次同步整合進本機中介層啟動任務（美股由現有 Yahoo 惰性管線與獨立排程處理）。
