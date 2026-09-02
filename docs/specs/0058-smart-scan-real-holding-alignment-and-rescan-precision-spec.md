# PRD 0058: 智慧掃描公司行動真實持股對齊、強制重掃狀態重置與精準配息比對 (Smart Scan Real Holding Alignment & Rescan Precision Spec)

## 1. 背景與核心問題 (Background & Core Problems)

在智慧掃描公司行動功能演進中，使用者在全盲測驗證與手動操作時發現三大關鍵缺陷：

1. **基準日持股數失真（如 9927 泰銘 10,000 股被算成 7,972 股）**：
   - 掃描器引擎在記憶體中維護 `virtualTrades` 試圖進行跨事件虛擬時序連鎖推算。
   - 當掃描到尚未入帳的歷史減資事件時，引擎自動插入一筆虛擬減資，導致後續年度的除息基準日持股被二次扣減 28.28%（扣為 7,972 股），與使用者帳本真實在倉股數（10,000 股）嚴重脫鉤。
2. **強制清除快取重掃 UI 凍結與快取死鎖**：
   - 點擊「強制清除快取重掃」時，React 的 `progress` 狀態未立即重設為 `scanning`，若後續異步比對迅速完成，畫面會卡在靜態的「全市場掃描完成」頁面，缺乏反饋感。
   - 引擎在 `forceRefresh = true` 時未跳過 IndexedDB，導致舊有的本機快取死鎖。
3. **現金股利粗暴 60 天模糊比對吃掉待補登項目**：
   - 原比對邏輯中只要 60 天內存在同標的 `DIVIDEND` 即認定為已入帳，導致使用者手動刪除特定季度配息後，重掃仍被其他季度混淆認定為已存在，無法呈現為待補登。

---

## 2. 功能規格與領域邏輯 (Functional Specification)

### 2.1 基準日持股嚴格對齊真實帳本持股 (SSOT Trades Alignment)
- **核心原則**：公司行動與除權息之基準日持股（`sharesHeldOnDate`），必須 100% 依據使用者帳本真實交易記錄（`trades`）在除息日前一日收盤在籍股數計算。
- **廢除未入帳虛擬事件污染**：移除 `virtualTrades` 對未入帳歷史減資/分割事件的連鎖預扣，確保 9927 泰銘除息基準日持股 100% 精準為 10,000 股。
- **證券法規合規性**：嚴格落實 `exDate - 1`（Last Cum-Date）收盤在籍持股標準。除息日當天建倉買進者不享有該次配息（股數為 0），避免產生重複獲利 (Double Dip) 財務計算錯誤。

### 2.2 強制重掃狀態即時重置與 IndexedDB 快取穿透
- **UI 狀態機重置**：點擊「強制清除快取重掃」時：
  1. 立即執行 `handleAbort()` 終止前次非同步請求；
  2. 立即將 `progress` 重設為 `{ current: 0, total: N, status: 'scanning' }`；
  3. 清空 `actions` 與 `selectedIds`，並安排微任務發起全新掃描動畫與請求。
- **IndexedDB 穿透**：當 `forceRefresh: true` 時，明確執行 `forceRefresh ? [] : await getCorporateActionsBySymbolFromDB(symbol)`，跳過舊快取並向線上金融端點重新連線。

### 2.3 高精準現金股利比對 (High-Precision Dividend Matching)
- 現金股利比對判定已入帳條件收斂為：
  1. 明確比對 `exDate === ev.date` 或 `payDate === ev.payDate`；
  2. 若無日期屬性，則日期差距須 $\le$ 45 天 **且** 每股配息金額吻合（$|\Delta price| < 0.05$）或總金額吻合（$|\Delta cash| / cash < 5\%$）；
  3. 杜絕跨季度的配息被模糊誤判，確保刪除單季配息後重掃必能標記為「✨ 待補登」。

---

## 3. 測試覆蓋矩陣 (Test Coverage Matrix)

| 測試模組 | 測試項目 | 驗證標準 |
| :--- | :--- | :--- |
| `corporateActionScanner.test.ts` | 9927 泰銘 2026 除息基準日持股 | 基準日持股精確為 10,000 股，實收 48,945 元（扣二代健保 1,055 元） |
| `corporateActionScanner.test.ts` | 刪除單季配息後的重掃判定 | 刪除的季度除息標記為 `isAlreadyRecorded = false`，其餘季度標記為 `true` |
| `corporateActionScanner.test.ts` | 證券法規除息日買進排除 | 除息日當天買進之持股在該次除息事件中不得享有配息 (`undefined`) |
| `corporateActionScanner.test.ts` | `forceRefresh: true` 穿透快取 | 成功跳過舊快取，完整回傳最新掃描事件 |

---

## 4. 驗收標準 (Acceptance Criteria)

1. **基準日持股 100% 準確**：泰銘 9927 除息基準日持股顯示為 10,000 股，預估入帳 NT$ 48,945。
2. **重掃狀態 100% 即時反饋**：點擊「強制清除快取重掃」時進度條立即自 0 檔重新遞增轉圈，無凍結感。
3. **刪除補登 100% 可復現**：刪除歷史中任一筆配息後，重掃清單中必出現該筆待補登項目。
4. **全量測試綠燈**：全專案單元測試 100% 通過（381+ 測試全綠），TypeScript 0 錯誤。
