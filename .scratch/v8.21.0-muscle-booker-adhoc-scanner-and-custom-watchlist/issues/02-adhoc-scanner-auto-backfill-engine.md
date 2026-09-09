# Issue 02: 任意股票代碼即時外部回補診斷引擎整合

## 狀態

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`engine`, `backfill`, `muscle-booker`

## 需求說明

1. 在 `MuscleBookerWorkspace.tsx` 整合任意代碼即時分析流程：
   - 使用者鍵入代碼後，支援 Enter 鍵或點擊「⚡ 連線診斷」。
   - 自動判定市場（純數字為 `TW`，英文字母為 `US`）。
   - 調用 `backfillSymbolOhlcvAndIndicators` 拉取歷史日 K 並儲存至 IndexedDB。
   - 解析中文名稱與最新價格，調用 `scanMuscleBookerItem` 計算雷達訊號。
2. 完善防錯機制：
   - 處理連線超時、404 或無效代碼，顯示友善提示。
   - 提供 Loading 狀態指示器。

## 實作成果

- 已於 `MuscleBookerWorkspace.tsx` 實作 `handleRunAdHocScan`，支援 Enter 鍵快捷與按鈕點擊觸發。
- 支援數字判斷為台股 `TW`，英文字母判斷為美股 `US`。
- 調用 `backfillSymbolOhlcvAndIndicators` 拉取外部歷史日 K 數列並寫入本地快取，再由 `scanMuscleBookerItem` 產出完整三色雷達指標。
- 完整涵蓋 `isAdHocLoading` 轉圈動畫與 `adHocError` 友善錯誤提示橫幅，杜絕白屏。
