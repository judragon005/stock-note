# ADR 0166：市場追趕渲染死循環修復、零偽造筆數與台股成交量張數對齊架構決策 (Market Catchup Render Loop Fix, Zero Mock Transactions, and TW Volume Alignment)

## 狀態 (Status)

已接受 (Accepted) - 2026-10-05

## 背景與問題脈絡 (Context & Problem Statement)

在系統實際運行與主力戰情室儀表板檢視中，識別出以下三大嚴重問題：
1. **React 渲染死循環引發終端機洗版**：`useMarketCatchupSync` 因將 inline 傳入之 `onSyncCompleted` 置於 `useCallback` 依賴項中，使每次組件重新渲染皆引發 hook 重新請求 `/api/market/sync-status?catchup=true`，後端在冷卻期內無條件每秒印出大量 log，形成每秒十數次的無限渲染死循環。
2. **台股成交量張數放大了 1000 倍**：歷史日 K 本機 CSV 記錄之成交量為「股數」（如 0050 為 68,606,769 股）。報表引擎未經單位換算即填入頂部行情 Bar，而介面標題標示為「張」，使數值在展示層膨脹了 1000 倍。
3. **違背 Zero Mock Policy 偽造成交筆數**：發現報表引擎中存在 `transactionCount = Math.round(volume * 2.3)` 隨意以 2.3 倍粗暴捏造假筆數的嚴重違規代碼，使 0050 成交筆數虛構成 1.57 億筆。

## 決策內容 (Decision Drivers & Outcomes)

1. **前端 Hook 閉包解耦與防無限渲染 (`useMarketCatchupSync.ts`)**：
   - 使用 `useRef` 保存 `onSyncCompleted` 最新引用，解除 `checkStatus` 對其之依賴。
   - `checkStatus` 引用永恆穩定，`useEffect` 僅在 mount、online、visibilitychange 時觸發，徹底根除無限渲染死循環。
   - 提取純判定函數 `shouldNotifySyncCompleted(prev, current)`，提升可測試性。
2. **中介層冷卻期日誌節流靜默 (`vite-market-middleware.cjs`)**：
   - 移除冷卻略過時的常態 `console.log` 洗版行為，僅在 `DEBUG_MARKET_CATCHUP === 'true'` 時記錄，常態下保持終端機乾淨。
3. **台股成交量依「張 / 股」精確換算 (`aiForceDashboardEngine.ts`)**：
   - 針對台股市場（`market === 'TW'`），當頂部 Bar 單位為「張」時，成交量數值精準換算為 `Math.round(rawVolume / 1000)`。0050 於 2026-10-02 之成交量正確修正為 68,607 張。
   - 美股市場（`market === 'US'`）維持以「股」為單位，保留原始數值。
4. **徹底拔除 `* 2.3` 偽造代碼，貫徹 Zero Mock Policy (`aiForceDashboardEngine.ts`)**：
   - 刪除 `* 2.3` 乘數計算。
   - 無真實筆數來源時嚴格回傳 `undefined`，UI 面板依據 Honest Empty State 規範誠實呈現 `-`。
   - 僅當真實即時或盤後來源帶有成交筆數時方可填入。

## 測試與驗收結果 (Validation)

- **單元測試 (Vitest)**：
  - 新增 `src/hooks/useMarketCatchupSync.test.ts` 驗證狀態轉換與防死循環。
  - 新增 `src/engine/zeroMockPolicy.test.ts` 驗證 0050 張數換算、美股股數保留與偽造筆數拔除。
  - 全專案 180 個測試檔案、1390 個測試全數 100% 綠燈通過。
- **建置驗證 (Build)**：`npm run build` 成功完成，TypeScript 0 錯誤。
- **遠端 CI (GitHub Actions)**：CI 檢驗全數通過 (44s PASS)。
