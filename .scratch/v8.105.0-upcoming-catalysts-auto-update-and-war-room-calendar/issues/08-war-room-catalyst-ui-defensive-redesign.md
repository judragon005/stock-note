# 08 — 宏觀戰情室日曆 UI 防禦、分類篩選、空狀態與自訂彈窗 (src/components/WarRoomWorkspace.tsx)

**Parent:** #281

**What to build:**
徹底修復 [WarRoomWorkspace.tsx](file:///d:/APP/股票紀錄/src/components/WarRoomWorkspace.tsx) 中催化劑卡片留白缺陷，並引入券商級體驗：
1. **數據源換軌**：
   - 移除過期的寫死常數 `DEFAULT_RAW_CATALYSTS`。
   - 改為調用 `getAggregatedCatalysts({ receivableDividends })` 獲取自適應催化劑清單，並支援非同步外部更新回調。
2. **快速分類切換籤 (Filter Pills)**：
   - 提供 `全部` (`ALL`)、`🏛️ 央行利率` (`CENTRAL_BANK`)、`📊 通膨就業` (`INFLATION_EMPLOYMENT`)、`🎯 持股除息` (`EARNINGS_DIVIDEND`)、`⚡ 期貨結算` (`DERIVATIVE_SETTLEMENT`)、`✏️ 自訂備忘` (`CUSTOM`)。
3. **券商級卡片樣式與高溫倒數**：
   - 卡片上增加衝擊度徽章（🔴 HIGH / 🟡 MEDIUM）。
   - 倒數 $\le 3$ 天顯示高溫標籤（`🔥 倒數 X 天`），當日登場顯示 `🔥 今日登場`。
4. **空狀態防禦 (Empty State Fallback)**：
   - 若某分類無事件或資料為空，展示 Empty State 卡片，提示「近期無該類別之重大事件」，並提供「＋ 新增自訂事件」與「🔄 重置為預設日曆」按鈕，徹底消滅留白。
5. **快速自訂事件彈窗 (Quick Custom Modal)**：
   - 點擊「新增事件」開啟輕量彈窗，輸入名稱、日期、類別、衝擊度與說明，立即儲存並重新渲染。

**Blocked by:** Ticket 05, Ticket 07

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 進入戰情室後，倒數日曆卡片始終展示豐富之未來事件，不再出現完全空白。
- [ ] 點選不同分類籤能精準過濾卡片。
- [ ] 支援手動新增自訂事件並能即時顯示在清單中。
- [ ] 撰寫單元測試覆蓋分類切換與空狀態渲染。
