# 01 — Header 自封閉即時走動台北交易時鐘與市價更新時間解耦

**What to build:** 
在頂部導覽列右側盤中狀態膠囊中，封裝自封閉的 `<RealtimeMarketClock />` 元件，主視覺呈現每秒動態跳動的台北時間（`• 台股盤中 14:43:08`），並將最後市價更新時間解耦為獨立狀態標籤（`市價更新 12:50:21`），點擊可手動刷新。自封閉定時器每秒的 tick 僅限時鐘節點重繪，絕不向上外溢導致圖表重新渲染。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 封裝 `<RealtimeMarketClock />` 獨立子元件，每 1000ms 更新當前台北時間（`HH:mm:ss`）。
- [x] 重構 `src/components/Header.tsx` 狀態膠囊，左側展示即時時鐘，右側清楚標示市價更新時間與刷新指示。
- [x] 於 `src/components/Header.test.ts` 新增即時時鐘容器渲染與解耦狀態之單元測試。

