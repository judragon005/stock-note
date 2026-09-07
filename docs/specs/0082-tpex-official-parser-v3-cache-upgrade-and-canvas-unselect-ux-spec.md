# 0082: TPEx 櫃買官方三大法人 24 欄解析器升級、V3 快取換代與畫布點擊取消選取互動規範

- **狀態**：PROPOSED
- **建立日期**：2026-09-07
- **影響範圍**：`src/engine/smartMoneyFetcher.ts`, `src/components/SmartMoneyBubbleChart.tsx`, 相關測試組件

---

## 1. 背景與核心問題 (Background & Problems)

在「聰明錢流動視覺化 (Smart Money Flow)」中，使用者回報了兩項嚴重的交互與數據缺陷：
1. **上櫃標的（如 8299 群聯）三大法人買賣超張數恆為 0**：
   - TPEx 官方 API (`3itrade_hedge_result.php`) 回傳結構為 `{"tables": [{"data": [...]}]}`，原解析器試圖從 `aaData` 或 `data` 讀取，導致讀取恆為 `undefined`。
   - 欄位索引對應嚴重錯誤，原解析器誤把外資自營商當成投信，完全無法取得投信與自營商合計買賣超。
   - 先前抓取失敗後，殘缺的「僅上市資料」被寫入 IndexedDB 快取（`TWSE_T86_CHIPS_YYYYMMDD`），導致前端後續直接命中空資料快取。
2. **點擊某標的泡泡後，點擊畫布空白處無法關閉/取消選取卡片**：
   - 畫布外層容器與 `<svg>` 未綁定重置選取的事件監聽器。
   - 泡泡節點未阻斷事件冒泡 (`stopPropagation`)。
   - Tooltip 浮窗未提供直覺關閉途徑。

---

## 2. 系統架構與功能規範 (Functional Specifications)

### 2.1 TPEx 官方 24 欄日報解析器與相容機制
- 支援官方標準回傳 `rawData.tables?.[0]?.data`，並向下相容 `rawData.data` 與 `rawData.aaData`。
- 正確解析 24 欄位：
  - 外資及陸資合計：買進(8), 賣出(9), 買賣超(10)
  - 投信：買進(11), 賣出(12), 買賣超(13)
  - 自營商合計：買進(20), 賣出(21), 買賣超(22)
  - 三大法人合計買賣超：(23)
- 所有股數均除以 1,000 並進行四捨五入換算為「張數」。
- 若欄位為 12 欄舊版格式，自動降級處理，杜絕系統崩潰。

### 2.2 快取鍵名升級與快取隔離 (Cache Invalidation)
- 將快取鍵名前綴由 `TWSE_T86_CHIPS_` 升級為 `TWSE_TPEX_CHIPS_V3_`。
- 徹底隔離並作廢先前僅存有 TWSE 上市資料的舊快取，確保使用者在升級後自動拉取完整的上市櫃雙軌法人日報。

### 2.3 畫布空白點擊取消選取與雙重關閉機制
- 主 SVG 畫布區域及其 `<svg>` 元素均綁定 `onClick={() => setSelectedBubble(null)}`。
- 泡泡節點 `<g>` 之 `onClick` 加入 `e.stopPropagation()`，防止選取泡泡時事件冒泡觸發畫布取消事件。
- `calculateTooltipPlacement` 支援 `isPinned` 參數：
  - Hover 狀態：`pointerEvents: 'none'`，不干擾游標穿透。
  - 選取鎖定狀態：`pointerEvents: 'auto'`，支援 Tooltip 內部文字點選複製與按鈕互動。
- Tooltip 浮窗自身加入 `onClick={(e) => e.stopPropagation()}`，防止點擊浮窗內容誤關閉。
- 選取鎖定模式下，Tooltip 浮窗右上角提供顯著且優雅的「✕」關閉按鈕，提供使用者多元取消選取之便利途徑。

---

## 3. 測試與驗收標準 (Acceptance Criteria)

1. **TPEx 解析單元測試**：
   - 驗證真實 24 欄 TPEx 官方日報資料，8299 群聯能精確解析出外資 +122 張、投信 -22 張、自營商 +57 張、三大法人合計 +157 張。
   - 驗證空資料與異常格式之安全容錯。
2. **視覺與互動測試**：
   - 驗證 `calculateTooltipPlacement` 在固定模式下傳回 `pointerEvents: 'auto'`，Hover 模式下傳回 `pointerEvents: 'none'`。
   - 全專案單元測試 100% 通過（`npm test` 綠燈）。
   - TypeScript 編譯 0 錯誤（`npm run build` 成功）。
