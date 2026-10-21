# 01B — Card 19 美股 13F 機構持股與 Short Float 放空籌碼卡實作

**Parent:** #290

**What to build:**
美股模式下 Card 19 徹底拔除灰色 Honest Empty State，自動切換為 `CARD 19 · 美股機構持股與放空籌碼 (13F & Short Float)`。對稱呈現三宮格指標：機構持股比 (%)、空單佔流通比 (Short Float %，>10% 警示)、內部人持股比 (%)，並以 SVG 堆疊長條圖呈現籌碼結構。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] 美股模式下不再呈現空白或灰色無效卡片。
- [x] 三宮格顯示機構持股比、空單佔流通比與內部人持股比。
- [x] 當 Short Float > 10% 時顯式標註「軋空警戒 (Squeeze Alert)」。
- [x] 美股機構籌碼堆疊圖正常繪製，單元測試通過。
