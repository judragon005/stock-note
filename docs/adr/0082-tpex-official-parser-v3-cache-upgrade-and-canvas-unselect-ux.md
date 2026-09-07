# 0082. TPEx 櫃買官方三大法人 24 欄解析器升級、V3 快取換代與畫布點擊取消選取互動機制

- **日期**：2026-09-07
- **狀態**：ACCEPTED
- **關聯 PRD / Spec**：[0082-tpex-official-parser-v3-cache-upgrade-and-canvas-unselect-ux-spec.md](../specs/0082-tpex-official-parser-v3-cache-upgrade-and-canvas-unselect-ux-spec.md)

---

## 背景與問題脈絡 (Context)

在實作聰明錢流動視覺化（Smart Money Flow View）時，使用者實測發現群聯（8299）等上櫃股票三大法人張數全為 0，且點擊標的固定卡片後點擊畫布空白處無法取消選取。
追查發現：
1. TPEx 官方 API 回傳物件格式為 `tables[0].data`，並非 `aaData`。
2. TPEx 24 欄日報中外資、投信、自營商欄位索引位移。
3. 過去的殘缺資料寫入 IndexedDB 快取造成污染。
4. 畫布容器與 `<svg>` 缺乏取消選取的點擊監聽器，且泡泡節點未隔離事件冒泡。

---

## 決策內容 (Decisions)

1. **升級 TPEx 解析器**：
   - 提取路徑支援 `rawData.tables?.[0]?.data || rawData.data || rawData.aaData`。
   - 正確映射外資合計 `row[8..10]`、投信 `row[11..13]`、自營商合計 `row[20..22]`、三大法人合計 `row[23]`。
   - 保留向下相容 12 欄降級邏輯。
2. **升級快取版本至 V3**：
   - 快取鍵名前綴改為 `TWSE_TPEX_CHIPS_V3_`，自動作廢並隔離受污染的舊快取。
3. **畫布點擊取消與浮窗關閉機制**：
   - 主 SVG 畫布區域與 `<svg>` 上綁定 `setSelectedBubble(null)`。
   - 標的泡泡 `<g>` 綁定 `e.stopPropagation()` 隔離冒泡。
   - `calculateTooltipPlacement` 支援 `isPinned`，固定時設為 `pointerEvents: 'auto'`，浮窗內點擊 `e.stopPropagation()`，並在右上角新增「✕」關閉按鈕。

---

## 影響評估與後續考量 (Consequences)

### 正向影響 (Positive)
- 上櫃標的（如 8299 群聯、6488 環球晶等）三大法人籌碼張數 100% 正確獲取與渲染，徹底終結數據全為 0 的痛點。
- 畫布交互順暢，使用者點擊空白區域或卡片 ✕ 按鈕均能立即取消選取，卡片不再無故滯留。
- 測試覆蓋完備，全量測試 545 個 100% 綠燈通過。

### 需留意事項 (Trade-offs & Notes)
- 首次載入因快取升級至 V3，會發起一次雙軌網路請求，後續將自動持久化至 IndexedDB，兼顧資料新鮮度與傳輸效率。
