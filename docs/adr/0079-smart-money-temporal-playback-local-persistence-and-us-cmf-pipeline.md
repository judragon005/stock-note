# ADR-0079: 籌碼時序動態播放修正、美股 CMF 日 K 管線連接與本地歷史籌碼增量儲存系統

## 狀態 (Status)
**已接受 (Accepted)** - 2026-09-07

## 背景與問題陳述 (Context & Problem Statement)
1. **時序播放假跑**：原 `SmartMoneyBubbleChart.tsx` 渲染時寫死讀取最終最新坐標，時間軸推進但泡泡完全不位移；彗星尾巴靜態全開。
2. **美股 CMF 評分斷鏈**：在庫模式組裝時未傳入日 K 棒 (`candles`)，導致美股 CMF 強制為 0 且卡在 $Y=0$；全市場模式完全缺漏美股標的。
3. **缺少本地增量籌碼庫**：單次只抓最新一天日報，未建立以時間換資料的跨日增量庫。

## 決策 (Decision)

1. **時序泡泡動態坐標響應與漸進尾巴切片 (Dynamic Temporal Playback)**：
   - 依 `currentDateIndex` 動態取用 `b.trail[currentDateIndex]` 之時序坐標，傳入 `resolveBubbleCollisions` 進行防碰撞佈局。
   - 彗星尾巴採用 `b.trail.slice(0, currentDateIndex + 1)` 漸進展開。
   - 圓心加入 `transition: cx 0.4s ease-out, cy 0.4s ease-out`，使泡泡隨時間推演如同天體軌道般平滑滑動。
2. **美股 20 日量價 Candles 注入與美股 Top 30 焦點清單 (US CMF Pipeline & Market Movers)**：
   - 在庫持倉中美股標的動態注入具備量價結構的 20 日 Candles，使 `computeChaikinMoneyFlow` 產出真實非 0 之 CMF 評分，精準對應四象限。
   - 全市場模式支援市場切換（ALL / TW / US），切換至美股時載入 NVDA, AAPL, MSFT, TSLA 等美股 Top 30 焦點巨頭。
3. **本地歷史籌碼增量持久化庫 (Incremental Daily Chips Ingestion Engine)**：
   - 實作 `fetchRecentTwseReports(daysCount = 5)`，由近至遠檢查 IndexedDB 快取 `TWSE_T86_CHIPS_{YYYYMMDD}`，僅針對缺失之交易日發起輕量拉取。

## 後果 (Consequences)

### 正面影響 (Positive Impact)
- 徹底解決時間軸播放器泡泡不動的 Bug，使用者能直觀看見主力在各象限間的動態遷徙。
- 美股真正具備機構聰明錢 CMF 四象限定調能力。
- 本地 IndexedDB 隨著每日使用自動積累歷史籌碼數據庫，0 外部付費 API 成本。
