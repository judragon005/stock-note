# 03 — Card 13 美股宏觀情緒激活 (CNN Fear & Greed / VIX / 10Y 美債)

**Parent:** #290

**What to build:**
美股模式下 Card 13 自動切換為「美股宏觀情緒 (CNN Fear & Greed / VIX)」，100% 讀取本地已有的 `macro_sentiment_daily` 資料庫（零新外部網路依賴）。半圓指針角度直接映射 `cnn_fear_greed_score`，數據行切換為 CNN 得分、VIX 恐慌指數、10Y 美債殖利率。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] 美股模式下標題切換為美股宏觀情緒。
- [x] 指針角度正確映射本地 CNN 恐懼貪婪分數 (0-100)。
- [x] 數值行呈現 CNN 分數、VIX 數值、10Y 美債殖利率。
- [x] 單元測試通過。
