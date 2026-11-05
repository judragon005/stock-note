# Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格 (Smart Money Star Map Lakehouse Integration, Physics Calibration & Actionable Chip Matrix Spec)

## Problem Statement

當前「籌碼與動態星圖 (`ChipsWorkspace` & `SmartMoneyBubbleChart`)」建置於專案早期（純前端 CORS 爬蟲與 IndexedDB 時期），與專案現代化的本機 SQLite 數據湖倉 (`market_history.db`) 及跨模組戰情工作流脫節，經機構法人、籌碼實戰派、實戰投資者與金融軟體工程團隊三輪深度調研與實庫查證，暴露出五大核心問題：

1. **脫離本機 SQLite 湖倉與違反 Zero-Mock 原則（假價格、假漲跌與單邊殘缺日陷阱）**：
   - 本機 SQLite 已沉澱 250 日台股三大法人 (`tw_institutional_chips`) 與台美雙市場真實日 K (`daily_candles`)，但籌碼星圖仍繞過湖倉，於前端直接透過 CORS Proxy 抓取單日 T86 報表。
   - 在「全市場焦點 (`MARKET`)」模式下，只要台股標的不是使用者在庫持倉，系統因缺乏日 K 收盤價與漲跌幅，竟將股價寫死為 `100` 元，並使用 `idx % 4 === 1` 與 `totalNetShares % 35` **人工偽造當日漲跌幅與假背離**；歷史 5 日時序軌跡 (`buildHoldingHistoricalFlows`) 更以 `factor * todaysPnLPercent + (idx % 2 === 0 ? 0.3 : -0.2)` 捏造假價格移動軌跡；美股無快取時亦生成 `2026-08` 固定 20 根假 K 線。
   - 本機 SQLite 實庫中部分近期日期（如 `2026-11-02 ~ 11/04`）存在「僅有上櫃 TPEx 約 980 筆、上市 TWSE 為 0 筆」之單邊殘缺情況，若未加雙市場完整度門檻 (`HAVING COUNT(*) >= 1500`)，直接取最新日期會導致全數上市權值股（如 `2330`）籌碼消失。

2. **ETF 申贖造市套利單霸榜與個股 Y 軸「水平死魚線」壓扁效應**：
   - 台股 ETF（如 `0050`、`00679B`、`00878`、`00919`、`00940`、`00403A`）的外資與自營商（避險）單日數萬至二十萬張買賣超，本質為初級市場申購/贖回造市套利 (Creation/Redemption Arbitrage)，並非主動看多或看空個股。
   - 全市場 Top 30 與「法人搶買/提款榜」直接以絕對張數排序並混入 ETF，不僅排行榜被低價 ETF 霸榜，更導致 Y 軸正規化分母 `maxAbsShares` 高達 10~20 萬張，使一般中小型個股（買賣超數百至數千張）算出的 Y 座標趨近於 0，全場 90% 個股被壓扁在 `Y = 0` 水平中軸線上。
   - 缺乏反映機構實質鎖碼力度的「投量比（投信買賣超張數 / 總成交張數 %）」、「法人買賣超金額（億/千萬 TWD）」與「外資/投信連續買賣超天數 (`Streak`)」。

3. **時間窗 (`1D/3D/5D`) 切換失效 Bug、物理碰撞失真與時序 Stale Reference**：
   - **1D/3D/5D 切換失效**：頂部切換 `3日` 或 `5日` 時僅更新 `activeChipsMap`，但 X 軸仍傳入單日 `todaysPnLPercent`（時間尺度錯配），且 `SmartMoneyBubbleChart` 渲染時被 `trail[currentDateIndex]`（最後一日單日數據）無條件覆蓋，導致切換 3D/5D 按鈕時星圖泡泡座標與四象限統計完全不變。
   - **主座標與 `trail` 尺度跳躍**：主泡泡座標使用 `maxAbsShares` 與 `0.7` 次方冪次壓縮，但歷史 `trail` 卻除以寫死常數 `2500` 且採線性映射，導致買超逾 2,500 張之標的在歷史影格全數釘死在 `Y = ±75`。
   - **物理碰撞吃力與跨中軸穿透**：`resolveBubbleCollisions` 在正交微擾動時直接覆寫 `dx, dy` 導致虛擬 `dist` 暴增、吃掉排斥力推不開重疊球；且中軸鎖定僅 `midX ± 2`（未加泡泡半徑 `p.radius`），導致大球半邊球體跨過十字中軸侵入隔壁象限。
   - **泡泡面積失真與 Stale Reference**：持倉模式寫死 `volume: 100000`，且 `Math.max(holdingValueTwd, volume * currentPrice)` 導致高價零股變巨無霸泡泡；點擊泡泡存入 `selectedBubble` 物件快照，時序播放時浮窗停留在舊影格數據。

4. **持倉成本防線與交易初衷 (`intent`) 脫鉤**：
   - 轉換持倉為星圖資料時丟棄了 `avgCost`（成本均價）、`unrealizedPnLPercent`（未實現報酬率）、`portfolioWeightPercent`（部位權重 %）、`intent`（`DIVIDEND` 存股 vs `SWING` 波段）與 `isBagHolding`（波段凹單警報）。
   - 長期領息存股 (`DIVIDEND`) 因法人結帳落入左下區時被無差別警告「大機構提款快逃」，而真正危險的「短線波段 (`SWING`) 水下套牢 + 主力倒貨」卻缺乏高亮警示。

5. **跨工作區行動孤島、美股快報錯亂與色彩/RWD 破版**：
   - `App.tsx` 未將 `onOpenOmniInspector`、`onOpenAiForce`、`onOpenDeepDive`、`onQuickTrade` 傳入 `ChipsWorkspace`，點擊決策快報或泡泡無法執行任何下一步投研或下單動作。
   - 切換至 `US`（美股）模式時，上方決策快報依然死板顯示台股外資/投信排行；決策快報與 SVG 象限底色硬編碼紅綠，違反 `colorTheme`；窄螢幕手機端 `380px` 絕對定位 Tooltip 遮蓋 80% 星圖畫布；且星圖下方缺乏可搜尋、可排序的結構化籌碼明細表。

---

## Solution

遵循 **KISS 原則**、**Zero-Mock 鐵律** 與 **100% 複用專案既有資產**，實施五大核心升級：

1. **三級瀑布流真實資料管線與後端雙市場完整快照端點 (`vite-market-middleware.cjs` & `smartMoneyFetcher.ts`)**：
   - 於 `vite-market-middleware.cjs` 新增輕量端點 `GET /api/market/chips-snapshot?days=5`：
     - 透過 `SELECT date FROM tw_institutional_chips GROUP BY date HAVING COUNT(*) >= 1500 ORDER BY date DESC LIMIT 5` 嚴格篩選最近 5 個**上市+上櫃完整結算日**（自動閃避單邊殘缺髒資料）。
     - 關聯 `daily_candles` 與 `symbols_meta`，精確計算每檔標的在該 5 日的真實收盤價 `close`、真實單日與 3D/5D 區間漲跌幅 `changePercent`、真實成交張數 `volumeLots = Math.round(volume / 1000)`，以及美股焦點/持倉近 25 日真實日 K。
   - 前端建立三級瀑布流讀取（Tier 1 本機 SQLite `/api/market/chips-snapshot` ➔ Tier 2 靜態 `/market-cache/tw_market_summary.json` + `App.tsx` 真實報價 + IndexedDB ➔ Tier 3 線上 API），**徹底拔除 `idx % 4 === 1` 假漲跌、`estPrice = 100`、`factor` 假軌跡與 `2026-08` 假 K 線**。
   - 當使用者無任何在庫持倉 (`holdings.length === 0`) 時，預設自動切換至 `MARKET`（全市場法人焦點）視圖。

2. **ETF 造市套利隔離、投量比、連買天數與雙市場決策快報 (`chipsAggregator.ts` & `ChipsWorkspace.tsx`)**：
   - 複用既有 `isEtfSymbol(symbol, name)`：在 `MARKET` 模式與決策快報預設過濾 ETF（僅展示普通個股），並在控制列提供 `[含 ETF]` 切換開關。
   - 在 `PORTFOLIO` 模式保留使用者的 ETF 持倉泡泡，但計算 Y 軸分母 `maxAbsShares` 時以非 ETF 個股最大張數（或保護上限 `15,000` 張）為基準，釋放中小型個股在 Y 軸的垂直解析度。
   - 擴充 `chipsAggregator.ts` 計算真實**「投量比 (`trustToVolumeRatio`: 投信買賣超張數 / 總成交張數 %)」**、**「法人淨買賣金額 (`netFlowAmountTwd`)」**與**「外資/投信連續買賣超天數 (`foreignStreak` / `trustStreak`)」**。
   - 當市場切換至 `US` 時，決策快報自動切換為「美股機構吸籌榜 / 主力派發榜（依 CMF 與成交額動能排序）」，終結美股模式下顯示台股的錯亂。

3. **物理碰撞校準、統一冪次座標與「象限躍遷 (`Quadrant Crossover`)」偵測 (`smartMoneyEngine.ts` & `SmartMoneyBubbleChart.tsx`)**：
   - **統一座標映射與泡泡半徑語意**：抽取純函式 `mapToAxisCoordinate(value, maxAbs, power = 0.7)` 統一計算主泡泡與 `trail` 座標；持倉模式泡泡半徑 100% 依 `holdingValueTwd` 決定，全市場模式 100% 依折算台幣成交金額（或買賣超金額）決定。
   - **修复 1D/3D/5D 切換與時序回放**：當 `chipsHorizon` 為 `3` 或 `5` 時，星圖主座標與四象限統計呈現該 3D/5D 區間的「真實累計漲跌幅 × 累計籌碼」，不再被單日 `trail` 覆蓋。
   - **象限躍遷轉折捕捉 (`QuadrantCrossoverType`)**：比對時序軌跡 $T-1 \to T$ 象限變化，自動識別並標註 `🚀 潛伏點火首日 (ACCUMULATION ➔ BREAKOUT)` 與 `🚨 轉入派發/棄守首日 (上半部 ➔ 下半部)`。
   - **物理碰撞與 Stale Reference 修復**：`resolveBubbleCollisions` 先以原始 `dx, dy` 計算 `rawDist` 與 `overlap`，正交微擾動僅調整推斥方向向量；中軸鎖定升級為半徑感知 `midX ± (p.radius + 2)` 與 `midY ± (p.radius + 2)`；`selectedBubble` 改為儲存 `selectedSymbol: string | null` 動態查找當前影格物件，並穩定化自動播放計時器。

4. **持倉成本防線與交易初衷 (`intent`) 差異化籌碼體檢**：
   - 將 `HoldingPosition` 之 `avgCost`、`unrealizedPnLPercent`、`portfolioWeightPercent`、`intent` (`DIVIDEND` | `SWING` | `DAY_TRADE`) 與 `isBagHolding` 注入 `SmartMoneyInputItem` 與 `SmartMoneyBubbleData`。
   - 全市場模式下，使用者已持有的標的泡泡外圈繪製金色雙環與 `★ 持股` 標記。
   - Tooltip 與明細表展示持倉成本防線膠囊；針對 `DIVIDEND`（存股/ETF）落入提款區給予溫和逢低評估提示，針對 `SWING`（波段）水下套牢且法人賣超給予 `🚨 波段套牢+主力棄守（嚴防凹單）` 警示。

5. **互動式象限篩選、下方實戰籌碼作戰明細表、跨模組閉環與 RWD/色彩對齊**：
   - **頂部四象限統計卡互動過濾**：點擊任一象限卡片可篩選星圖與下方明細表（再點一次取消過濾）。
   - **點擊決策快報聚光燈定位**：點擊搶買榜/提款榜標的，自動選取並高亮星圖對應泡泡。
   - **實戰籌碼與部位作戰明細表**：於星圖下方提供可搜尋、可依「外資買賣超 / 投信買賣超 / 投量比 / 買賣超金額 / 未實現損益」排序的結構化明細表。
   - **跨模組行動閉環**：自 `App.tsx` 傳入 `onOpenOmniInspector`、`onOpenAiForce`、`onOpenDeepDive`、`onQuickTrade`，於固定 Tooltip 與明細表提供 `[🔍 技術透視]`、`[⚡ 主力戰情]`、`[📝 記一筆]` 按鈕。
   - **100% `colorTheme` 對齊與窄螢幕 RWD 停駐面板**：全面消除硬編碼紅綠顏色；當畫布寬度 `< 640px` 時，Tooltip 自動轉為畫布下方靜態停駐面板，杜絕遮擋星圖。

---

## User Stories

1. **As a 實戰量化投資者**, I want 籌碼星圖直接讀取本機 SQLite 湖倉的真實收盤價、真實漲跌幅與三大法人數據（且自動略過單邊殘缺髒資料日）, so that 我看到的每一顆泡泡座標與 5 日移動軌跡 100% 反映市場真實歷史，絕不被 `estPrice = 100` 或人工亂數背離誤導。
2. **As a 台股波段選股操盤手**, I want 全市場焦點與決策快報預設隔離 ETF 申贖造市套利單（並支援一鍵切換含 ETF）且對持倉 Y 軸分母施加保護上限, so that 排行榜不會被 0050/00679B/00940 的數萬張造市單霸榜，中小型飆股也能在星圖 Y 軸清晰展開。
3. **As a 籌碼動能實戰派**, I want 在決策快報、泡泡浮窗與明細表中看到真實「投量比 (投信買超佔成交量 %)」、「買賣超金額」與「外資/投信連買連賣天數 (Streak)」, so that 我能瞬間分辨主力實質鎖碼的高價/中小型股與一日行情的虛胖買盤。
4. **As a 短中期波段交易員**, I want 切換頂部「1日 / 3日 / 5日」按鈕時星圖同步呈現對應區間的累計漲跌幅與累計籌碼強度, so that 我能從單日雜訊切換至 3 日短波段與 5 日週籌碼視角觀察主力連續佈局。
5. **As a 轉折訊號捕捉者**, I want 時間軸與明細表自動標註「🚀 潛伏點火首日 (昨日左上逢低吸籌 ➔ 今日右上點火突破)」與「🚨 轉入派發首日」, so that 我不用靠肉眼記憶 30 顆泡泡的前後位置，一眼抓出主力洗盤結束剛點火的第一天。
6. **As a 視覺化圖表使用者**, I want 泡泡碰撞排斥演算法嚴格遵守半徑感知的象限中軸邊界且保留真實排斥距離, so that 即使大盤普漲 25 顆泡泡集中在右上象限，泡泡也絕不會跨過十字中軸侵入隔壁象限或重疊卡死。
7. **As a 在庫持倉管理者**, I want 在泡泡浮窗與明細表直接看到我的「部位權重 %、成本均價、未實現損益 %」並在全市場星圖中以金色雙環認出自家持股, so that 我能立刻判斷法人是在幫我抬轎還是對我的重倉股倒貨。
8. **As a 兼顧存股與波段的投資人**, I want 系統根據持股的交易初衷 (`DIVIDEND` 存股 vs `SWING` 波段) 給予差異化籌碼體檢, so that 長期領息存股回檔時不會跳出恐慌停損警報，而波段股水下套牢又遇法人棄守時能立即收到反凹單警示。
9. **As a 講求效率的操盤手**, I want 點擊頂部四象限統計卡直接過濾星圖泡泡，並能點擊決策快報直接聚焦星圖上的對應標的, so that 我能在 1 秒內鎖定「割韭菜警戒區」或「雙法人認養」的目標股票。
10. **As a 數據比對型投資人**, I want 在星圖下方擁有一張支援關鍵字搜尋與多欄位排序（外資、投信、投量比、淨額、損益）的「實戰籌碼與部位作戰明細表」, so that 我在看完 2D 全景分佈後能精確對比每一檔股票的籌碼細項數字。
11. **As a 跨模組投研使用者**, I want 在鎖定的泡泡浮窗與下方明細表中一鍵點擊「🔍 技術透視」、「⚡ 主力戰情」或「📝 記一筆」, so that 我發現籌碼異動標的時能 0 秒開啟 15 大技術指標/箱型防守價、跳轉主力戰情室或直接下單記帳。
12. **As a 跨市場與行動端使用者**, I want 美股模式下決策快報自動顯示美股機構 CMF 吸籌/派發排行、全頁嚴格跟隨 `colorTheme`（台股紅漲綠跌 / 國際綠漲紅跌），且在窄螢幕下浮窗自動轉為底部停駐卡片, so that 我在美股模式與手機上都能獲得無破版、無色彩錯亂的專業體驗。

---

## Implementation Decisions

### 1. 後端本機湖倉批次籌碼快照端點 (`vite-market-middleware.cjs`)

- 新增路由 `GET /api/market/chips-snapshot`（支援查詢參數 `days=5`, `limit=40`, `symbols=2330,2317,...`）：
  - **雙市場完整日期篩選**：
    ```sql
    SELECT date FROM tw_institutional_chips
    GROUP BY date HAVING COUNT(*) >= 1500
    ORDER BY date DESC LIMIT ?
    ```
  - **台股價量與籌碼聚合**：關聯 `tw_institutional_chips`、`daily_candles` 與 `symbols_meta`，針對最近 $N$ 個完整交易日，回傳每檔標的之 `symbol, name, date, close, prevClose, changePercent, volumeLots (ROUND(volume / 1000)), foreignNetShares, trustNetShares, dealerNetShares, totalNetShares, marginBalance, shortBalance`。
  - **美股焦點與持倉日 K 批次提取**：從 `daily_candles` 批次撈取美股指定代號與焦點清單最近 25 根日 K，供前端秒算 20D CMF 與近 5 日歷史軌跡。

### 2. 籌碼聚合器與連買天數 / 投量比 / ETF 隔離 (`chipsAggregator.ts` & `smartMoneyFetcher.ts`)

- 於 `smartMoneyFetcher.ts` 新增高階載入器 `fetchSmartMoneyLakehouseSnapshot(options)`，實作三級瀑布流（SQLite API ➔ 靜態 `tw_market_summary.json` + IndexedDB ➔ 既有線上 Fetcher），並保持既有 `fetchTwseInstitutionalReportDetailed` 等函數簽章 100% 向下相容以確保既有 `mockFetch` 測試無損。
- 於 `chipsAggregator.ts` 擴充：
  ```ts
  export interface EnrichedChipMetrics {
    symbol: string;
    name: string;
    foreignNetShares: number;
    trustNetShares: number;
    dealerNetShares: number;
    totalNetShares: number;
    foreignStreak: number;       // 正數為連買天數，負數為連賣天數
    trustStreak: number;         // 正數為連買天數，負數為連賣天數
    trustToVolumeRatio?: number; // 投信買賣超張數 / 總成交張數 (%)
    instToVolumeRatio?: number;  // 三大法人合計張數 / 總成交張數 (%)
    netFlowAmountTwd?: number;   // 法人買賣超折算台幣金額
    isEtf?: boolean;
  }
  ```
- `getTopMomentumSymbols` 支援 `excludeEtf?: boolean`（預設 `true`）與美股清單支援，消除 ETF 造市單霸榜與美股模式下快報顯示台股的問題。

### 3. 聰明錢引擎校準：統一冪次映射、半徑感知防穿透與象限躍遷 (`smartMoneyEngine.ts`)

- **統一座標映射純函式**：
  ```ts
  export function mapToAxisCoordinate(value: number, maxAbs: number, power = 0.7): number
  ```
  同時用於當日主座標 `(x, y)` 與歷史軌跡 `trail` 節點座標，消除除以寫死 `2500` 與線性/非線性混用造成的時序跳躍。
- **Y 軸分母 ETF 隔離保護**：在計算台股群體 `maxAbsShares` 時，僅取非 ETF 普通股之最大值（若全為 ETF 則套用合理上限 `15,000` 張），防止單一 ETF 巨量壓扁全場個股 Y 軸。
- **泡泡面積權重語意分離**：
  - 當 `item.isHolding && item.holdingValueTwd > 0`（持倉模式）時，權重純粹採用 `holdingValueTwd`；
  - 當為全市場模式時，權重統一採用折算台幣成交額（或買賣超絕對金額），美股自動乘以 `usdToTwdRate`。
- **象限躍遷偵測 (`QuadrantCrossoverType`)**：
  ```ts
  export type QuadrantCrossoverType =
    | 'IGNITION_FIRST_DAY'     // 左上 ACCUMULATION ➔ 右上 BREAKOUT (潛伏點火首日)
    | 'PULLBACK_ACCUMULATION'  // 右上 BREAKOUT ➔ 左上 ACCUMULATION (回檔法人續買)
    | 'DISTRIBUTION_FIRST_DAY' // 上半部 (Y>=0) ➔ 右下 DISTRIBUTION (轉入派發首日)
    | 'ABANDON_FIRST_DAY'      // 上半部 (Y>=0) ➔ 左下 LIQUIDATION (轉入棄守首日)
    | 'STEADY';
  ```
  於 `calculateSmartMoneyFlowDynamics` 與 `getTemporalBubbleFrameData` 自動計算並輸出 `crossoverType` 與 `crossoverLabel`。
- **物理碰撞 (`resolveBubbleCollisions`) 硬化**：
  - 以原始未擾動之 `rawDx, rawDy` 計算真實圓心距 `rawDist` 與 `overlap = (minDist - rawDist) / 2`，正交微擾動僅用於決定排斥單位向量 `(nx, ny)`。
  - 象限中軸鎖定改為半徑感知：`isRight ? Math.max(midX + p.radius + 2, p.cx) : Math.min(midX - p.radius - 2, p.cx)`（Y 軸同理），確保球體邊緣絕不穿透十字中軸線。
- **意圖感知持倉診斷 (`getBeginnerDiagnosis`)**：當傳入 `intent === 'DIVIDEND'` 且落入 `LIQUIDATION / ACCUMULATION` 時，輸出存股殖利率逢低評估文案；當 `intent === 'SWING'` 且未實現虧損 `< -5%` 落入賣超區時，輸出波段反凹單警示。

### 4. 星圖視圖、互動式篩選、作戰明細表與跨模組閉環 (`ChipsWorkspace.tsx`, `SmartMoneyBubbleChart.tsx`, `App.tsx`)

- **拔除全數假數據公式**：移除 `ChipsWorkspace.tsx` 中 `isDivergent = idx % 4 === 1`、`estPrice = 100`、`factor` 奇偶日微擾動與 `2026-08` 假 K 線；在無歷史資料時維持真實基準值以相容單元測試。
- **Stale Reference 修復**：`SmartMoneyBubbleChart` 將 `selectedBubble` state 改為 `selectedSymbol: string | null`（並支援外部受控聚焦 `focusedSymbol`），每次從當前影格 `placedBubbles` 動態解析最新泡泡資料。
- **色彩與 RWD 修復**：所有象限底色、快報標題、Tooltip 漲跌字色 100% 透過 `colorTheme` 計算；窄螢幕將 Tooltip 渲染為畫布下方靜態停駐卡片。
- **互動式象限卡 + 下方實戰籌碼作戰明細表 + 跨模組按鈕**：
  - 頂部 4 張象限統計卡支援點擊切換 `quadrantFilter: SmartMoneyQuadrant | 'ALL'`；
  - 點擊決策快報列自動觸發星圖 `focusedSymbol` 聚光燈鎖定；
  - 星圖下方新增結構化「實戰籌碼與部位作戰明細表」（支援代號/名稱搜尋、象限過濾、欄位排序與一鍵開啟 `onOpenOmniInspector` / `onOpenAiForce` / `onQuickTrade`）。

---

## Testing Decisions

1. **測試原則（僅測試公開介面縫隙 Test Seams）**：
   - 保持既有 5 個測試檔案（`smartMoneyEngine.test.ts`、`smartMoneyFetcher.test.ts`、`chipsAggregator.test.ts`、`SmartMoneyBubbleChart.test.ts`、`ChipsWorkspace.test.ts`）的所有既有公開函數簽章與斷言 100% 向下相容通過。
2. **新增與擴充測試覆蓋**：
   - **`viteMarketMiddleware.test.ts`**：驗證 `GET /api/market/chips-snapshot` 正確過濾單邊殘缺日期（`COUNT(*) >= 1500`）、正確將 `daily_candles.volume` 除以 1000 轉為張數並計算真實漲跌幅。
   - **`smartMoneyEngine.test.ts`**：
     - 驗證 `mapToAxisCoordinate` 主座標與 `trail` 座標映射一致性；
     - 驗證 `resolveBubbleCollisions` 半徑感知中軸鎖定（球體邊緣 `cx - radius >= midX` 不跨中軸）與重疊球正交排斥；
     - 驗證 `QuadrantCrossoverType`（`IGNITION_FIRST_DAY`、`DISTRIBUTION_FIRST_DAY` 等）轉折偵測；
     - 驗證 ETF 巨量買賣超下普通股 Y 軸分母保護不被壓扁，以及 `intent`（`DIVIDEND` vs `SWING`）差異化診斷文案。
   - **`chipsAggregator.test.ts`**：驗證 `foreignStreak` / `trustStreak` 連買連賣天數計算、`trustToVolumeRatio` 投量比計算，以及 `getTopMomentumSymbols` 預設隔離 ETF 與美股模式排行。
   - **`ChipsWorkspace.test.ts` & `SmartMoneyBubbleChart.test.ts`**：驗證拔除假漲跌幅後真實行情映射、空持倉自動切換 `MARKET` 模式、象限過濾與跨模組 Action Callbacks 觸發。

---

## Out of Scope

1. **不接入 `tw_tdcc_distribution`（集保大戶）至籌碼星圖**：經實庫查證，`ingest-tw-tdcc.cjs` 目前為三角函數合成數據，為堅守 Zero-Mock 原則，不在星圖中接入。
2. **不強依賴 `sbl_balance` 與 `day_trade_rate` 歷史欄位**：因本機回補腳本在近期日期該兩欄多為 `NULL`，避免產生無效死代碼。
3. **不新增獨立的 K 線繪圖彈窗**：技術面 K 線、箱型防守價與 20D VWAP 100% 透過打通既有 `OmniTechnicalInspectorModal` 與 `AiForceDashboardView` 完成，絕不重複造輪子。

---

## Further Notes

- 本規格對應 `CONTEXT.md` 新增之 `Smart Money Star Map Lakehouse Integration, Physics Calibration & Actionable Chip Matrix (Spec 0217)` 領域條目，並將於實作閉環時同步建立 `docs/adr/0217-smart-money-star-map-lakehouse-and-physics-calibration.md`，正式取代早期 `ADR-0079 / ADR-0120` 中關於前端係數模擬軌跡與無差別混排 ETF 之舊規。

