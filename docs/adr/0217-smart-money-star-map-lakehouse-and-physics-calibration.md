# ADR 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級架構決策 (Spec 0217)

- **狀態 (Status)**: 已採納 (Accepted)
- **關聯規格**: [Spec 0217](../specs/0217-smart-money-star-map-lakehouse-and-physics-calibration-spec.md)
- **日期 (Date)**: 2026-11-05
- **取代/修訂舊規**: 修訂 `ADR-0077`、`ADR-0079`、`ADR-0119`、`ADR-0120` 中關於前端獨立爬蟲、係數模擬軌跡與 ETF 混排之早期假設

---

## 背景與問題陳述 (Context & Problem Statement)

「籌碼與動態星圖 (`ChipsWorkspace` & `SmartMoneyBubbleChart`)」建置於專案早期（V7.7 ~ V8.8），當時尚未建置本機 SQLite 數據湖倉 (`market_history.db`)。經過機構法人、籌碼實戰派、實戰投資者與金融軟體工程團隊三輪深度調研與實庫查證，識別出以下核心架構與量化問題：

1. **脫離本機 SQLite 湖倉與假資料污染（違反 Zero-Mock 鐵律）**：
   - 放棄本機 SQLite 已沉澱的 250 日台股三大法人 (`tw_institutional_chips`) 與台美雙市場真實日 K (`daily_candles`)，於前端對非持倉台股寫死 `estPrice = 100`、以 `idx % 4 === 1` 捏造假漲跌幅與人工背離，並以 `factor + 0.3 / -0.2` 捏造 5 日歷史軌跡。
   - 本機 SQLite 實庫中部分近期日期（如 `2026-11-02 ~ 11/04`）存在「僅有上櫃 TPEx ~980 筆、缺上市 TWSE」之單邊殘缺情況，直接取最新日會導致上市權值股籌碼消失。
2. **ETF 申贖造市套利單霸榜與個股 Y 軸「水平死魚線」壓扁效應**：
   - 台股 ETF（`00*`）的外資與自營商萬張買賣超本質為初級市場申贖造市套利，混入個股排行不僅霸榜，更將 Y 軸正規化分母 `maxAbsShares` 拉高至 10~20 萬張，使一般中小型個股被壓扁在 `Y = 0` 中軸線上。
   - 實庫查證顯示 `daily_candles.volume` 單位為「股」，而 `tw_institutional_chips` 為「張」，計算投量比時若未除以 1,000 會產生 1,000 倍誤差。
3. **1D/3D/5D 切換失效、物理碰撞穿透與時序 Stale Reference**：
   - 頂部切換 3D/5D 僅更新 `activeChipsMap`，但渲染時被 `trail[currentDateIndex]` 單日資料覆蓋且 X 軸仍傳入單日漲跌幅；
   - `resolveBubbleCollisions` 正交微擾動直接覆寫 `dx, dy` 吃掉排斥力，且中軸鎖定僅 `midX ± 2`（未加半徑 `p.radius`）導致大球跨過中軸線；
   - 點擊泡泡存入 `selectedBubble` 物件快照，時序播放時浮窗停留在舊影格數據。
4. **持倉成本防線與交易初衷 (`intent`) 脫鉤及跨模組行動斷層**：
   - 未結合 `avgCost`、`unrealizedPnLPercent` 與 `intent` (`DIVIDEND` 存股 vs `SWING` 波段)，且未串接 `App.tsx` 之 `onOpenOmniInspector`、`onOpenAiForce`、`onOpenDeepDive` 與 `onQuickTrade`。

---

## 架構決策 (Decision)

### 1. 本機 SQLite 雙市場完整快照端點與三級瀑布流讀取
- 於 `vite-market-middleware.cjs` 新增 `GET /api/market/chips-snapshot?days=5`：
  - 使用 `GROUP BY date HAVING COUNT(*) >= 1500 ORDER BY date DESC LIMIT 5` 嚴格選取上市+上櫃皆完整之交易日。
  - 關聯 `daily_candles` 與 `symbols_meta`，將台股 `volume` 除以 `1000` 轉為真實成交張數 (`volumeLots`)，並以真實收盤價計算單日與區間累計漲跌幅。
- 前端優先讀取本機 SQLite 快照，次選靜態 `tw_market_summary.json` + IndexedDB，最後降級線上 API，100% 移除所有假價格、假漲跌與假 K 線公式。

### 2. ETF 造市套利隔離、投量比與連買天數 (`chipsAggregator.ts`)
- 全市場焦點與決策快報預設過濾 ETF（`!isEtfSymbol`），並提供 `[含 ETF]` 切換膠囊；持倉模式對 Y 軸分母 `maxAbsShares` 施加非 ETF 保護上限（`15,000` 張）。
- 計算外資/投信連續買賣超天數 (`foreignStreak` / `trustStreak`)、真實投量比 (`trustNetShares / volumeLots * 100`) 與買賣超金額 (`netFlowAmountTwd`)；美股模式下決策快報自動切換為美股機構 CMF 吸籌/派發榜。

### 3. 統一冪次映射、半徑感知碰撞防穿透與「象限躍遷 (`Quadrant Crossover`)」(`smartMoneyEngine.ts`)
- 導出純函式 `mapToAxisCoordinate(value, maxAbs, power = 0.7)` 統一主座標與 `trail` 映射。
- `resolveBubbleCollisions` 以原始 `rawDx, rawDy` 計算真實排斥重疊量 `overlap`，並將象限中軸鎖定升級為 `midX ± (p.radius + 2)` 與 `midY ± (p.radius + 2)`。
- 新增 `QuadrantCrossoverType` 自動捕捉 $T-1 \to T$ 之「🚀 潛伏點火首日 (`ACCUMULATION ➔ BREAKOUT`)」與「🚨 轉入派發/棄守首日」。

### 4. 意圖感知持倉體檢、互動式象限篩選、籌碼作戰明細表與跨模組閉環
- 注入持倉 `avgCost`、`unrealizedPnLPercent`、`portfolioWeightPercent` 與 `intent` (`DIVIDEND` vs `SWING`)，提供差異化診斷與全市場持股金色雙環標記。
- 頂部四象限統計卡支援點擊過濾；星圖下方增設可搜尋、可排序之「實戰籌碼與部位作戰明細表」；打通 `App.tsx` 四大跨模組 Action Callbacks，並修復全頁 `colorTheme` 與窄螢幕 RWD 停駐浮窗。

