# 15 — 實戰下單連動──代碼一鍵複製與 OmniInspector / 圖表直通 (Click-to-Copy & Omni Linkage)

**What to build:**
消除波段交易員看盤到下單的繁複摩擦：
1. **一鍵複製代碼 (Click-to-Copy)**：
   - 所有標的代碼（Symbol）旁掛載微型複製圖示，點擊後調用 `navigator.clipboard.writeText(symbol)` 並彈出輕量綠色 Toast `已複製代碼`。
2. **快捷跳轉按鈕組**：
   - `[透視]`：點擊直接呼叫 `onOpenOmniInspector(symbol, market)`，無縫開啟 15 大指標與籌碼深入透視。
   - `[圖表]`：另開分頁跳轉至 TradingView 或 Yahoo 股市 K 線圖。
3. 撰寫單元測試覆蓋剪貼簿調用與跳轉回調觸發。

**Blocked by:** Ticket 14

**Status:** open

- [x] 實裝代碼一鍵點擊複製與 Toast 提示動畫
- [x] 卡片與表格增設 `[透視]` 按鈕觸發 `onOpenOmniInspector`
- [x] 增設 `[圖表]` 外部專業圖表跳轉連結
- [x] 編寫組件測試驗證點擊複製與回調被正確呼叫

