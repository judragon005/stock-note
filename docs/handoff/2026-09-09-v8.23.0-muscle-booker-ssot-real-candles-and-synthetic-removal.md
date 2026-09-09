# v8.23.0 交接手冊：肌肉書僮真實日 K 單一真實來源 (SSOT) 與偽造行情機制徹底廢除 (HANDOFF)

## 1. 本次迭代完成摘要 (Executive Summary)

- **核心目標**：
  修復肌肉書僮動能雷達中，同一檔股票「4763 材料*-KY」在連線診斷顯示「建議賣出·跌破箱底」，但在自訂觀察池卻因缺乏日 K 而退回 `generateSyntheticCandles` 偽造假行情誤判為「建議買進」的嚴重 BUG。
- **成果數據**：
  - 徹底廢除 `generateSyntheticCandles` 偽造行情機制，無真實 K 線時安全標註 `isDataPending: true` 與 `AVOID` 觀望，絕不給出錯誤買賣訊號。
  - `MuscleBookerWorkspace` 完整對接 `IndexedDB` 真實日 K 快取（`cachedCandlesMap`）與背景平滑自動回補。
  - 全專案 57 個測試套件、644 個單元測試 100% 綠燈通過。
  - `npm run build` TypeScript 型別檢查 0 錯誤，打包構建成功。

---

## 2. 關鍵架構與代碼變更清單 (File Changes)

1. **`src/engine/muscleBookerEngine.ts`**：
   - `ScannedStockItem` 介面新增 `isDataPending?: boolean`。
   - `scanMuscleBookerItem` 移除 `generateSyntheticCandles` 回退邏輯。若缺少真實 K 線或小於 5 根，回傳 `isDataPending: true`，動作安全降級為 `AVOID`（數據回補中）。
2. **`src/components/MuscleBookerWorkspace.tsx`**：
   - 導入 `getSymbolOhlcv`，建立 `cachedCandlesMap` 真實日 K 快取狀態。
   - `useEffect` 於目標池載入時批次由 IndexedDB 取回已快取的真實日 K。
   - 自訂清單缺損標的背景發起非同步平滑回補，回補完成自動更新快取並觸發無縫重算。
   - 徹底移除以 `c * 1.01` 與 `c * 0.99` 拼裝假 K 線之殘留代碼。
   - 綜合總表中針對 `isDataPending` 提供「🟡 回補中...」與「資料未就緒」之視覺回饋。
3. **`src/components/MuscleBookerWorkspace.test.ts`**：
   - 修正測試：驗證無 K 線時安全降級為 `isDataPending` 與 `AVOID`。
   - 新增測試：驗證以 4763 真實日 K 測試時，手動診斷與清單計算結果 100% 一致。

---

## 3. 測試與驗證指標 (Verification & TDD)

- 單元測試指令：`npm test`（57 passed, 644 passed, 0 failed）
- 打包構建指令：`npm run build`（tsc 0 錯誤，Vite build 成功）

---

## 4. 關聯文檔

- 規格書：[`docs/specs/0104-muscle-booker-ssot-real-candles-and-synthetic-removal-spec.md`](docs/specs/0104-muscle-booker-ssot-real-candles-and-synthetic-removal-spec.md)
- 架構決策：[`docs/adr/0104-muscle-booker-ssot-real-candles-and-synthetic-removal.md`](docs/adr/0104-muscle-booker-ssot-real-candles-and-synthetic-removal.md)
- 本地票券：[`.scratch/v8.23.0-muscle-booker-ssot-real-candles-and-synthetic-removal/issues/`](.scratch/v8.23.0-muscle-booker-ssot-real-candles-and-synthetic-removal/issues/)
