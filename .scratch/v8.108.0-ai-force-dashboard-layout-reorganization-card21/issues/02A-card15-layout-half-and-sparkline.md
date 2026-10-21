# 02A — Card 15 佈局 1/2:1/2 寬幅重構、0 軸水平分水嶺與連續動態標籤 (台股基底)

**Parent:** #290

**What to build:**
重構 Card 15 (籌碼異動摘要) 容器排版，由 `1fr auto` 調整為等寬 `1fr 1fr` (各 50%)。左側三大法人數值區採用 monospace、`minWidth: 0` 確保窄視窗下對齊不折行；右側 Sparkline 走勢圖 100% 自適應展開，新增 0 軸水平虛線分水嶺（上方買超量增，下方賣超量縮）與頂部連續性動態標籤（例如「投信連 3 買」）。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] 卡片排版左右各佔 50% 寬度 (`grid-template-columns: 1fr 1fr` 或 `flex: 1`)。
- [x] 左側法人張數使用 monospace 等寬對齊，窄螢幕無截斷折行。
- [x] 右側走勢圖具備 0 軸水平分水嶺線與連買/連賣動態結論標籤。
- [x] 單元測試通過。
