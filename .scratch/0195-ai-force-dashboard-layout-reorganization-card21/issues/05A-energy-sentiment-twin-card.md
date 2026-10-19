# 05A — EnergySentimentTwinCard 緊湊雙子容器實作與 Alpha 共振仲裁標籤

**Parent:** #290

**What to build:**
實作 `EnergySentimentTwinCard.tsx`：將 Card 10 (AI 多空能量棒，120px) 與 Card 13 (市場情緒，130px) 緊湊垂直封裝在同一個卡片容器，總高鎖定 **250px**。兩卡中段實作「Alpha 共振仲裁標籤」（如：個股強+大盤恐慌 ➔ `逆勢抗跌 (Alpha 領頭羊)`；個股弱+大盤貪婪 ➔ `拉指數出個股 (主力背離)`）。

**Blocked by:** 03

**Status:** completed

## Acceptance Criteria
- [x] 雙子容器整合 Card 10 與 Card 13，總高受控在 250px 左右。
- [x] 中段根據個股多空與市場情緒產出正確的 Alpha 共振標籤。
- [x] 支援台股與美股市場情緒連動。
- [x] 單元測試通過。
