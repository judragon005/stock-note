# Issue 03: 股市小白專屬動能與操盤術語 Tooltip 懸浮百科

## 狀態
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`tooltip`, `ux`, `beginner`

## 需求
1. 在三色實戰操盤導航儀中，為「風益比」、「箱頂防守」、「破底翻」、「布林極致壓縮」、「破線停損」等術語掛載 `<Tooltip>`。
2. 撰寫生活化、通俗生動的白話文解釋，消除股市小白的認知壁壘。

## 實作成果
- 於 `src/components/MuscleBookerWorkspace.tsx` 定義 `BEGINNER_TOOLTIPS` 常數字典，涵蓋風益比 (R:R)、箱頂防守、破底翻、布林極致壓縮、跌破箱底、MA20 扣抵望遠鏡及嚴格停損紀律。
- 在三色操作戰術儀（買進、觀望、賣出）、四大象限動能卡片與均線扣抵望遠鏡表頭中，完整套入 `<Tooltip>` 與 `underline dotted` 游標導引樣式。

