# Ticket 01: 應用程式啟動背景靜默自動同步除息公告 (Background Corporate Actions Sync)

## 任務描述
在應用程式初始載入（持股與交易資料載入就緒）時，移除原本必須進入「股利日誌」分頁才觸發的限制，在背景靜默預載同步除息公告，同時保留介面手動同步按鈕。

## 涉及檔案
- `src/App.tsx`
- `src/engine/corporateActionScanner.ts`

## 驗收標準 (Acceptance Criteria)
1. 應用程式啟動時，若 `holdings.length > 0` 且尚未同步，`useEffect` 自動於背景觸發 `handleSyncCorporateActions(false)`。
2. 背景預載過程中不阻塞使用者操作其他分頁（如持倉、概覽、記帳等）。
3. 介面手動「同步除息公告」按鈕功能保持正常，點擊時觸發 `forceRefresh: true` 強制刷新並展示旋轉 Loading 動畫。
4. 預載與同步過程遵循 24H 快取保護與 150ms 節流延遲，避免 API 頻率超限。
