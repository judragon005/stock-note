# 需求規格說明書 (PRD #0079)：籌碼時序動態播放修正、美股 CMF 日 K 管線連接與本地歷史籌碼增量儲存系統

## Problem Statement (問題陳述)

使用者在使用「🪐 籌碼與動態星圖」進行跨市場與時序觀察時，發現以下四項嚴重的實作斷鏈與體驗問題：

1. **時序播放器「假跑」Bug (Playback Static Freeze Bug)**：
   - 點擊底部播放鍵時，雖然時間軸進度與日期索引 `currentDateIndex` 正在遞增推進，但上方 SVG 畫布中的所有泡泡實體坐標均被硬性寫死在最後一天的靜態座標上，**泡泡完全沒有任何位移**。
   - 彗星尾巴 (Motion Trails) 一次性畫完整個歷史軌跡，缺乏隨時間前進而動態延伸的生命力。
2. **美股聰明錢計算斷鏈 (US CMF Zero Flow Bug)**：
   - 在【我的在庫持倉】模式下，`ChipsWorkspace.tsx` 組裝標的資料時**完全未傳入美股的歷史日 K 棒 (`candles`)**，導致引擎計算出的美股 Chaikin Money Flow (`cmfValue`) 一律為 0，美股在 Y 軸上全部死死卡在 $Y=0$ 的中線上，失去機構籌碼監控功能。
   - 在【全市場法人焦點】模式下，資料源僅包含台股證交所資料，完全缺少美股市場標的，無法觀察華爾街熱門焦點股的資金流向。
3. **缺少本地歷史籌碼持久化機制 (Lack of Local Incremental Chips Storage)**：
   - 目前台股籌碼資料僅抓取單一交易日日報，未建立「以時間換資料」的本地增量歷史庫。每次重整若遇到非交易日或快取失效，無法回放過去多天的真實法定買賣超歷史。

---

## Solution (解決方案)

1. **時序坐標動態響應與漸進式彗星尾巴 (Dynamic Temporal Coordinates & Progressive Trails)**：
   - 泡泡的實體渲染位置 $(cx, cy)$ 必須隨 `currentDateIndex` 動態響應：讀取 `b.trail[currentDateIndex]` 的時序坐標（並經由自適應縮放與防碰撞佈局）；若該標的在該時間點無軌跡，則平滑回退至最新坐標。
   - 加入流暢 CSS transition（`transform` 與坐標平滑過渡 0.5s），讓泡泡如天體運轉般在四象限中流暢滑動。
   - 彗星尾巴改採進度切片：`b.trail.slice(0, currentDateIndex + 1)`，隨著時間推移，尾巴從無到有、從短變長，實質展現資金位移軌跡。
2. **美股 CMF 日 K 線管線打通與美股市場焦點支援 (US CMF Pipeline & Market Movers)**：
   - 在【在庫持倉】模式下，當標的為美股時，自動透過 `fetchStockDailyHistory` 或既有歷史快取載入最近 30 日之日 K 棒資料（包含 high, low, open, close, volume），正確餵入 `computeChaikinMoneyFlow`，產出真實的機構吸籌與出貨評分（$Y \in [-75, +75]$）。
   - 在【全市場焦點】模式下，依市場過濾器（【全部】、【台股】、【美股】）分流：當切換至美股時，提供美股最具代表性的 Top 30 機構核心資產（如 NVDA, AAPL, MSFT, TSLA, AMZN, GOOGL, META, AMD, AVGO, QQQ, SPY 等），依據真實/估算 CMF 動態呈現四象限。
3. **本地歷史籌碼增量持久化庫 (Local Daily Chips Ingestion Engine)**：
   - 建立本地 IndexedDB 歷史儲存格式：`TWSE_DAILY_CHIPS_{YYYYMMDD}`。
   - 每次載入時，自動比對本地已存日報與當前最近 5 個交易日，對缺失的交易日發起輕量補齊請求（每次僅需拉取 1 個 TWSE 官方免費日報）。
   - 以時間換資料：隨著每日系統開啟，本地自動累積多個交易日的真實買賣超，供時序播放器調用真實位移點。

---

## User Stories (使用者故事)

1. 身為投資人，當我點擊「▶ 播放」時序按鈕時，我希望看見畫布上的各檔股票泡泡真正跟隨日期推移而移動，並拖曳著漸進延伸的彗星尾巴，以便直觀感受聰明錢在各象限間的轉移。
2. 身為美股投資人，我希望在庫持倉中的美股標的（如 NVDA, AAPL）能擁有基於真實日 K 線計算的 CMF 資金流向分數，而不是停留在 $Y=0$ 的無效死線上，以便洞察華爾街機構是吸籌還是出貨。
3. 身為跨市場觀察者，我希望在全市場焦點模式下切換到「美股」時，能看到美股代表性巨頭與指數 ETF 的資金流向四象限分佈，以便了解當前美股整體市場多空情緒。
4. 身為偏好離線隱私的使用者，我希望每天抓到的官方籌碼日報能永久儲存在本機 IndexedDB 中，每次只抓最新資料，隨時間累積屬於我自己的真實歷史籌碼庫。

---

## Implementation Decisions (實作決策)

1. **時序坐標計算決策**：
   - 在 `SmartMoneyBubbleChart.tsx` 中，對每個泡泡讀取當前影格：
     ```typescript
     const currentTrailPoint = b.trail && b.trail.length > currentDateIndex
       ? b.trail[currentDateIndex]
       : { x: b.x, y: b.y };
     ```
   - 依據 `currentTrailPoint` 計算當前畫布像素位置，並支援圓形防碰撞與平滑過渡動畫。
2. **彗星尾巴切片決策**：
   - 渲染 Polyline 時，僅使用 `b.trail.slice(0, currentDateIndex + 1)`，當 `currentDateIndex === 0` 時不渲染尾巴，隨著進度推進逐點延伸。
3. **美股 CMF 日 K 注入決策**：
   - 在 `ChipsWorkspace.tsx` 中，加入美股日 K 棒快取狀態 `usDailyCandlesMap`。
   - 針對持倉中美股標的，透過 `fetchStockDailyHistory(symbol)` 異步獲取最近 30 天 K 線，更新至 `smartMoneyItems`。
4. **全市場美股焦點列表 (US Focus Universe)**：
   - 內建 30 檔美股高流動性代表股清單（涵蓋半導體、大型科技、標普權值與代表性 ETF），當選擇美股市場時展示。
5. **本地增量籌碼快取管理決策**：
   - 在 `smartMoneyFetcher.ts` 中新增 `fetchAndCacheRecentTwseReports(days = 5)`，由近到遠補足 IndexedDB 中缺失的歷史日報。

---

## Testing Decisions (測試決策)

1. **時序坐標動態對齊測試縫隙**：
   - 驗證給定 `currentDateIndex = 0` 與 `currentDateIndex = 2` 時，泡泡呈現之像素坐標能正確對應到 `trail[0]` 與 `trail[2]`，且坐標產生實質位移（$\Delta x \ne 0$ 或 $\Delta y \ne 0$）。
   - 驗證彗星尾巴在 `currentDateIndex = 1` 時僅輸出 2 個頂點，而非全量頂點。
2. **美股 CMF 計算測試縫隙**：
   - 驗證傳入具備高低收成交量之 20 日美股日 K 棒時，`flowScore` 與 `y` 坐標不為 0，且能正確分類至相應象限。
3. **本地快取增量補齊測試縫隙**：
   - 驗證已存在本地快取之交易日不發起網路請求，僅針對缺失之交易日進行拉取與存檔。

---

## Out of Scope (範圍界定)

1. **付費美股即時 Level 2 / 訂單流 (Order Book) 數據**：維持 100% 免費一手資料源（日 K 棒推算 CMF），不引進需付費之美股即時大單 API。
2. **手動編輯歷史籌碼數據**：所有籌碼數據均由官方日報與歷史日 K 自動生成與快取，不開放手動篡改法人買賣超數值。
