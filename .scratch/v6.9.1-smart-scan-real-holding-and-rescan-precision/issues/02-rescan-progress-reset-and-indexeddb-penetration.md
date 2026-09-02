# Issue 02: 強制重掃進度條即時重置與 IndexedDB 快取穿透機制

- **狀態**：`CLOSED`
- **關聯規格**：[PRD 0058 §2.2](file:///d:/APP/股票紀錄/docs/specs/0058-smart-scan-real-holding-alignment-and-rescan-precision-spec.md)
- **影響範圍**：`src/components/CorporateActionScannerModal.tsx`, `src/engine/corporateActionScanner.ts`

---

## 1. 任務背景與問題 (Problem Statement)
- 使用者點擊「強制清除快取重掃」按鈕後，進度條未立即清零，畫面仍停留在「全市場掃描完成」靜態頁面，導致無動作之凍結感。
- 引擎在 `forceRefresh: true` 時仍先自 IndexedDB 撈取舊事件，導致本機快取無法穿透刷新。

---

## 2. 實作變更 (Implementation Changes)
- 在 `CorporateActionScannerModal.tsx` 中：
  - 點擊按鈕時立即終止殘留任務，重設 `progress: { current: 0, status: 'scanning' }`。
  - 清空 `actions` 與 `selectedIds`，並安排微任務刷新 React 載入動畫。
- 在 `corporateActionScanner.ts` 中：
  - 當 `forceRefresh === true` 時，跳過 IndexedDB 讀取，直接向線上金融 API 重新抓取。

---

## 3. 驗收標準 (Acceptance Criteria)
- [x] 點擊「強制清除快取重掃」時，進度條立即自 0 檔重新遞增轉圈，無卡頓凍結。
- [x] 成功穿透本機 IndexedDB 快取，100% 撈取最新資料。
